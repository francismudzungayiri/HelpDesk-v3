const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });

  // An expired or invalid token is an authentication failure (401), not a permission one (403),
  // so the client can send the person back to sign in.
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Your session has ended. Sign in again.' });
    req.user = user;
    next();
  });
};

const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.sendStatus(403);
    }
  };
};

const authorizeAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (roles.includes(req.user.role)) return next();
    return res.sendStatus(403);
  };
};

module.exports = { authenticateToken, authorizeRole, authorizeAnyRole };
