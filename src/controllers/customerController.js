const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { OAuth2Client } = require('google-auth-library')
const Customer = require('../models/Customer')
const Order = require('../models/Order')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const BLOCKED_MESSAGE =
  'Your account has been blocked. Please contact the restaurant.'

const generateToken = (id) => {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

const publicCustomer = (c) => ({
  _id: c._id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  addresses: c.addresses,
  avatar: c.avatar || '',
  googleVerified: !!c.googleId,
  authProvider: c.authProvider || 'local',
  loyaltyPoints: c.loyaltyPoints || 0,
  createdAt: c.createdAt,
})

/* =========================================================
   CUSTOMER (website) endpoints
   ========================================================= */

// @desc    Register customer
// @route   POST /api/customers/register
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    const exists = await Customer.findOne({ email: email.toLowerCase() })
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    const customer = await Customer.create({ name, email, password, phone })

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { ...publicCustomer(customer), token: generateToken(customer._id) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Login customer
// @route   POST /api/customers/login
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      })
    }

    const customer = await Customer.findOne({
      email: email.toLowerCase(),
    }).select('+password')

    if (!customer || !(await customer.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    if (customer.blocked) {
      return res.status(403).json({ success: false, message: BLOCKED_MESSAGE })
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { ...publicCustomer(customer), token: generateToken(customer._id) },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Login / sign up with Google
// @route   POST /api/customers/google
// body: { credential }  (Google ID token from the frontend)
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required',
      })
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured on the server',
      })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: 'Google account email is not verified',
      })
    }

    const email = payload.email.toLowerCase()
    let customer = await Customer.findOne({ email })

    if (!customer) {
      // random password: Google users never log in with it
      customer = await Customer.create({
        name: payload.name || email.split('@')[0],
        email,
        password: crypto.randomBytes(24).toString('hex'),
        googleId: payload.sub,
        avatar: payload.picture || '',
        authProvider: 'google',
      })
    } else if (!customer.googleId) {
      // existing email account: link Google to it
      customer.googleId = payload.sub
      if (!customer.avatar && payload.picture) customer.avatar = payload.picture
      await customer.save()
    }

    if (customer.blocked) {
      return res.status(403).json({ success: false, message: BLOCKED_MESSAGE })
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { ...publicCustomer(customer), token: generateToken(customer._id) },
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Google sign-in failed. Please try again.',
    })
  }
}

// @desc    Get current customer
// @route   GET /api/customers/me
const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: publicCustomer(req.customer) })
}

// @desc    Update name / phone
// @route   PUT /api/customers/me
const updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body

    if (name !== undefined) {
      if (!name.trim()) {
        return res
          .status(400)
          .json({ success: false, message: 'Name cannot be empty' })
      }
      req.customer.name = name
    }
    if (phone !== undefined) req.customer.phone = phone

    await req.customer.save()

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: publicCustomer(req.customer),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Add address
// @route   POST /api/customers/addresses
const addAddress = async (req, res) => {
  try {
    const { label, line1, city, pincode } = req.body

    if (!line1 || !city || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide address line, city and pincode',
      })
    }

    req.customer.addresses.push({ label, line1, city, pincode })
    await req.customer.save()

    res.status(201).json({
      success: true,
      message: 'Address added',
      data: publicCustomer(req.customer),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Delete address
// @route   DELETE /api/customers/addresses/:id
const deleteAddress = async (req, res) => {
  try {
    req.customer.addresses = req.customer.addresses.filter(
      (a) => a._id.toString() !== req.params.id
    )
    await req.customer.save()

    res.status(200).json({
      success: true,
      message: 'Address removed',
      data: publicCustomer(req.customer),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get my notifications (newest first)
// @route   GET /api/customers/notifications
const getNotifications = async (req, res) => {
  const list = [...req.customer.notifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
  res.status(200).json({
    success: true,
    data: {
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    },
  })
}

// @desc    Mark all my notifications as read
// @route   PUT /api/customers/notifications/read
const markNotificationsRead = async (req, res) => {
  try {
    req.customer.notifications.forEach((n) => {
      n.read = true
    })
    await req.customer.save()
    res.status(200).json({ success: true, message: 'Notifications marked read' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/* =========================================================
   ADMIN endpoints (protected by admin `protect` in the routes)
   ========================================================= */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// @desc    List all customers with order stats (Admin)
// @route   GET /api/customers/admin/all?search=
const adminListCustomers = async (req, res) => {
  try {
    const { search } = req.query
    const filter = {}

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i')
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
    }

    const customers = await Customer.find(filter)
      .select('-notifications')
      .sort({ createdAt: -1 })
      .lean()

    const stats = await Order.aggregate([
      { $match: { customer: { $ne: null }, status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$customer',
          orders: { $sum: 1 },
          spent: { $sum: '$totalAmount' },
        },
      },
    ])
    const statMap = new Map(stats.map((s) => [String(s._id), s]))

    const data = customers.map((c) => {
      const s = statMap.get(String(c._id))
      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        avatar: c.avatar || '',
        googleVerified: !!c.googleId,
        blocked: !!c.blocked,
        loyaltyPoints: c.loyaltyPoints || 0,
        addressCount: (c.addresses || []).length,
        orderCount: s ? s.orders : 0,
        totalSpent: s ? s.spent : 0,
        createdAt: c.createdAt,
      }
    })

    res.status(200).json({ success: true, count: data.length, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    One customer with addresses and orders (Admin)
// @route   GET /api/customers/admin/:id
const adminGetCustomer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    const customer = await Customer.findById(req.params.id)
      .select('-notifications')
      .lean()

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    const orders = await Order.find({ customer: customer._id }).sort({
      createdAt: -1,
    })

    res.status(200).json({
      success: true,
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        avatar: customer.avatar || '',
        googleVerified: !!customer.googleId,
        blocked: !!customer.blocked,
        loyaltyPoints: customer.loyaltyPoints || 0,
        addresses: customer.addresses || [],
        createdAt: customer.createdAt,
        orders,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Block / unblock a customer (Admin)
// @route   PUT /api/customers/admin/:id/block   body: { blocked: true|false }
const adminSetBlocked = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    const blocked = !!req.body.blocked
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { blocked },
      { new: true }
    ).select('-notifications')

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    res.status(200).json({
      success: true,
      message: blocked ? 'Customer blocked' : 'Customer unblocked',
      data: { _id: customer._id, blocked: customer.blocked },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Delete a customer (Admin). Their past orders are kept as guest orders.
// @route   DELETE /api/customers/admin/:id
const adminDeleteCustomer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    const customer = await Customer.findByIdAndDelete(req.params.id)
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' })
    }

    await Order.updateMany({ customer: customer._id }, { $set: { customer: null } })

    res
      .status(200)
      .json({ success: true, message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  registerCustomer,
  loginCustomer,
  googleLogin,
  getMe,
  updateMe,
  addAddress,
  deleteAddress,
  getNotifications,
  markNotificationsRead,
  adminListCustomers,
  adminGetCustomer,
  adminSetBlocked,
  adminDeleteCustomer,
}