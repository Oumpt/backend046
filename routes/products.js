const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
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
 *                   product_name:
 *                     type: string
 *                     example: Laptop Pro
 *                   image_url:
 *                     type: string
 *                     example: https://example.com/image.jpg
 *                   category:
 *                     type: string
 *                     example: Electronics
 *                   price:
 *                     type: number
 *                     example: 999.99
 *                   quantity:
 *                     type: integer
 *                     example: 50
 *                   min_stock:
 *                     type: integer
 *                     example: 10
 *                   entry_date:
 *                     type: string
 *                     format: date
 *                     example: 2024-01-15
 *                   expiry_date:
 *                     type: string
 *                     format: date
 *                     example: 2025-01-15
 *                   last_update:
 *                     type: string
 *                     example: 15/01/2024 14:30:00
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                   example: Database connection failed
 *   post:
 *     tags: [Products]
 *     summary: Add new product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_name, price, quantity]
 *             properties:
 *               product_name:
 *                 type: string
 *                 example: Laptop Pro
 *               image_url:
 *                 type: string
 *                 example: https://example.com/image.jpg
 *               category:
 *                 type: string
 *                 example: Electronics
 *               price:
 *                 type: number
 *                 example: 999.99
 *               quantity:
 *                 type: integer
 *                 example: 50
 *               min_stock:
 *                 type: integer
 *                 example: 10
 *               entry_date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-01-15
 *     responses:
 *       200:
 *         description: Product added successfully
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
 *                   example: Product added!
 *                 id:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Database error
 */

router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *, 
            DATE_FORMAT(CONVERT_TZ(updated_at, '+00:00', '+07:00'), "%d/%m/%Y %H:%i:%s") as last_update 
            FROM products 
            ORDER BY updated_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products 
            (product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), STR_TO_DATE(?, '%Y-%m-%d'), NOW(), NOW())`,
            [
                product_name, image_url, category, price, quantity, min_stock, 
                entry_date ? entry_date.substring(0, 10) : null, 
                expiry_date ? expiry_date.substring(0, 10) : null
            ]
        );
        res.json({ success: true, message: 'Product added!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product
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
 *               product_name:
 *                 type: string
 *                 example: Updated Laptop Pro
 *               image_url:
 *                 type: string
 *                 example: https://example.com/new-image.jpg
 *               category:
 *                 type: string
 *                 example: Electronics
 *               price:
 *                 type: number
 *                 example: 1299.99
 *               quantity:
 *                 type: integer
 *                 example: 30
 *               min_stock:
 *                 type: integer
 *                 example: 5
 *               entry_date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-20
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-01-20
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: Updated with Auth Security
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Database error
 *   delete:
 *     tags: [Products]
 *     summary: Delete product
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
 *         description: Product deleted successfully
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
 *                   example: Deleted successfully!
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Database error
 */

router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date } = req.body;
    try {
        let updateParts = ["product_name = COALESCE(?, product_name)", "image_url = COALESCE(?, image_url)", "category = COALESCE(?, category)", "price = COALESCE(?, price)", "quantity = COALESCE(?, quantity)", "min_stock = COALESCE(?, min_stock)", "updated_at = NOW()"];
        let params = [product_name ?? null, image_url ?? null, category ?? null, price ?? null, quantity ?? null, min_stock ?? null];
        if (entry_date !== undefined) {
            updateParts.push("entry_date = ?");
            params.push(entry_date ? entry_date.substring(0, 10) : null);
        }
        if (expiry_date !== undefined) {
            updateParts.push("expiry_date = ?");
            params.push(expiry_date ? expiry_date.substring(0, 10) : null);
        }
        params.push(id);
        const sql = `UPDATE products SET ${updateParts.join(', ')} WHERE id = ?`;
        await db.query(sql, params);
        res.json({ success: true, message: 'Updated with Auth Security' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ success: true, message: 'Deleted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;