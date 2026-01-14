require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: [
    'https://frontend046.vercel.app',
    'https://backend046.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://petstore.swagger.io'
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

// ✅ Routes with error handling
try {
  app.use("/api/users", require("./routes/users"));
  console.log('✅ Users route loaded');
} catch (error) {
  console.warn('⚠️  Users route failed:', error.message);
  app.use("/api/users", (req, res) => res.status(503).json({ error: "Users service unavailable" }));
}

try {
  app.use("/api/auth", require("./routes/auth"));
  console.log('✅ Auth route loaded');
} catch (error) {
  console.warn('⚠️  Auth route failed:', error.message);
  app.use("/api/auth", (req, res) => res.status(503).json({ error: "Auth service unavailable" }));
}

// ✅ เพิ่มส่วนของ Products Route (สต็อกสินค้า)
try {
  app.use("/api/products", require("./routes/products"));
  console.log('✅ Products route loaded');
} catch (error) {
  console.warn('⚠️  Products route failed:', error.message);
  app.use("/api/products", (req, res) => res.status(503).json({ error: "Products service unavailable" }));
}

// ✅ Swagger JSON endpoint
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

// ✅ Swagger UI endpoint (ใช้ CDN)
app.get("/api-docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Backend 046 API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: "/swagger.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            docExpansion: "list",
            tagsSorter: "alpha",
            operationsSorter: "alpha"
          });
          window.ui = ui;
        }
      </script>
    </body>
    </html>
  `);
});

// ✅ เพิ่ม route หลัก
app.get('/', (req, res) => {
  res.json({
    message: "Backend 046 API",
    status: "running",
    deployed: true,
    timestamp: new Date().toISOString(),
    endpoints: {
      users: "/api/users",
      auth: "/api/auth",
      products: "/api/products", // เพิ่มลิสต์ตรงนี้ให้ด้วย
      docs: "/api-docs",
      swaggerJson: "/swagger.json",
      health: "/health",
      dbCheck: "/db-check"
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
    availableEndpoints: [
      { path: '/', method: 'GET', description: 'API status' },
      { path: '/api-docs', method: 'GET', description: 'API documentation' },
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/db-check', method: 'GET', description: 'Database status' },
      { path: '/api/auth/login', method: 'POST', description: 'User login' },
      { path: '/api/auth/register', method: 'POST', description: 'User registration' },
      { path: '/api/users', method: 'GET', description: 'Get all users' },
      { path: '/api/products', method: 'GET', description: 'Get all products' } // เพิ่มเข้าลิสต์ 404
    ]
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

const PORT = process.env.PORT || 5000;
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
  console.log(`📊 Swagger spec: ${url}/swagger.json`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST || 'not configured'}`);
  console.log('='.repeat(50));
});