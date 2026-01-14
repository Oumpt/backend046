const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth'); // ✅ 1. นำเข้า Middleware ตรวจกุญแจ

// ---------------------------------------------------------
// 🔒 ทุก Route ด้านล่างนี้จะถูกล็อคด้วย verifyToken ทั้งหมด
// ---------------------------------------------------------

// ✅ 1. GET: ดึงข้อมูล (ต้องมี Token)
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

// ✅ 2. POST: เพิ่มสินค้า (ต้องมี Token)
router.post('/', verifyToken, async (req, res) => {
    const { product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products 
            (product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), STR_TO_DATE(?, '%Y-%m-%d'), NOW(), NOW())`,
            [
                product_name, 
                image_url, 
                category, 
                price, 
                quantity, 
                min_stock, 
                entry_date ? entry_date.substring(0, 10) : null, 
                expiry_date ? expiry_date.substring(0, 10) : null
            ]
        );
        res.json({ success: true, message: 'Product added!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ 3. PUT: อัปเดตสินค้า (ต้องมี Token)
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { product_name, image_url, category, price, quantity, min_stock, entry_date, expiry_date } = req.body;

    try {
        let updateParts = [
            "product_name = COALESCE(?, product_name)",
            "image_url = COALESCE(?, image_url)",
            "category = COALESCE(?, category)",
            "price = COALESCE(?, price)",
            "quantity = COALESCE(?, quantity)",
            "min_stock = COALESCE(?, min_stock)",
            "updated_at = NOW()"
        ];
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

// ✅ 4. DELETE: ลบสินค้า (ต้องมี Token)
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