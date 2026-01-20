const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const bcrypt = require('bcrypt');

// ✅ 1. บันทึกการขาย (คงเดิม)
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

// ✅ 2. ดึงประวัติการขาย (คงเดิม)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sales ORDER BY id DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ✅ 3. ดึงรายละเอียดสินค้าในบิล (คงเดิม)
router.get('/:id/items', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ✅ 4. ลบรายการขาย (เพิ่ม Logic เลือกคืนสต็อกได้)
router.delete('/:id', async (req, res) => {
    const { username, password, restoreStock } = req.body; // รับค่า restoreStock มาจาก Frontend
    const saleId = req.params.id;

    const connection = await db.getConnection();
    try {
        // 🔒 1. เช็คสิทธิ์ User ใน tbl_users
        const [users] = await connection.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: "ไม่พบชื่อผู้ใช้นี้!" });

        const isMatch = await bcrypt.compare(password, users[0].password);
        if (!isMatch) return res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง!" });

        await connection.beginTransaction();

        // 🔄 2. คืนสต็อก (เฉพาะถ้า restoreStock เป็น true เท่านั้น)
        if (restoreStock === true) {
            const [items] = await connection.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [saleId]);
            for (const item of items) {
                await connection.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        }

        // 🗑️ 3. ลบข้อมูล
        await connection.query('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
        await connection.query('DELETE FROM sales WHERE id = ?', [saleId]);

        await connection.commit();
        res.json({ 
            success: true, 
            message: restoreStock ? "ลบรายการขายและคืนสต็อกสำเร็จ" : "ลบรายการขายสำเร็จ (ไม่คืนสต็อก)" 
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally { connection.release(); }
});

module.exports = router;