const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const getZodMessages = (err) => (err.issues || err.errors || []).map((e) => e.message);

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

const workStatusSchema = z.object({
  work_status: z.enum(['AVAILABLE', 'ON_LEAVE', 'AT_WORKSHOP'])
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
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          phone: user.phone,
          work_status: user.work_status
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Verify Token (Me)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, name, department, phone, work_status FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.sendStatus(404);
    res.json(user);
  } catch (err) {
    console.error('Get current user failed:', err);
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
});

router.patch('/me/work-status', authenticateToken, async (req, res) => {
  try {
    const { work_status } = workStatusSchema.parse(req.body);
    const result = await pool.query(
      'UPDATE users SET work_status = $1 WHERE id = $2 RETURNING id, work_status',
      [work_status, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: getZodMessages(err) });
    }
    console.error('Update work status failed:', err);
    res.status(500).json({ message: 'Failed to update work status' });
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
      "INSERT INTO users (username, password, role, name, department, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, name, department, phone, work_status",
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
      return res.status(400).json({ errors: getZodMessages(err) });
    }
    console.error('Register failed:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

module.exports = router;
