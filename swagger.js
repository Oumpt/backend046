const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend 046 API",
      version: "1.0.0",
      description: "API สำหรับจัดการผู้ใช้และระบบ Inventory / POS",
    },
    servers: [
      {
        url: "https://backend046.vercel.app",
        description: "Production server",
      },
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // ✅ ใช้ทั้ง Relative path และ Absolute path เพื่อความแม่นยำสูงสุดบนทุก Hosting
  apis: [
    "./index.js",
    "./routes/*.js",
    path.join(process.cwd(), "index.js"),
    path.join(process.cwd(), "routes", "*.js")
  ],
};

try {
  const specs = swaggerJsdoc(options);
  // ตรวจสอบเบื้องต้นว่า specs ถูกสร้างสำเร็จหรือไม่
  if (!specs || Object.keys(specs.paths || {}).length === 0) {
    console.warn("⚠️ Swagger Warning: No paths found. Check your JSDoc comments.");
  }
  module.exports = { specs };
} catch (error) {
  console.error("❌ Swagger JSDoc Critical Error:", error.message);
  // กรณีเกิด Error ส่งค่า Default กลับไปเพื่อไม่ให้ index.js พัง
  module.exports = { 
    specs: { 
      openapi: "3.0.0", 
      info: { title: "API Spec Error", version: "1.0.0" }, 
      paths: {} 
    } 
  };
}