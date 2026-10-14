const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { publish } = require('../realtime');

const router = express.Router();
const getZodMessages = (err) => (err.issues || err.errors || []).map((e) => e.message);

const customFieldInputSchema = z.object({
  field_definition_id: z.coerce.number().int().positive(),
  value: z.any().optional().nullable()
});

const ticketBaseCreateSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Keep the description under 5,000 characters'),
  category_id: z.coerce.number().int().positive(),
  subcategory_id: z.coerce.number().int().positive(),
  custom_fields: z.array(customFieldInputSchema).optional().default([])
});

const staffTicketCreateSchema = ticketBaseCreateSchema.extend({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  caller_name: z.string().trim().min(1, 'Caller name is required').max(120, 'Keep the caller name under 120 characters'),
  department: z.string().trim().min(1, 'Department is required').max(120, 'Keep the department under 120 characters'),
  phone: z.string().trim().max(40, 'Keep the phone number under 40 characters').optional()
});

const endUserTicketCreateSchema = ticketBaseCreateSchema.extend({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  phone: z.string().trim().max(40, 'Keep the phone number under 40 characters').optional()
});

const ticketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  assignee_id: z.number().nullable().optional(),
  resolution_note: z.string().max(5000, 'Keep the resolution under 5,000 characters').optional()
});

const noteSchema = z.object({
  note: z.string().trim().min(1, 'Note content is required').max(5000, 'Keep notes under 5,000 characters')
});

const commentSchema = z.object({
  comment: z.string().trim().min(1, 'Comment content is required').max(5000, 'Keep messages under 5,000 characters')
});

const badRequest = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

const canAccessTicket = (user, ticket) => {
  if (user.role !== 'END_USER') return true;

  const ticketOwnerId = Number(ticket.created_by);
  const requesterId = Number(user.id);

  if (!Number.isInteger(ticketOwnerId) || !Number.isInteger(requesterId)) {
    return false;
  }

  return ticketOwnerId === requesterId;
};

const getTicketAccessRow = async (ticketId) => {
  const result = await pool.query('SELECT id, created_by FROM tickets WHERE id = $1', [ticketId]);
  return result.rows[0] || null;
};

const validateCategoryAndSubcategory = async (client, categoryId, subcategoryId) => {
  const result = await client.query(
    `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      s.id AS subcategory_id,
      s.name AS subcategory_name
    FROM ticket_categories c
    JOIN ticket_subcategories s ON s.id = $2 AND s.category_id = c.id
    WHERE c.id = $1
      AND c.is_active = true
      AND s.is_active = true
  `,
    [categoryId, subcategoryId]
  );

  if (result.rowCount === 0) {
    throw badRequest('Invalid category/subcategory selection');
  }

  return result.rows[0];
};

const getFieldDefinitionsForScope = async (client, categoryId, subcategoryId) => {
  const result = await client.query(
    `
    SELECT
      id,
      field_key,
      label,
      field_type,
      required,
      options_json,
      sort_order
    FROM ticket_custom_field_definitions
    WHERE category_id = $1
      AND is_active = true
      AND (subcategory_id IS NULL OR subcategory_id = $2)
    ORDER BY sort_order, id
  `,
    [categoryId, subcategoryId]
  );

  return result.rows;
};

const normalizeCustomFields = (definitions, submittedFields) => {
  const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]));
  const submittedMap = new Map();

  for (const item of submittedFields) {
    if (submittedMap.has(item.field_definition_id)) {
      throw badRequest('Duplicate custom field submission detected');
    }
    submittedMap.set(item.field_definition_id, item.value);
  }

  for (const fieldId of submittedMap.keys()) {
    if (!definitionMap.has(fieldId)) {
      throw badRequest('One or more custom fields are not valid for this category/subcategory');
    }
  }

  const normalized = [];

  for (const definition of definitions) {
    const rawValue = submittedMap.get(definition.id);
    const isMissing = rawValue === undefined || rawValue === null || (typeof rawValue === 'string' && rawValue.trim() === '');

    if (isMissing) {
      if (definition.required) {
        throw badRequest(`${definition.label} is required`);
      }
      continue;
    }

    let valueText = null;
    let valueJson = null;

    if (definition.field_type === 'text') {
      valueText = String(rawValue).trim();
      if (!valueText) {
        if (definition.required) {
          throw badRequest(`${definition.label} is required`);
        }
        continue;
      }
      valueJson = valueText;
    } else if (definition.field_type === 'number') {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(parsed)) {
        throw badRequest(`${definition.label} must be a valid number`);
      }
      valueText = String(parsed);
      valueJson = parsed;
    } else if (definition.field_type === 'date') {
      const parsedDate = new Date(String(rawValue));
      if (Number.isNaN(parsedDate.getTime())) {
        throw badRequest(`${definition.label} must be a valid date`);
      }
      const dateValue = parsedDate.toISOString().split('T')[0];
      valueText = dateValue;
      valueJson = dateValue;
    } else if (definition.field_type === 'checkbox') {
      if (typeof rawValue !== 'boolean') {
        throw badRequest(`${definition.label} must be true or false`);
      }
      valueText = String(rawValue);
      valueJson = rawValue;
    } else if (definition.field_type === 'select') {
      const value = String(rawValue).trim();
      const options = Array.isArray(definition.options_json) ? definition.options_json : [];
      if (!options.includes(value)) {
        throw badRequest(`${definition.label} must match one of the allowed options`);
      }
      valueText = value;
      valueJson = value;
    } else {
      throw badRequest(`Unsupported field type: ${definition.field_type}`);
    }

    normalized.push({
      field_definition_id: definition.id,
      value_text: valueText,
      value_json: valueJson
    });
  }

  return normalized;
};

// Views and sorts the list understands. Values are fixed SQL fragments, never user input.
const LIST_VIEWS = {
  active: "t.status IN ('OPEN', 'IN_PROGRESS')",
  unassigned: "t.status IN ('OPEN', 'IN_PROGRESS') AND t.assignee_id IS NULL",
  resolved: "t.status = 'RESOLVED'",
  all: 'TRUE'
};

const LIST_SORTS = {
  updated: 'COALESCE(t.updated_at, t.created_at) DESC, t.id DESC',
  newest: 't.created_at DESC, t.id DESC',
  oldest: 't.created_at ASC, t.id ASC',
  priority: "CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, t.created_at ASC, t.id ASC",
  // Kept for older callers
  date_asc: 't.created_at ASC, t.id ASC'
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 7;

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

// GET /api/tickets - List tickets.
// With ?page=N the response is one page: { tickets, total, page, page_size, total_pages, counts }.
// Without ?page it returns the full array, as it always has.
router.get('/', authenticateToken, async (req, res) => {
  const { status, assignee_id, scope } = req.query;
  const view = req.query.view || 'all';
  const sort = req.query.sort || 'newest';
  const search = String(req.query.q || '').trim();
  const paged = req.query.page !== undefined;

  if (!LIST_VIEWS[view]) {
    return res.status(400).json({ message: 'Invalid view' });
  }
  if (!LIST_SORTS[sort]) {
    return res.status(400).json({ message: 'Invalid sort' });
  }

  const conditions = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (req.user.role === 'END_USER') {
    conditions.push(`t.created_by = ${addParam(req.user.id)}`);
  }

  if (status) {
    conditions.push(`t.status = ${addParam(status)}`);
  }

  if (assignee_id) {
    conditions.push(`t.assignee_id = ${addParam(assignee_id)}`);
  }

  if (scope !== undefined) {
    const normalizedScope = String(scope).trim().toLowerCase();
    if (normalizedScope !== 'my') {
      return res.status(400).json({ message: 'Invalid scope filter' });
    }

    const me = addParam(req.user.id);
    conditions.push(`(
      t.created_by = ${me}
      OR t.assignee_id = ${me}
      OR EXISTS (
        SELECT 1
        FROM ticket_history h
        WHERE h.ticket_id = t.id
          AND h.user_id = ${me}
          AND h.action = 'STATUS_CHANGE'
          AND h.new_value = 'RESOLVED'
      )
    )`);
  }

  if (search) {
    const idText = addParam(search.replace(/^#/, ''));
    const like = addParam(`%${escapeLike(search)}%`);
    conditions.push(`(
      CAST(t.id AS TEXT) = ${idText}
      OR t.description ILIKE ${like}
      OR t.caller_name ILIKE ${like}
      OR t.department ILIKE ${like}
      OR u.name ILIKE ${like}
      OR c.name ILIKE ${like}
      OR s.name ILIKE ${like}
    )`);
  }

  const from = `
    FROM tickets t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN ticket_categories c ON t.category_id = c.id
    LEFT JOIN ticket_subcategories s ON t.subcategory_id = s.id
  `;
  const baseWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const listWhere = `WHERE ${[...conditions, LIST_VIEWS[view]].join(' AND ')}`;
  const select = `
    SELECT
      t.*,
      u.name as assignee_name,
      u.username as assignee_username,
      c.name as category_name,
      s.name as subcategory_name
  `;

  try {
    if (!paged) {
      const result = await pool.query(`${select} ${from} ${listWhere} ORDER BY ${LIST_SORTS[sort]}`, params);
      return res.json(result.rows);
    }

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.page_size, 10) || DEFAULT_PAGE_SIZE));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    // Counts for every view in one pass, under the same scope and search.
    const countsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ${LIST_VIEWS.active}) AS active,
        COUNT(*) FILTER (WHERE ${LIST_VIEWS.unassigned}) AS unassigned,
        COUNT(*) FILTER (WHERE ${LIST_VIEWS.resolved}) AS resolved,
        COUNT(*) AS all
      ${from}
      ${baseWhere}
    `, params);
    const row = countsResult.rows[0];
    const counts = {
      active: Number(row.active),
      unassigned: Number(row.unassigned),
      resolved: Number(row.resolved),
      all: Number(row.all)
    };

    const total = counts[view];
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (Math.min(page, totalPages) - 1) * pageSize;

    const listParams = [...params, pageSize, offset];
    const result = await pool.query(
      `${select} ${from} ${listWhere} ORDER BY ${LIST_SORTS[sort]} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );

    res.json({
      tickets: result.rows,
      total,
      page: Math.min(page, totalPages),
      page_size: pageSize,
      total_pages: totalPages,
      counts
    });
  } catch (err) {
    console.error('List tickets failed:', err);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id - Get single ticket details
router.get('/:id', authenticateToken, async (req, res) => {
  const sql = `
    SELECT
      t.*,
      u.name as assignee_name,
      u.username as assignee_username,
      c.name as category_name,
      s.name as subcategory_name
    FROM tickets t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN ticket_categories c ON t.category_id = c.id
    LEFT JOIN ticket_subcategories s ON t.subcategory_id = s.id
    WHERE t.id = $1
  `;

  try {
    const result = await pool.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (ticket.category_id && ticket.subcategory_id) {
      const customFieldRows = await pool.query(
        `
        SELECT
          d.id AS field_definition_id,
          d.field_key,
          d.label,
          d.field_type,
          d.required,
          d.options_json,
          v.value_text,
          v.value_json
        FROM ticket_custom_field_definitions d
        LEFT JOIN ticket_custom_field_values v
          ON v.field_definition_id = d.id
         AND v.ticket_id = $1
        WHERE d.category_id = $2
          AND d.is_active = true
          AND (d.subcategory_id IS NULL OR d.subcategory_id = $3)
        ORDER BY d.sort_order, d.id
      `,
        [ticket.id, ticket.category_id, ticket.subcategory_id]
      );

      ticket.custom_fields = customFieldRows.rows.map((row) => ({
        field_definition_id: row.field_definition_id,
        field_key: row.field_key,
        label: row.label,
        field_type: row.field_type,
        required: row.required,
        options: Array.isArray(row.options_json) ? row.options_json : [],
        value: row.value_json !== null ? row.value_json : row.value_text
      }));
    } else {
      ticket.custom_fields = [];
    }

    res.json(ticket);
  } catch (err) {
    console.error('Get ticket failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', authenticateToken, async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    let payload;

    if (req.user.role === 'END_USER') {
      payload = endUserTicketCreateSchema.parse(req.body);

      const userResult = await client.query('SELECT name, department, phone FROM users WHERE id = $1', [req.user.id]);
      const userProfile = userResult.rows[0];

      if (!userProfile) {
        throw badRequest('User profile not found');
      }

      if (!userProfile.department) {
        throw badRequest('Your profile is missing a department. Contact support.');
      }

      payload = {
        ...payload,
        caller_name: userProfile.name,
        department: userProfile.department,
        phone: userProfile.phone || payload.phone
      };
    } else {
      payload = staffTicketCreateSchema.parse(req.body);
    }

    await validateCategoryAndSubcategory(client, payload.category_id, payload.subcategory_id);

    const definitions = await getFieldDefinitionsForScope(client, payload.category_id, payload.subcategory_id);
    const normalizedCustomFields = normalizeCustomFields(definitions, payload.custom_fields || []);

    const ticketResult = await client.query(
      `
      INSERT INTO tickets (
        caller_name,
        department,
        phone,
        description,
        priority,
        status,
        created_by,
        category_id,
        subcategory_id
      )
      VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7, $8)
      RETURNING id
    `,
      [
        payload.caller_name,
        payload.department,
        payload.phone,
        payload.description,
        payload.priority,
        req.user.id,
        payload.category_id,
        payload.subcategory_id
      ]
    );

    const ticketId = ticketResult.rows[0].id;

    for (const fieldValue of normalizedCustomFields) {
      await client.query(
        `
        INSERT INTO ticket_custom_field_values (
          ticket_id,
          field_definition_id,
          value_text,
          value_json
        )
        VALUES ($1, $2, $3, $4::jsonb)
      `,
        [
          ticketId,
          fieldValue.field_definition_id,
          fieldValue.value_text,
          fieldValue.value_json === null ? null : JSON.stringify(fieldValue.value_json)
        ]
      );
    }

    await client.query('COMMIT');

    publish('ticket.created', {
      ticket_id: ticketId,
      actor_id: req.user.id
    });

    res.status(201).json({
      id: ticketId,
      message: 'Ticket created',
      status: 'OPEN'
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }

    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }

    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error('Create ticket failed:', err);
    res.status(500).json({ message: 'Failed to create ticket' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// PATCH /api/tickets/:id - Update ticket (staff only)
router.patch('/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'END_USER') {
    return res.status(403).json({ message: 'Only staff can update tickets' });
  }

  try {
    const { status, assignee_id, resolution_note } = ticketUpdateSchema.parse(req.body);
    const ticketId = req.params.id;

    const currentRes = await pool.query('SELECT status, assignee_id FROM tickets WHERE id = $1', [ticketId]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const currentTicket = currentRes.rows[0];
    const fields = [];
    const params = [];
    let paramCount = 1;
    const historyLogs = [];

    if (status && status !== currentTicket.status) {
      fields.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;

      if (status === 'RESOLVED') {
        fields.push('closed_at = CURRENT_TIMESTAMP');
      } else if (currentTicket.status === 'RESOLVED') {
        fields.push('closed_at = NULL');
      }

      historyLogs.push({ action: 'STATUS_CHANGE', old_value: currentTicket.status, new_value: status });
    }

    if (assignee_id !== undefined && assignee_id !== currentTicket.assignee_id) {
      if (assignee_id !== null) {
        const assigneeRes = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND role IN ('ADMIN', 'AGENT') AND work_status = 'AVAILABLE'",
          [assignee_id]
        );
        if (assigneeRes.rowCount === 0) {
          return res.status(400).json({ message: 'Assignee must be an available staff user' });
        }
      }

      fields.push(`assignee_id = $${paramCount}`);
      params.push(assignee_id);
      paramCount++;

      historyLogs.push({
        action: 'ASSIGNEE_CHANGE',
        old_value: currentTicket.assignee_id,
        new_value: assignee_id
      });
    }

    if (resolution_note !== undefined) {
      fields.push(`resolution_note = $${paramCount}`);
      params.push(resolution_note);
      paramCount++;
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    params.push(ticketId);
    const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql, params);

      for (const log of historyLogs) {
        await client.query(
          'INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
          [ticketId, req.user.id, log.action, String(log.old_value), String(log.new_value)]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    publish('ticket.updated', {
      ticket_id: Number(ticketId),
      actor_id: req.user.id
    });

    res.json({ message: 'Ticket updated' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }

    console.error('Update ticket failed:', err);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

// GET /api/tickets/:id/history - Get history for a ticket
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `
      SELECT
        h.*,
        u.name as user_name,
        CASE
          WHEN h.action = 'ASSIGNEE_CHANGE' AND h.old_value IS NOT NULL AND h.old_value != 'null' AND h.old_value ~ '^[0-9]+$'
          THEN (SELECT name FROM users WHERE id = CAST(h.old_value AS INTEGER))
          ELSE h.old_value
        END as old_name,
        CASE
          WHEN h.action = 'ASSIGNEE_CHANGE' AND h.new_value IS NOT NULL AND h.new_value != 'null' AND h.new_value ~ '^[0-9]+$'
          THEN (SELECT name FROM users WHERE id = CAST(h.new_value AS INTEGER))
          ELSE h.new_value
        END as new_name
      FROM ticket_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.ticket_id = $1
      ORDER BY h.created_at DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get ticket history failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket history' });
  }
});

// GET /api/tickets/:id/notes - Get notes for a ticket
router.get('/:id/notes', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `
      SELECT n.*, u.name as user_name, u.username as user_username
      FROM ticket_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.ticket_id = $1
      ORDER BY n.created_at DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get ticket notes failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket notes' });
  }
});

// GET /api/tickets/:id/comments - Get shared comments for a ticket
router.get('/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `
      SELECT
        c.*,
        u.name AS user_name,
        u.username AS user_username,
        u.role AS user_role
      FROM ticket_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = $1
      ORDER BY c.created_at DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get ticket comments failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket comments' });
  }
});

// POST /api/tickets/:id/comments - Add a shared ticket comment (all roles)
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = commentSchema.parse(req.body);

    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_comments (ticket_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, comment]
    );

    const commentWithUser = {
      ...result.rows[0],
      user_name: req.user.name || req.user.username,
      user_username: req.user.username,
      user_role: req.user.role
    };

    publish('ticket.comment_added', {
      ticket_id: Number(id),
      comment_id: result.rows[0].id,
      actor_id: req.user.id
    });

    res.status(201).json(commentWithUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }

    console.error('Add ticket comment failed:', err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// POST /api/tickets/:id/notes - Add an internal note (staff only)
router.post('/:id/notes', authenticateToken, async (req, res) => {
  if (req.user.role === 'END_USER') {
    return res.status(403).json({ message: 'End users cannot add internal notes' });
  }

  try {
    const { id } = req.params;
    const { note } = noteSchema.parse(req.body);

    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_notes (ticket_id, user_id, note) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, note]
    );

    const noteWithUser = {
      ...result.rows[0],
      user_name: req.user.name || req.user.username,
      user_username: req.user.username
    };

    publish('ticket.note_added', {
      ticket_id: Number(id),
      note_id: result.rows[0].id,
      actor_id: req.user.id
    });

    res.status(201).json(noteWithUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }

    console.error('Add ticket note failed:', err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

module.exports = router;
