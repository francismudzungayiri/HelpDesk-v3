const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const categoryCreateSchema = z.object({
  name: z.string().min(2, 'Category name is required').max(100),
  description: z.string().max(400).optional(),
  sort_order: z.number().int().min(0).optional()
});

const subcategoryCreateSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  name: z.string().min(2, 'Subcategory name is required').max(120),
  description: z.string().max(400).optional(),
  sort_order: z.number().int().min(0).optional()
});

const fieldCreateSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  subcategory_id: z.coerce.number().int().positive().optional(),
  field_key: z.string().min(2).max(120).regex(/^[a-z0-9_]+$/, 'field_key must be lowercase snake_case'),
  label: z.string().min(2).max(120),
  field_type: z.enum(['text', 'number', 'select', 'date', 'checkbox']),
  required: z.boolean().optional(),
  placeholder: z.string().max(255).optional(),
  options: z.array(z.string().min(1)).optional(),
  sort_order: z.number().int().min(0).optional()
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, sort_order
      FROM ticket_categories
      WHERE is_active = true
      ORDER BY sort_order, name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Load categories failed:', err);
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

router.get('/categories/:id/subcategories', authenticateToken, async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }

    const result = await pool.query(
      `
      SELECT id, category_id, name, description, sort_order
      FROM ticket_subcategories
      WHERE category_id = $1 AND is_active = true
      ORDER BY sort_order, name
    `,
      [categoryId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Load subcategories failed:', err);
    res.status(500).json({ message: 'Failed to load subcategories' });
  }
});

router.get('/fields', authenticateToken, async (req, res) => {
  try {
    const categoryId = Number(req.query.category_id);
    const subcategoryQuery = req.query.subcategory_id;
    const hasSubcategoryFilter = subcategoryQuery !== undefined && subcategoryQuery !== null && String(subcategoryQuery).trim() !== '';
    const subcategoryId = hasSubcategoryFilter ? Number(subcategoryQuery) : null;

    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: 'category_id is required and must be a number' });
    }

    if (hasSubcategoryFilter && Number.isNaN(subcategoryId)) {
      return res.status(400).json({ message: 'subcategory_id must be a number when provided' });
    }

    const sql = hasSubcategoryFilter
      ? `
      SELECT
        id,
        category_id,
        subcategory_id,
        (SELECT name FROM ticket_subcategories s WHERE s.id = ticket_custom_field_definitions.subcategory_id) AS subcategory_name,
        field_key,
        label,
        field_type,
        required,
        placeholder,
        options_json,
        sort_order
      FROM ticket_custom_field_definitions
      WHERE category_id = $1
        AND is_active = true
        AND (subcategory_id IS NULL OR subcategory_id = $2)
      ORDER BY sort_order, id
    `
      : `
      SELECT
        id,
        category_id,
        subcategory_id,
        (SELECT name FROM ticket_subcategories s WHERE s.id = ticket_custom_field_definitions.subcategory_id) AS subcategory_name,
        field_key,
        label,
        field_type,
        required,
        placeholder,
        options_json,
        sort_order
      FROM ticket_custom_field_definitions
      WHERE category_id = $1
        AND is_active = true
      ORDER BY sort_order, id
    `;

    const params = hasSubcategoryFilter ? [categoryId, subcategoryId] : [categoryId];
    const result = await pool.query(sql, params);

    const fields = result.rows.map((row) => ({
      ...row,
      options: Array.isArray(row.options_json) ? row.options_json : []
    }));

    res.json(fields);
  } catch (err) {
    console.error('Load custom fields failed:', err);
    res.status(500).json({ message: 'Failed to load custom fields' });
  }
});

router.post('/categories', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { name, description, sort_order } = categoryCreateSchema.parse(req.body);
    const result = await pool.query(
      `
      INSERT INTO ticket_categories (name, description, sort_order)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, sort_order
    `,
      [name.trim(), description || null, sort_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    console.error('Create category failed:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

router.post('/subcategories', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { category_id, name, description, sort_order } = subcategoryCreateSchema.parse(req.body);

    const categoryCheck = await pool.query(
      'SELECT id FROM ticket_categories WHERE id = $1 AND is_active = true',
      [category_id]
    );
    if (categoryCheck.rowCount === 0) {
      return res.status(400).json({ message: 'Category not found or inactive' });
    }

    const result = await pool.query(
      `
      INSERT INTO ticket_subcategories (category_id, name, description, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id, category_id, name, description, sort_order
    `,
      [category_id, name.trim(), description || null, sort_order ?? 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Subcategory already exists for this category' });
    }
    console.error('Create subcategory failed:', err);
    res.status(500).json({ message: 'Failed to create subcategory' });
  }
});

router.post('/fields', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const payload = fieldCreateSchema.parse(req.body);

    if (payload.field_type === 'select' && (!payload.options || payload.options.length === 0)) {
      return res.status(400).json({ message: 'Select fields require at least one option' });
    }

    const subcategoryFilter = payload.subcategory_id ?? null;
    const relationshipCheck = await pool.query(
      `
      SELECT c.id AS category_id, s.id AS subcategory_id
      FROM ticket_categories c
      LEFT JOIN ticket_subcategories s ON s.id = $2 AND s.category_id = c.id
      WHERE c.id = $1 AND c.is_active = true
    `,
      [payload.category_id, subcategoryFilter]
    );

    if (relationshipCheck.rowCount === 0) {
      return res.status(400).json({ message: 'Category not found or inactive' });
    }

    if (subcategoryFilter !== null && !relationshipCheck.rows[0].subcategory_id) {
      return res.status(400).json({ message: 'Subcategory does not belong to selected category' });
    }

    const result = await pool.query(
      `
      INSERT INTO ticket_custom_field_definitions (
        category_id,
        subcategory_id,
        field_key,
        label,
        field_type,
        required,
        placeholder,
        options_json,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      RETURNING id, category_id, subcategory_id, field_key, label, field_type, required, placeholder, options_json, sort_order
    `,
      [
        payload.category_id,
        subcategoryFilter,
        payload.field_key,
        payload.label,
        payload.field_type,
        payload.required ?? false,
        payload.placeholder || null,
        JSON.stringify(payload.options || []),
        payload.sort_order ?? 0
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      options: result.rows[0].options_json || []
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Field key already exists for this category/subcategory scope' });
    }
    console.error('Create custom field failed:', err);
    res.status(500).json({ message: 'Failed to create custom field' });
  }
});

module.exports = router;
