require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

// Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth")); // เปลี่ยนจาก /api/login เป็น /api/auth

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));