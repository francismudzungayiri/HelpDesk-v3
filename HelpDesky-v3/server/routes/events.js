const express = require('express');
const jwt = require('jsonwebtoken');
const { subscribe, unsubscribe, writeEvent } = require('../realtime');

const router = express.Router();

const resolveToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (typeof req.query.token === 'string') {
    return req.query.token.trim();
  }

  return '';
};

router.get('/', (req, res) => {
  const token = resolveToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing auth token for event stream' });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ message: 'Invalid auth token for event stream' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = subscribe({ res, user });
  writeEvent(res, 'connected', { ok: true });

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (err) {
      clearInterval(heartbeat);
      unsubscribe(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe(clientId);
  });
});

module.exports = router;
