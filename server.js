const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const connectDB = require('./src/config/db')

// Load env variables
dotenv.config()

// Connect to MongoDB
connectDB()

const app = express()

// ✅ CORS — सर्व origins allow
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ✅ Static folder for uploaded images
app.use('/uploads', express.static('uploads'))

// ✅ Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ✅ Routes
app.use('/api/auth', require('./src/routes/authRoutes'))
app.use('/api/menu', require('./src/routes/menuRoutes'))
app.use('/api/regional', require('./src/routes/regionalRoutes'))
app.use('/api/chefs', require('./src/routes/chefRoutes'))
app.use('/api/testimonials', require('./src/routes/testimonialRoutes'))
app.use('/api/gallery', require('./src/routes/galleryRoutes'))
app.use('/api/banners', require('./src/routes/bannerRoutes'))
app.use('/api/faqs', require('./src/routes/faqRoutes'))
app.use('/api/stats', require('./src/routes/statsRoutes'))
app.use('/api/orders', require('./src/routes/orderRoutes'))
app.use('/api/customers', require('./src/routes/customerRoutes'))   // ✅ NEW: customer login/profile

// ✅ Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🍽️ Spice & Taste Backend API is running!',
    timestamp: new Date().toISOString(),
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: err.message || 'Server error',
  })
})

// Start server
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
})