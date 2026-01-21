const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend 046 API",
      version: "1.0.0",
      description: "ระบบจัดการผู้ใช้ สต็อกสินค้า และการขาย (Inventory & POS)",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development server",
      },
      {
        url: "https://backend046.vercel.app",
        description: "Production server (Vercel)",
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
  // ✅ ใช้ path.join ชุดเดียวเพื่อดึงไฟล์ Route ทั้งหมดมาทำ Spec
  apis: [
    path.join(process.cwd(), "routes", "*.js")
  ],
};

try {
  const specs = swaggerJsdoc(options);
  module.exports = { specs };
} catch (error) {
  console.error("❌ Swagger JSDoc Critical Error:", error.message);
  module.exports = { 
    specs: { 
      openapi: "3.0.0", 
      info: { title: "API Spec Error", version: "1.0.0" }, 
      paths: {} 
    } 
  };
}