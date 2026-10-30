const express = require('express')
const router = express.Router()
const Order = require('../models/Order')
const Customer = require('../models/Customer')
const { protect } = require('../middleware/authMiddleware') // admin auth
const { protectCustomer, identifyCustomer } = require('../middleware/customerAuth')

// 1 loyalty point for every ₹10 on a delivered order
const POINT_RATE = 10

// ✅ Helper: Generate Order ID
async function generateOrderId() {
  const date = new Date()
  const year = date.getFullYear()
  const count = await Order.countDocuments()
  const sequence = String(count + 1).padStart(4, '0')
  return `ORD-${year}-${sequence}`
}

// ✅ Helper: add a notification to a customer's account (keeps the last 50)
async function pushNotification(customerId, title, message, orderId) {
  if (!customerId) return
  await Customer.updateOne(
    { _id: customerId },
    {
      $push: {
        notifications: {
          $each: [{ title, message, orderId }],
          $slice: -50,
        },
      },
    }
  )
}

// ✅ Helper: notification text for a status change
function statusNotice(order, points) {
  const id = order.orderId
  switch (order.status) {
    case 'Confirmed':
      return {
        title: 'Order confirmed',
        message: `Your order ${id} has been confirmed.`,
      }
    case 'Preparing':
      return {
        title: 'Preparing your food',
        message: `Your order ${id} is being prepared.`,
      }
    case 'Out for Delivery':
      return {
        title: 'Out for delivery',
        message: `Your order ${id} is out for delivery.`,
      }
    case 'Delivered':
      return {
        title: 'Order delivered',
        message:
          points > 0
            ? `Your order ${id} was delivered. You earned ${points} reward points!`
            : `Your order ${id} was delivered. Enjoy your meal!`,
      }
    case 'Cancelled':
      return {
        title: 'Order cancelled',
        message: order.cancelReason
          ? `Your order ${id} was cancelled. Reason: ${order.cancelReason}`
          : `Your order ${id} was cancelled.`,
      }
    default:
      return null
  }
}

// @route   POST /api/orders
// @desc    Place a new order (Public). If a customer is logged in, the order is linked to them.
router.post('/', identifyCustomer, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerEmail,
      items,
      notes,
      expectedTime,
    } = req.body

    // Validation
    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, phone and address',
      })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item',
      })
    }

    // Calculate total
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // ✅ Generate Order ID manually
    const orderId = await generateOrderId()

    // Create order
    const newOrder = await Order.create({
      orderId,
      customer: req.customer ? req.customer._id : null,
      customerName,
      customerPhone,
      customerAddress,
      customerEmail: customerEmail || (req.customer ? req.customer.email : ''),
      items,
      totalAmount,
      notes: notes || '',
      expectedTime: expectedTime || '30 mins',
      status: 'Pending',
      statusHistory: [{ status: 'Pending', timestamp: new Date() }],
    })

    // Tell the logged-in customer (never fail the order because of this)
    try {
      await pushNotification(
        newOrder.customer,
        'Order placed',
        `Your order ${newOrder.orderId} was placed successfully.`,
        newOrder.orderId
      )
    } catch (e) {
      console.error('Notification failed:', e.message)
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: newOrder.orderId,
        _id: newOrder._id,
        totalAmount: newOrder.totalAmount,
        expectedTime: newOrder.expectedTime,
        status: newOrder.status,
        customerName: newOrder.customerName,
        createdAt: newOrder.createdAt,
      },
    })
  } catch (error) {
    console.error('Error placing order:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// @route   GET /api/orders/my
// @desc    Orders of the logged-in customer (Customer)
// ⚠️ IMPORTANT: This route MUST be BEFORE the /:id route
router.get('/my', protectCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.customer._id }).sort({
      createdAt: -1,
    })
    res.status(200).json({ success: true, count: orders.length, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @route   GET /api/orders/track/:orderId
// @desc    Track order by Order ID (Public)
router.get('/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId.toUpperCase(),
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your Order ID.',
      })
    }

    res.status(200).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @route   GET /api/orders/stats/summary
// @desc    Get order statistics (Admin)
// ⚠️ IMPORTANT: This route MUST be BEFORE the /:id route
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments()
    const pendingOrders = await Order.countDocuments({ status: 'Pending' })
    const confirmedOrders = await Order.countDocuments({ status: 'Confirmed' })
    const preparingOrders = await Order.countDocuments({ status: 'Preparing' })
    const outForDelivery = await Order.countDocuments({
      status: 'Out for Delivery',
    })
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' })
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' })

    const deliveredOrdersList = await Order.find({ status: 'Delivered' })
    const totalRevenue = deliveredOrdersList.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    )

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        preparingOrders,
        outForDelivery,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
      },
    })
  } catch (error) {
    console.error('Error fetching order stats:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// @route   GET /api/orders
// @desc    Get all orders (Admin)
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query

    const filter = {}
    if (status && status !== 'All') {
      filter.status = status
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone avatar')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @route   GET /api/orders/:id
// @desc    Get single order by MongoDB _id (Admin)
// ⚠️ IMPORTANT: This MUST come AFTER /stats/summary and /my
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'customer',
      'name email phone avatar'
    )

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    res.status(200).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin). Also notifies the customer and gives loyalty points.
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, expectedTime, cancelReason } = req.body

    const validStatuses = [
      'Pending',
      'Confirmed',
      'Preparing',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const previousStatus = order.status

    order.status = status
    order.statusHistory.push({
      status,
      timestamp: new Date(),
    })

    if (expectedTime) {
      order.expectedTime = expectedTime
    }

    // Remember who cancelled and why (cleared if the order is re-opened)
    if (status === 'Cancelled') {
      order.cancelReason = (cancelReason || '').trim()
      order.cancelledBy = 'admin'
    } else {
      order.cancelReason = ''
      order.cancelledBy = ''
    }

    // Loyalty points: only once, only for logged-in customers
    let points = 0
    if (status === 'Delivered' && order.customer && !order.pointsAwarded) {
      points = Math.floor(order.totalAmount / POINT_RATE)
      order.pointsAwarded = true
    }

    await order.save()

    // Customer side effects (never fail the admin's action because of these)
    if (order.customer && status !== previousStatus) {
      try {
        if (points > 0) {
          await Customer.updateOne(
            { _id: order.customer },
            { $inc: { loyaltyPoints: points } }
          )
        }
        const notice = statusNotice(order, points)
        if (notice) {
          await pushNotification(
            order.customer,
            notice.title,
            notice.message,
            order.orderId
          )
        }
      } catch (e) {
        console.error('Customer update failed:', e.message)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// @route   PUT /api/orders/:id
// @desc    Update full order (Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Order updated',
      data: updatedOrder,
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// @route   DELETE /api/orders/:id
// @desc    Delete order (Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router