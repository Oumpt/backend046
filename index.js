require('dotenv').config();
const express = require('express');
const cors = require('cors'); // ✅ เพิ่ม CORS
const app = express();

// ✅ CORS Configuration สำหรับ Production
app.use(cors({
  origin: [
    'https://backend046.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// ✅ Security headers
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Backend 046');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const { swaggerUi, specs } = require("./swagger");

// ✅ Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// ✅ เพิ่ม route หลักแบบสั้นๆ
app.get('/', (req, res) => {
  res.json({
    message: "Backend 046 API",
    status: "running",
    deployed: true,
    timestamp: new Date().toISOString(),
    endpoints: {
      users: "/api/users",
      auth: "/api/auth",
      docs: "/api-docs"
    },
    note: "Database needs cloud configuration"
  });
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});