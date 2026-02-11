const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Validation Schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  department: z.string().min(1, "Department is required"),
  phone: z.string().optional()
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Verify Token (Me)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, role, name FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.sendStatus(404);
    res.json(user);
  } catch (err) {
    console.error('Get current user failed:', err);
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
});

// POST /api/auth/register - End-user registration
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, department, phone } = registerSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, role, name, department, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, name",
      [username, hash, 'END_USER', name, department, phone]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Register failed:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

module.exports = router;
