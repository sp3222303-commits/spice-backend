const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Chef = require('../models/Chef')

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

// GET all chefs
router.get('/', async (req, res) => {
  try {
    const chefs = await Chef.find().sort({ order: 1, createdAt: -1 })
    res.status(200).json({ success: true, count: chefs.length, data: chefs })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET single chef
router.get('/:id', async (req, res) => {
  try {
    const chef = await Chef.findById(req.params.id)
    if (!chef) {
      return res.status(404).json({ success: false, message: 'Chef not found' })
    }
    res.status(200).json({ success: true, data: chef })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create chef
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, role, experience, specialization, bio, status, order } =
      req.body

    if (!name || !role || !experience || !specialization) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, role, experience and specialization',
      })
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

    const newChef = await Chef.create({
      name,
      role,
      experience,
      specialization,
      bio: bio || '',
      image: imageUrl,
      status: status || 'Active',
      order: Number(order) || 0,
    })

    res.status(201).json({
      success: true,
      message: 'Chef added successfully',
      data: newChef,
    })
  } catch (error) {
    console.error('Error creating chef:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT update chef
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, role, experience, specialization, bio, status, order } =
      req.body

    const updateData = {
      name,
      role,
      experience,
      specialization,
      bio,
      status,
      order: Number(order) || 0,
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`

      const oldChef = await Chef.findById(req.params.id)
      if (oldChef && oldChef.image) {
        const oldPath = path.join(__dirname, '..', '..', oldChef.image)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    const updatedChef = await Chef.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedChef) {
      return res.status(404).json({ success: false, message: 'Chef not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Chef updated successfully',
      data: updatedChef,
    })
  } catch (error) {
    console.error('Error updating chef:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE chef
router.delete('/:id', async (req, res) => {
  try {
    const chef = await Chef.findById(req.params.id)

    if (!chef) {
      return res.status(404).json({ success: false, message: 'Chef not found' })
    }

    if (chef.image) {
      const imagePath = path.join(__dirname, '..', '..', chef.image)
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
    }

    await Chef.findByIdAndDelete(req.params.id)

    res.status(200).json({ success: true, message: 'Chef deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router