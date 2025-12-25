const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/auth');

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   firstname:
 *                     type: string
 *                   fullname:
 *                     type: string
 *                   lastname:
 *                     type: string
 *                   username:
 *                     type: string
 *                   status:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 firstname:
 *                   type: string
 *                 fullname:
 *                   type: string
 *                 lastname:
 *                   type: string
 *                 username:
 *                   type: string
 *                 status:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ 
      success: false,
      error: 'User not found' 
    });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Query failed' 
    });
  }
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 example: "Doe"
 *               fullname:
 *                 type: string
 *                 example: "John Doe"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               status:
 *                 type: string
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 firstname:
 *                   type: string
 *                 fullname:
 *                   type: string
 *                 lastname:
 *                   type: string
 *                 username:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Bad request
 */
router.post('/', async (req, res) => {
  const { firstname, fullname, lastname, username, password, status } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    const [existing] = await db.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Username already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, username, password, status) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, fullname, lastname, username, hashedPassword, status || 'active']
    );

    res.json({ 
      success: true,
      id: result.insertId, 
      firstname, 
      fullname, 
      lastname, 
      username, 
      status: status || 'active'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Insert failed' 
    });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               fullname:
 *                 type: string
 *                 example: "John Smith"
 *               lastname:
 *                 type: string
 *                 example: "Smith"
 *               username:
 *                 type: string
 *                 example: "johnsmith"
 *               password:
 *                 type: string
 *                 example: "newpassword123"
 *               status:
 *                 type: string
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname, username, password, status } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM tbl_users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?, username = ?, status = ?';
    const params = [firstname, fullname, lastname, username, status];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    res.json({ 
      success: true,
      message: 'User updated successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Update failed' 
    });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Delete failed' 
    });
  }
});

module.exports = router;