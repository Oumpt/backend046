const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Helper: สร้าง hash จาก token
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST: เข้าสู่ระบบ (Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // ตรวจสอบว่าส่ง username และ password มาไหม
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    const user = rows[0];

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        fullname: user.fullname,
        firstname: user.firstname,
        lastname: user.lastname
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    // ส่งข้อมูล user กลับด้วย (ไม่รวม password)
    res.json({ 
      success: true,
      message: 'Login successful', 
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        fullname: user.fullname,
        lastname: user.lastname,
        username: user.username,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

// POST: ออกจากระบบ (Logout)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const token = authHeader.substring(7); // ลบ "Bearer "
    
    // ถอดรหัส token เพื่อดูข้อมูล
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    // คำนวณวันหมดอายุ
    const expiresAt = new Date(decoded.exp * 1000);

    // บันทึกลงฐานข้อมูล (เก็บ hash เพื่อความปลอดภัย)
    const tokenHash = hashToken(token);
    
    await db.query(
      'INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, decoded.id, expiresAt]
    );

    // ลบ token เก่าที่หมดอายุแล้ว
    await db.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');

    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
});

module.exports = router;