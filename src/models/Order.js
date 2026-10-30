const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    // String (not ObjectId): website "special" dishes have ids like "special-misal-pav"
    dishId: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      default: '',
    },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Logged-in customer who placed this order (null for guest orders)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    customerAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Preparing',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
      default: 'Pending',
    },
    expectedTime: {
      type: String,
      default: '30 mins',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Loyalty points are given only once, when the order is delivered
    pointsAwarded: {
      type: Boolean,
      default: false,
    },
    // Filled when an order is cancelled
    cancelReason: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledBy: {
      type: String,
      enum: ['', 'admin', 'customer'],
      default: '',
    },
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
)

// ✅ Create the model FIRST
const Order = mongoose.model('Order', orderSchema)

module.exports = Order