const pool = require('./db');

const seedTicketMeta = async (client) => {
  const categories = [
    { name: 'Hardware', description: 'Physical devices and peripherals', sort: 1 },
    { name: 'Software', description: 'Applications and software tools', sort: 2 },
    { name: 'Network', description: 'Connectivity and network services', sort: 3 },
    { name: 'Access', description: 'Account and permission requests', sort: 4 }
  ];

  const categoryIds = {};

  for (const category of categories) {
    const categoryResult = await client.query(
      `
      INSERT INTO ticket_categories (name, description, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (name)
      DO UPDATE SET
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = true
      RETURNING id
    `,
      [category.name, category.description, category.sort]
    );

    categoryIds[category.name] = categoryResult.rows[0].id;
  }

  const subcategories = [
    { category: 'Hardware', name: 'Laptop', sort: 1 },
    { category: 'Hardware', name: 'Desktop', sort: 2 },
    { category: 'Hardware', name: 'Printer', sort: 3 },
    { category: 'Software', name: 'Email', sort: 1 },
    { category: 'Software', name: 'VPN', sort: 2 },
    { category: 'Software', name: 'Business App', sort: 3 },
    { category: 'Network', name: 'Wi-Fi', sort: 1 },
    { category: 'Network', name: 'LAN', sort: 2 },
    { category: 'Network', name: 'Internet', sort: 3 },
    { category: 'Access', name: 'Password Reset', sort: 1 },
    { category: 'Access', name: 'Shared Drive', sort: 2 },
    { category: 'Access', name: 'Account Provisioning', sort: 3 }
  ];

  const subcategoryIds = {};

  for (const subcategory of subcategories) {
    const subcategoryResult = await client.query(
      `
      INSERT INTO ticket_subcategories (category_id, name, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (category_id, name)
      DO UPDATE SET
        sort_order = EXCLUDED.sort_order,
        is_active = true
      RETURNING id
    `,
      [categoryIds[subcategory.category], subcategory.name, subcategory.sort]
    );

    subcategoryIds[`${subcategory.category}:${subcategory.name}`] = subcategoryResult.rows[0].id;
  }

  const fields = [
    {
      category: 'Hardware',
      subcategory: null,
      field_key: 'asset_tag',
      label: 'Asset Tag',
      field_type: 'text',
      required: false,
      placeholder: 'e.g. LT-1042',
      options: [],
      sort: 1
    },
    {
      category: 'Hardware',
      subcategory: null,
      field_key: 'device_location',
      label: 'Device Location',
      field_type: 'text',
      required: false,
      placeholder: 'e.g. HQ 3rd Floor',
      options: [],
      sort: 2
    },
    {
      category: 'Hardware',
      subcategory: 'Laptop',
      field_key: 'operating_system',
      label: 'Operating System',
      field_type: 'select',
      required: true,
      placeholder: null,
      options: ['Windows', 'macOS', 'Linux'],
      sort: 1
    },
    {
      category: 'Software',
      subcategory: null,
      field_key: 'application_name',
      label: 'Application Name',
      field_type: 'text',
      required: true,
      placeholder: 'e.g. Outlook',
      options: [],
      sort: 1
    },
    {
      category: 'Software',
      subcategory: 'VPN',
      field_key: 'error_code',
      label: 'Error Code',
      field_type: 'text',
      required: false,
      placeholder: 'e.g. 691',
      options: [],
      sort: 1
    },
    {
      category: 'Access',
      subcategory: 'Shared Drive',
      field_key: 'drive_name',
      label: 'Drive Name',
      field_type: 'text',
      required: true,
      placeholder: 'e.g. Finance Shared',
      options: [],
      sort: 1
    },
    {
      category: 'Access',
      subcategory: 'Shared Drive',
      field_key: 'access_level',
      label: 'Access Level',
      field_type: 'select',
      required: true,
      placeholder: null,
      options: ['Read', 'Write', 'Admin'],
      sort: 2
    }
  ];

  for (const field of fields) {
    const categoryId = categoryIds[field.category];
    const subcategoryId = field.subcategory ? subcategoryIds[`${field.category}:${field.subcategory}`] : null;

    await client.query(
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
        sort_order,
        is_active
      )
      SELECT
        $1::integer,
        $2::integer,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::boolean,
        $7::varchar,
        $8::jsonb,
        $9::integer,
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM ticket_custom_field_definitions
        WHERE category_id = $1
          AND field_key = $3::varchar
          AND (
            (subcategory_id IS NULL AND $2::integer IS NULL)
            OR subcategory_id = $2::integer
          )
      )
    `,
      [
        categoryId,
        subcategoryId,
        field.field_key,
        field.label,
        field.field_type,
        field.required,
        field.placeholder,
        JSON.stringify(field.options),
        field.sort
      ]
    );
  }
};

async function migrate() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database.');

    try {
      await client.query('BEGIN');

      console.log('Applying user and ticket compatibility updates...');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS department VARCHAR(255),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(255)
      `);

      await client.query(`
        ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_role_check
      `);
      await client.query(`
        ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'AGENT', 'END_USER'))
      `);

      await client.query(`
        ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)
      `);

      console.log('Creating ticket metadata tables...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_subcategories (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
          name VARCHAR(120) NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category_id, name)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_custom_field_definitions (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
          subcategory_id INTEGER REFERENCES ticket_subcategories(id) ON DELETE CASCADE,
          field_key VARCHAR(120) NOT NULL,
          label VARCHAR(120) NOT NULL,
          field_type VARCHAR(30) NOT NULL CHECK(field_type IN ('text', 'number', 'select', 'date', 'checkbox')),
          required BOOLEAN NOT NULL DEFAULT false,
          placeholder VARCHAR(255),
          options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_custom_field_values (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          field_definition_id INTEGER NOT NULL REFERENCES ticket_custom_field_definitions(id) ON DELETE CASCADE,
          value_text TEXT,
          value_json JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ticket_id, field_definition_id)
        )
      `);

      console.log('Adding new ticket columns and indexes...');
      await client.query(`
        ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES ticket_categories(id),
        ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES ticket_subcategories(id)
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_subcategory_id ON tickets(subcategory_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ticket_custom_values_ticket_id ON ticket_custom_field_values(ticket_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ticket_custom_values_field_id ON ticket_custom_field_values(field_definition_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ticket_custom_def_category_id ON ticket_custom_field_definitions(category_id)');
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_custom_def_scope_key
        ON ticket_custom_field_definitions (category_id, COALESCE(subcategory_id, 0), field_key)
      `);

      console.log('Seeding default categories, subcategories, and custom fields...');
      await seedTicketMeta(client);

      await client.query('COMMIT');
      console.log('Migration completed successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await pool.end();
  }
}

migrate();
