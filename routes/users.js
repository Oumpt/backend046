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
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   firstname:
 *                     type: string
 *                     example: John
 *                   fullname:
 *                     type: string
 *                     example: John Doe
 *                   lastname:
 *                     type: string
 *                     example: Doe
 *                   username:
 *                     type: string
 *                     example: john_doe
 *                   status:
 *                     type: string
 *                     example: active
 *                   role:
 *                     type: string
 *                     example: staff
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Query failed
 *   post:
 *     tags: [Users]
 *     summary: Create user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 example: password123
 *               firstname:
 *                 type: string
 *                 example: John
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *               role:
 *                 type: string
 *                 enum: [admin, staff]
 *                 example: staff
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: john_doe
 *                 role:
 *                   type: string
 *                   example: staff
 *       400:
 *         description: Bad request - missing fields or username exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Username already exists
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Insert failed
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status, role FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

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
 *           example: 1
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 firstname:
 *                   type: string
 *                   example: John
 *                 fullname:
 *                   type: string
 *                   example: John Doe
 *                 lastname:
 *                   type: string
 *                   example: Doe
 *                 username:
 *                   type: string
 *                   example: john_doe
 *                 status:
 *                   type: string
 *                   example: active
 *                 role:
 *                   type: string
 *                   example: staff
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Query failed
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
 *           example: 1
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Delete failed
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

/**
 * @openapi
 * /api/users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Update user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, staff]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Role updated to admin
 *       400:
 *         description: Bad request - invalid role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid role type
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Update role failed
 */
/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: John
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 example: newpassword123
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *               role:
 *                 type: string
 *                 enum: [admin, staff]
 *                 example: staff
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid data
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Update failed
 */
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, fullname, username, password, status, role } = req.body;
  const currentUserId = req.user.id; // From JWT token
  const currentUserRole = req.user.role;

  try {
    let updateFields = [];
    let updateValues = [];

    if (firstname !== undefined) {
      updateFields.push('firstname = ?');
      updateValues.push(firstname);
    }
    if (lastname !== undefined) {
      updateFields.push('lastname = ?');
      updateValues.push(lastname);
    }
    if (fullname !== undefined) {
      updateFields.push('fullname = ?');
      updateValues.push(fullname);
    }
    if (username !== undefined) {
      // Check if username already exists (excluding current user)
      const [existing] = await db.query('SELECT id FROM tbl_users WHERE username = ? AND id != ?', [username, id]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (role !== undefined) {
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role type' });
      }
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updateValues.push(id);
    const updateQuery = `UPDATE tbl_users SET ${updateFields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // SECURITY: Force logout if role changed
    if (role !== undefined) {
      try {
        // Revoke all existing tokens for this user
        await db.query('DELETE FROM revoked_tokens WHERE user_id = ?', [id]);
        await db.query('INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', 
          ['role_change_force_logout', id, new Date()]);
      } catch (err) {
        console.warn('Failed to revoke tokens for role change:', err.message);
      }
    }

    res.json({ 
      success: true, 
      message: role !== undefined ? 
        'User updated successfully. User must login again to access new role.' : 
        'User updated successfully' 
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

router.put('/:id/role', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const currentUserId = req.user.id; // From JWT token
  
  try {
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role type' });
    }
    const [result] = await db.query('UPDATE tbl_users SET role = ? WHERE id = ?', [role, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'User not found' });
    
    // SECURITY: Force logout if role changed
    try {
      // Revoke all existing tokens for this user
      await db.query('DELETE FROM revoked_tokens WHERE user_id = ?', [id]);
      await db.query('INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', 
        ['role_change_force_logout', id, new Date()]);
    } catch (err) {
      console.warn('Failed to revoke tokens for role change:', err.message);
    }
    
    res.json({ 
      success: true, 
      message: `Role updated to ${role}. User must login again to access new role.` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Update role failed' });
  }
});

module.exports = router;