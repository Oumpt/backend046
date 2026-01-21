const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/auth'); // แนะนำให้ใช้ middleware ตรวจ token ด้วย

/**
 * @openapi
 * tags:
 * name: Sales
 * description: ระบบจัดการการขายและรายงาน (POS & Sales Report)
 */

/**
 * @openapi
 * /api/sales:
 * post:
 * summary: บันทึกรายการขายใหม่ (Checkout)
 * tags: [Sales]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * total_price:
 * type: number
 * items:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * product_name:
 * type: string
 * cartQty:
 * type: integer
 * price:
 * type: number
 * responses:
 * 201:
 * description: บันทึกสำเร็จ
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

/**
 * @openapi
 * /api/sales:
 * get:
 * summary: ดึงประวัติการขายทั้งหมด
 * tags: [Sales]
 * responses:
 * 200:
 * description: รายการประวัติการขาย
 */
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sales ORDER BY id DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @openapi
 * /api/sales/{id}/items:
 * get:
 * summary: ดึงรายละเอียดสินค้าในบิลตาม ID
 * tags: [Sales]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: รายการสินค้าในบิล
 */
router.get('/:id/items', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @openapi
 * /api/sales/{id}:
 * delete:
 * summary: ลบรายการขาย (ต้องยืนยันตัวตน)
 * tags: [Sales]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * password:
 * type: string
 * restoreStock:
 * type: boolean
 * description: คืนสินค้าเข้าคลังหรือไม่
 * responses:
 * 200:
 * description: ลบสำเร็จ
 * 401:
 * description: ยืนยันตัวตนไม่ผ่าน
 */
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