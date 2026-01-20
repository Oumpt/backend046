const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ฟังก์ชันสำหรับ Hash Token (ใช้ตอน Logout)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * @openapi
 * /api/auth/register:
 * post:
 * tags: [Authentication]
 * summary: Register a new user (Default role: staff)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [username, password, firstname, lastname]
 * properties:
 * username: { type: string }
 * password: { type: string }
 * firstname: { type: string }
 * lastname: { type: string }
 * fullname: { type: string }
 */
router.post('/register', async (req, res) => {
  const { username, password, firstname, lastname, fullname } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    // 1. เช็คว่าชื่อผู้ใช้ซ้ำไหม
    const [existingUser] = await db.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    // 2. Hash รหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. บันทึกลงฐานข้อมูล ✅ เพิ่มช่อง role กำหนดเป็น 'staff' โดยอัตโนมัติ
    const [result] = await db.query(
      'INSERT INTO tbl_users (username, password, firstname, lastname, fullname, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, firstname, lastname, fullname || `${firstname} ${lastname}`, 'staff', 'active']
    );

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully as staff',
      userId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 * post:
 * tags: [Authentication]
 * summary: Login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    // ดึงข้อมูล User รวมถึงฟิลด์ role และ status
    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const user = rows[0];

    // ตรวจสอบสถานะการใช้งาน
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your account is disabled' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // ✅ สร้าง JWT พร้อมใส่ Role เข้าไปใน Payload (ใช้ในการเช็คสิทธิ์หลังบ้าน)
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role // 👈 เพิ่มค่า role จาก DB ลงใน Token
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '1h' }
    );

    // ✅ ส่งข้อมูล Role กลับไปให้ Frontend ในก้อน user (ใช้ในการแสดงเมนูหน้าบ้าน)
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
        status: user.status,
        role: user.role // 👈 เพิ่มค่า role ส่งกลับไป
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 * post:
 * tags: [Authentication]
 * summary: Logout
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = hashToken(token);
    
    await db.query(
      'INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, decoded.id, expiresAt]
    );

    // ล้าง Token ที่หมดอายุแล้วในฐานข้อมูล
    await db.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

module.exports = router;