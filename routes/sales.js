const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/auth');

/**
 * @openapi
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Checkout and create sale
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [total_price, items]
 *             properties:
 *               total_price:
 *                 type: number
 *                 example: 1999.99
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, product_name, cartQty, price]
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     product_name:
 *                       type: string
 *                       example: Laptop Pro
 *                     cartQty:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 999.99
 *     responses:
 *       201:
 *         description: Checkout successful
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
 *                   example: บันทึกเรียบร้อย
 *                 saleId:
 *                   type: integer
 *                   example: 1
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
 *                   example: Invalid request data
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
 *                   example: Database error
 *   get:
 *     tags: [Sales]
 *     summary: Get sales history
 *     responses:
 *       200:
 *         description: List of all sales
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
 *                   total_price:
 *                     type: number
 *                     example: 1999.99
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2024-01-15T10:30:00Z
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database error
 */
router.post('/', async (req, res) => {
    const { total_price, items } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [saleResult] = await connection.query('INSERT INTO sales (total_price) VALUES (?)', [total_price]);
        const saleId = saleResult.insertId;
        for (const item of items) {
            await connection.query('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price_at_sale) VALUES (?, ?, ?, ?, ?)', [saleId, item.id, item.product_name, item.cartQty, item.price]);
            await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.cartQty, item.id]);
        }
        await connection.commit();
        res.status(201).json({ success: true, message: "บันทึกเรียบร้อย", saleId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally { connection.release(); }
});

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sales ORDER BY id DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @openapi
 * /api/sales/{id}/items:
 *   get:
 *     tags: [Sales]
 *     summary: Get items by bill ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: List of sale items
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
 *                   sale_id:
 *                     type: integer
 *                     example: 1
 *                   product_id:
 *                     type: integer
 *                     example: 1
 *                   product_name:
 *                     type: string
 *                     example: Laptop Pro
 *                   quantity:
 *                     type: integer
 *                     example: 2
 *                   price_at_sale:
 *                     type: number
 *                     example: 999.99
 *       404:
 *         description: Sale not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Sale not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database error
 */
router.get('/:id/items', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Sale not found' });
        } else {
            res.json(rows);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { username, password, restoreStock } = req.body; 
    const saleId = req.params.id;
    const connection = await db.getConnection();
    try {
        const [users] = await connection.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: "ไม่พบชื่อผู้ใช้นี้!" });
        const isMatch = await bcrypt.compare(password, users[0].password);
        if (!isMatch) return res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง!" });
        await connection.beginTransaction();
        if (restoreStock === true) {
            const [items] = await connection.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [saleId]);
            for (const item of items) {
                await connection.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        }
        await connection.query('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
        await connection.query('DELETE FROM sales WHERE id = ?', [saleId]);
        await connection.commit();
        res.json({ success: true, message: restoreStock ? "ลบรายการขายและคืนสต็อกสำเร็จ" : "ลบรายการขายสำเร็จ" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally { connection.release(); }
});

module.exports = router;