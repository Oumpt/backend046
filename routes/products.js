const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

/**
 * @openapi
 * tags:
 * name: Products
 * description: ระบบจัดการสต็อกสินค้า (Inventory Management)
 */

/**
 * @openapi
 * /api/products:
 * get:
 * summary: ดึงข้อมูลสินค้าทั้งหมด
 * tags: [Products]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: รายการสินค้าทั้งหมดในระบบ
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
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

/**
 * @openapi
 * /api/products:
 * post:
 * summary: เพิ่มสินค้าใหม่เข้าสู่ระบบ
 * tags: [Products]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - product_name
 * - price
 * - quantity
 * properties:
 * product_name:
 * type: string
 * image_url:
 * type: string
 * category:
 * type: string
 * price:
 * type: number
 * quantity:
 * type: integer
 * min_stock:
 * type: integer
 * entry_date:
 * type: string
 * format: date
 * expiry_date:
 * type: string
 * format: date
 * responses:
 * 201:
 * description: เพิ่มสินค้าสำเร็จ
 */
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

/**
 * @openapi
 * /api/products/{id}:
 * put:
 * summary: อัปเดตข้อมูลสินค้าหรือแก้ไขสต็อก
 * tags: [Products]
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
 * product_name:
 * type: string
 * image_url:
 * type: string
 * category:
 * type: string
 * price:
 * type: number
 * quantity:
 * type: integer
 * min_stock:
 * type: integer
 * entry_date:
 * type: string
 * format: date
 * expiry_date:
 * type: string
 * format: date
 * responses:
 * 200:
 * description: อัปเดตสำเร็จ
 */
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

/**
 * @openapi
 * /api/products/{id}:
 * delete:
 * summary: ลบสินค้าออกจากระบบ
 * tags: [Products]
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
 * description: ลบสินค้าสำเร็จ
 */
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