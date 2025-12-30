const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token
 * @param {string} id - User ID
 * @returns {string} JWT Token
 */
const generateToken = (id) => {
  if (!id) {
    throw new Error('User ID is required to generate token');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { id }, // Payload
    process.env.JWT_SECRET, // Secret key
    {
      expiresIn: process.env.JWT_EXPIRE || '7d', // Token expiration
      issuer: 'event-platform', // Optional: Token issuer
      audience: 'event-platform-users' // Optional: Token audience
    }
  );
};

/**
 * Verify JWT Token
 * @param {string} token - JWT Token
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Decode JWT Token without verification (use carefully)
 * @param {string} token - JWT Token
 * @returns {object} Decoded token payload
 */
const decodeToken = (token) => {
  if (!token) {
    throw new Error('Token is required');
  }

  return jwt.decode(token);
};

/**
 * Generate Refresh Token (Optional - for future enhancement)
 * @param {string} id - User ID
 * @returns {string} Refresh Token
 */
const generateRefreshToken = (id) => {
  if (!id) {
    throw new Error('User ID is required to generate refresh token');
  }

  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '30d' // Refresh tokens last longer
    }
  );
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken
};