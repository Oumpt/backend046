const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/auth');

/**
 * @openapi
 * tags:
 * name: Users
 * description: ระบบจัดการข้อมูลผู้ใช้งาน (Admin Only)
 */

/**
 * @openapi
 * /api/users:
 * get:
 * tags: [Users]
 * summary: Get all users
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Success
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status, role FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 * get:
 * tags: [Users]
 * summary: Get user by ID
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Success
 */
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status, role FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Query failed' });
  }
});

/**
 * @openapi
 * /api/users:
 * post:
 * tags: [Users]
 * summary: Create new user
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - username
 * - password
 * properties:
 * firstname:
 * type: string
 * lastname:
 * type: string
 * fullname:
 * type: string
 * username:
 * type: string
 * password:
 * type: string
 * status:
 * type: string
 * example: "active"
 * role:
 * type: string
 * example: "staff"
 * responses:
 * 200:
 * description: Created
 */
router.post('/', async (req, res) => {
  const { firstname, fullname, lastname, username, password, status, role } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const [existing] = await db.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, username, password, status, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstname, fullname, lastname, username, hashedPassword, status || 'active', role || 'staff']
    );

    res.json({ success: true, id: result.insertId, username, role: role || 'staff' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Insert failed' });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 * put:
 * tags: [Users]
 * summary: Update user (Full edit including role)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * firstname:
 * type: string
 * lastname:
 * type: string
 * fullname:
 * type: string
 * username:
 * type: string
 * password:
 * type: string
 * status:
 * type: string
 * role:
 * type: string
 * responses:
 * 200:
 * description: Updated
 */
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname, username, password, status, role } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM tbl_users WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?, username = ?, status = ?, role = ?';
    const params = [firstname, fullname, lastname, username, status, role];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

/**
 * @openapi
 * /api/users/{id}/role:
 * put:
 * tags: [Users]
 * summary: Update user role only
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * role:
 * type: string
 * enum: [admin, staff]
 * responses:
 * 200:
 * description: Success
 */
router.put('/:id/role', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role type' });
    }

    const [result] = await db.query('UPDATE tbl_users SET role = ? WHERE id = ?', [role, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Update role failed' });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 * delete:
 * tags: [Users]
 * summary: Delete user
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Deleted
 */
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

module.exports = router;