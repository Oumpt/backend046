//server.js
require('dotenv').config();


const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt'); //เพิ่ม bcrypt
const cors = require('cors'); // เพิ่ม cors
const app = express();
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const verifyToken = require('./middleware/auth');


app.use(cors()); // ใช้ CORS middleware แบบอนุญาตทั้งหมด
app.use(express.json());

// ใช้ค่าจาก .env
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Route ทดสอบการเชื่อมต่อ
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// เพิ่ม route /api/data ตามที่ต้องการ
app.get("/api/data", (req, res) => {
  res.json({ message: "Hello, CORS!" });
});

// GET users 
app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, password, status FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET user by id 
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, password, status FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});


//POST: เพิ่มผู้ใช้ใหม่ พร้อม hash password
app.post('/users', async (req, res) => {
  const { firstname, fullname, lastname, username, password, status } = req.body;

  try {
    if (!password) return res.status(400).json({ error: 'Password is required' });

    // เข้ารหัส password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, username, password, status) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, fullname, lastname, username, hashedPassword, status]
    );

    res.json({ id: result.insertId, firstname, fullname, lastname, username, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้ + เปลี่ยนรหัสผ่านถ้ามีส่งมา
app.put('/users/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const {  firstname, fullname, lastname, username, password, status } = req.body;

  try {
    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?, username = ?, status = ?';
    const params = [firstname, fullname, lastname, username, status];

    // ถ้ามี password ใหม่ให้ hash แล้วอัปเดตด้วย
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

//DELETE /users/:id - ลบผู้ใช้
app.delete('/users/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST: เข้าสู่ระบบ (Login)
app.post('/login', async (req, res) => {
  const { username, password } = req.body; // ใช้ fullname หรืออาจเปลี่ยนเป็น username ตามโครงสร้างจริง

  try {
    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    // สร้าง JWT token
    const token = jwt.sign(
      { id: user.id, fullname: user.fullname, lastname: user.lastname },
      SECRET_KEY,
      { expiresIn: '1h' } // อายุ token 1 ชั่วโมง
    );

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

//ตัวอย่างการทำ Logout
app.post('/logout', (req, res) => {
  localStorage.removeItem('token');
  res.json({ message: "Logged out" });
});

// GET: ดึงข้อมูลส่วนตัว
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, fullname, username, status FROM view_001 WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot fetch profile' });
  }
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));