const mongoose = require('mongoose')

const regionalDishSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Dish name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Starters',
        'Main Course',
        'Biryani',
        'South Indian',
        'Breads',
        'Vegetarian',
        'Non-Vegetarian',
        'Desserts',
        'Beverages',
      ],
    },
    status: {
      type: String,
      enum: ['Available', 'Unavailable'],
      default: 'Available',
    },
    image: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('RegionalDish', regionalDishSchema)