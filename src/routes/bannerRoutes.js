const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Banner = require('../models/Banner')

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

// GET all banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 })
    res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET single banner
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }
    res.status(200).json({ success: true, data: banner })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create banner
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link, status, order } = req.body

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title',
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required',
      })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    const newBanner = await Banner.create({
      title,
      subtitle: subtitle || '',
      link: link || '',
      image: imageUrl,
      status: status || 'Active',
      order: Number(order) || 0,
    })

    res.status(201).json({
      success: true,
      message: 'Banner added successfully',
      data: newBanner,
    })
  } catch (error) {
    console.error('Error creating banner:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT update banner
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link, status, order } = req.body

    const updateData = {
      title,
      subtitle,
      link,
      status,
      order: Number(order) || 0,
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`

      const oldBanner = await Banner.findById(req.params.id)
      if (oldBanner && oldBanner.image) {
        const oldPath = path.join(__dirname, '..', '..', oldBanner.image)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: updatedBanner,
    })
  } catch (error) {
    console.error('Error updating banner:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE banner
router.delete('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }

    if (banner.image) {
      const imagePath = path.join(__dirname, '..', '..', banner.image)
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
    }

    await Banner.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router