const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Testimonial = require('../models/Testimonial')

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  )
  const mimetype = allowedTypes.test(file.mimetype)

  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
})

// GET all testimonials
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({
      order: 1,
      createdAt: -1,
    })
    res.status(200).json({
      success: true,
      count: testimonials.length,
      data: testimonials,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET single testimonial
router.get('/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)
    if (!testimonial) {
      return res
        .status(404)
        .json({ success: false, message: 'Testimonial not found' })
    }
    res.status(200).json({ success: true, data: testimonial })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create testimonial
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, role, message, rating, status, order } = req.body

    if (!name || !role || !message || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, role, message and rating',
      })
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

    const newTestimonial = await Testimonial.create({
      name,
      role,
      message,
      rating: Number(rating),
      image: imageUrl,
      status: status || 'Active',
      order: Number(order) || 0,
    })

    res.status(201).json({
      success: true,
      message: 'Testimonial added successfully',
      data: newTestimonial,
    })
  } catch (error) {
    console.error('Error creating testimonial:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT update testimonial
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, role, message, rating, status, order } = req.body

    const updateData = {
      name,
      role,
      message,
      rating: Number(rating),
      status,
      order: Number(order) || 0,
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`

      const oldTestimonial = await Testimonial.findById(req.params.id)
      if (oldTestimonial && oldTestimonial.image) {
        const oldPath = path.join(
          __dirname,
          '..',
          '..',
          oldTestimonial.image
        )
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedTestimonial) {
      return res
        .status(404)
        .json({ success: false, message: 'Testimonial not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      data: updatedTestimonial,
    })
  } catch (error) {
    console.error('Error updating testimonial:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE testimonial
router.delete('/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)

    if (!testimonial) {
      return res
        .status(404)
        .json({ success: false, message: 'Testimonial not found' })
    }

    if (testimonial.image) {
      const imagePath = path.join(__dirname, '..', '..', testimonial.image)
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
    }

    await Testimonial.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router