const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const GalleryImage = require('../models/GalleryImage')

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

// GET all gallery images
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ order: 1, createdAt: -1 })
    res.status(200).json({
      success: true,
      count: images.length,
      data: images,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET single gallery image
router.get('/:id', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id)
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' })
    }
    res.status(200).json({ success: true, data: image })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create gallery image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, status, order } = req.body

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and category',
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required',
      })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    const newImage = await GalleryImage.create({
      title,
      description: description || '',
      category,
      image: imageUrl,
      status: status || 'Active',
      order: Number(order) || 0,
    })

    res.status(201).json({
      success: true,
      message: 'Image added successfully',
      data: newImage,
    })
  } catch (error) {
    console.error('Error creating gallery image:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT update gallery image
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, status, order } = req.body

    const updateData = {
      title,
      description,
      category,
      status,
      order: Number(order) || 0,
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`

      const oldImage = await GalleryImage.findById(req.params.id)
      if (oldImage && oldImage.image) {
        const oldPath = path.join(__dirname, '..', '..', oldImage.image)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    const updatedImage = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedImage) {
      return res.status(404).json({ success: false, message: 'Image not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: updatedImage,
    })
  } catch (error) {
    console.error('Error updating gallery image:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE gallery image
router.delete('/:id', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id)

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' })
    }

    if (image.image) {
      const imagePath = path.join(__dirname, '..', '..', image.image)
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
    }

    await GalleryImage.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router