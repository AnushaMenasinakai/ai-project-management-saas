const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).json({ message: 'Authorization token is required.' });
  }

  const authorizationParts = authorizationHeader.trim().split(/\s+/);

  if (
    authorizationParts.length !== 2 ||
    authorizationParts[0] !== 'Bearer' ||
    !authorizationParts[1]
  ) {
    return res.status(401).json({ message: 'Invalid authorization header.' });
  }

  const [_, token] = authorizationParts;

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({ message: 'Unable to authenticate request.' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedToken.sub) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

    req.user = { id: decodedToken.sub };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication token has expired.' });
    }

    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

module.exports = authenticateToken;
