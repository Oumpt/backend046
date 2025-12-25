const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login
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
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Success
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
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     firstname:
 *                       type: string
 *                       example: "John"
 *                     fullname:
 *                       type: string
 *                       example: "John Doe"
 *                     lastname:
 *                       type: string
 *                       example: "Doe"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     status:
 *                       type: string
 *                       example: "active"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        fullname: user.fullname,
        firstname: user.firstname,
        lastname: user.lastname
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '1h' }
    );

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

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *                   example: "Logged out successfully"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const token = authHeader.substring(7);
    
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

    const expiresAt = new Date(decoded.exp * 1000);

    const tokenHash = hashToken(token);
    
    await db.query(
      'INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, decoded.id, expiresAt]
    );

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