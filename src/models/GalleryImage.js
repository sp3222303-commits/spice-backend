const mongoose = require('mongoose')

const galleryImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Interior', 'Ambience', 'Events', 'Other'],
      default: 'Food',
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('GalleryImage', galleryImageSchema)