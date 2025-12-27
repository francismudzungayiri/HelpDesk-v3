const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../init_db'); // Use the exported db instance
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (match) {
        // Create Token
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    });
  });
});

// Verify Token (Me)
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
