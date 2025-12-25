const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend 046 API",
      version: "1.0.0",
      description: "API สำหรับจัดการผู้ใช้และระบบ Authentication"
    },
    servers: [
      {
        url: "https://backend046.vercel.app",  // ✅ เพิ่ม Vercel URL
        description: "Production server"
      },
      {
        url: "http://localhost:3000",
        description: "Local server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: [path.join(__dirname, "/routes/*.js")],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };