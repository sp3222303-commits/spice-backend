const jwt = require('jsonwebtoken')
const Customer = require('../models/Customer')

const extractToken = (req) => {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.split(' ')[1] : null
}

// Protects customer-only routes. Admin tokens are rejected (role check).
const protectCustomer = async (req, res, next) => {
  try {
    const token = extractToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      })
    }

    const customer = await Customer.findById(decoded.id)
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Customer not found',
      })
    }

    if (customer.blocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact the restaurant.',
      })
    }

    req.customer = customer
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    })
  }
}

// Optional: if a valid customer token is sent, attach req.customer.
// Otherwise the request continues as a guest (used when placing orders).
const identifyCustomer = async (req, res, next) => {
  try {
    const token = extractToken(req)
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (decoded.role === 'customer') {
        const customer = await Customer.findById(decoded.id)
        if (customer && !customer.blocked) req.customer = customer
      }
    }
  } catch (error) {
    // invalid token: treat as guest
  }
  next()
}

module.exports = { protectCustomer, identifyCustomer }