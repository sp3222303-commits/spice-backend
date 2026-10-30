const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const MenuItem = require('../models/MenuItem')

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

router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, count: items.length, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ success: false, message: 'Dish not found' })
    }
    res.status(200).json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, status } = req.body

    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, description, price and category',
      })
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

    const newItem = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category,
      status: status || 'Available',
      image: imageUrl,
    })

    res.status(201).json({
      success: true,
      message: 'Dish added successfully',
      data: newItem,
    })
  } catch (error) {
    console.error('Error creating dish:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, status } = req.body

    const updateData = {
      name,
      description,
      price: Number(price),
      category,
      status,
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`

      const oldItem = await MenuItem.findById(req.params.id)
      if (oldItem && oldItem.image) {
        const oldPath = path.join(__dirname, '..', '..', oldItem.image)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Dish not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Dish updated successfully',
      data: updatedItem,
    })
  } catch (error) {
    console.error('Error updating dish:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ success: false, message: 'Dish not found' })
    }

    if (item.image) {
      const imagePath = path.join(__dirname, '..', '..', item.image)
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
    }

    await MenuItem.findByIdAndDelete(req.params.id)

    res.status(200).json({ success: true, message: 'Dish deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router