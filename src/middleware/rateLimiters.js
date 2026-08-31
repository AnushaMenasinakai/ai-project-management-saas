const rateLimit = require('express-rate-limit');

const createJsonLimiter = ({ max, message }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ message }),
  });

const authLimiter = createJsonLimiter({
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

const aiLimiter = createJsonLimiter({
  max: 30,
  message: 'Too many AI requests. Please try again later.',
});

module.exports = {
  authLimiter,
  aiLimiter,
};
