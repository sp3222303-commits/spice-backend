const express = require('express')
const router = express.Router()
const {
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
} = require('../controllers/customerController')
const { protectCustomer } = require('../middleware/customerAuth')
const { protect } = require('../middleware/authMiddleware') // admin auth

// ---------- Website (customer) ----------
router.post('/register', registerCustomer)
router.post('/login', loginCustomer)
router.post('/google', googleLogin)

router.get('/me', protectCustomer, getMe)
router.put('/me', protectCustomer, updateMe)
router.post('/addresses', protectCustomer, addAddress)
router.delete('/addresses/:id', protectCustomer, deleteAddress)
router.get('/notifications', protectCustomer, getNotifications)
router.put('/notifications/read', protectCustomer, markNotificationsRead)

// ---------- Admin panel ----------
router.get('/admin/all', protect, adminListCustomers)
router.get('/admin/:id', protect, adminGetCustomer)
router.put('/admin/:id/block', protect, adminSetBlocked)
router.delete('/admin/:id', protect, adminDeleteCustomer)

module.exports = router