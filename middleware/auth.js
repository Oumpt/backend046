const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');

const SECRET_KEY = process.env.JWT_SECRET || 'fallback-secret-key';

// Helper: สร้าง hash จาก token
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    // 1. ตรวจสอบว่า token นี้ถูก revoke แล้วหรือยัง
    const tokenHash = hashToken(token);
    const [revoked] = await db.query(
      'SELECT id FROM revoked_tokens WHERE token_hash = ?',
      [tokenHash]
    );

    if (revoked.length > 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Token has been revoked. Please login again.' 
      });
    }

    // 2. ตรวจสอบ JWT token
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ 
            success: false,
            error: 'Token expired' 
          });
        }
        return res.status(403).json({ 
          success: false,
          error: 'Invalid token' 
        });
      }

      // 3. ตรวจสอบว่าผู้ใช้ยังมีอยู่ในระบบไหม
      const [users] = await db.query(
        'SELECT id, status FROM tbl_users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.status(403).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      if (users[0].status !== 'active') {
        return res.status(403).json({ 
          success: false,
          error: 'Account is inactive' 
        });
      }

      // 4. บันทึกข้อมูล user ใน request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
}

module.exports = verifyToken;