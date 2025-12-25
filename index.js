require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: [
    'https://backend046.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://petstore.swagger.io'  // สำหรับ test Swagger
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

// ✅ Load Swagger
let swaggerSetup;
try {
  const { swaggerUi, specs } = require("./swagger");
  swaggerSetup = swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: "Backend 046 API Docs"
  });
  console.log('✅ Swagger loaded successfully');
} catch (error) {
  console.warn('⚠️  Swagger setup failed:', error.message);
  swaggerSetup = (req, res) => res.send('Swagger docs unavailable');
}

// ✅ Routes with error handling
try {
  app.use("/api/users", require("./routes/users"));
  console.log('✅ Users route loaded');
} catch (error) {
  console.warn('⚠️  Users route failed:', error.message);
  app.use("/api/users", (req, res) => res.status(503).json({ 
    error: "Users service unavailable" 
  }));
}

try {
  app.use("/api/auth", require("./routes/auth"));
  console.log('✅ Auth route loaded');
} catch (error) {
  console.warn('⚠️  Auth route failed:', error.message);
  app.use("/api/auth", (req, res) => res.status(503).json({ 
    error: "Auth service unavailable" 
  }));
}

// ✅ Swagger endpoint with fallback
app.get("/api-docs", (req, res, next) => {
  if (typeof swaggerSetup === 'function') {
    const { swaggerUi } = require("./swagger");
    return swaggerUi.serve(req, res, next);
  }
  next();
}, (req, res) => {
  if (typeof swaggerSetup === 'function') {
    return swaggerSetup(req, res);
  }
  // Fallback HTML
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Backend 046 API Docs</title></head>
    <body>
      <h1>📚 Backend 046 API Documentation</h1>
      <p>Swagger UI is temporarily unavailable.</p>
      <h2>Endpoints:</h2>
      <ul>
        <li>POST /api/auth/login</li>
        <li>POST /api/auth/register</li>
        <li>GET /api/users</li>
        <li>GET /health</li>
      </ul>
      <p>Base URL: https://backend046.vercel.app</p>
    </body>
    </html>
  `);
});

// ✅ เพิ่ม Swagger JSON endpoint
app.get("/swagger.json", (req, res) => {
  try {
    const { specs } = require("./swagger");
    res.json(specs);
  } catch (error) {
    res.json({
      openapi: "3.0.0",
      info: { title: "Backend 046 API", version: "1.0.0" }
    });
  }
});

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
      docs: "/api-docs",
      swaggerJson: "/swagger.json",
      health: "/health"
    },
    note: process.env.NODE_ENV === 'production' ? 
      "Production deployment" : "Development mode"
  });
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Database check endpoint
app.get('/db-check', async (req, res) => {
  try {
    const db = require('./config/db');
    const [result] = await db.query('SELECT 1 as connected');
    res.json({ 
      success: true, 
      database: 'connected',
      result 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    available: ['/', '/health', '/api-docs', '/swagger.json']
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 
      'Internal server error' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const isVercel = process.env.VERCEL === '1';
  const url = isVercel ? 
    `https://backend046.vercel.app` : 
    `http://localhost:${PORT}`;
  
  console.log('='.repeat(50));
  console.log('🚀 BACKEND 046 API STARTED');
  console.log('='.repeat(50));
  console.log(`🔗 URL: ${url}`);
  console.log(`📚 Docs: ${url}/api-docs`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🐳 Database: ${process.env.DB_HOST || 'not configured'}`);
  console.log('='.repeat(50));
});