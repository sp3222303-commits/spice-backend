const express = require('express')
const router = express.Router()
const FAQ = require('../models/FAQ')

// GET all FAQs
router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 })
    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET single FAQ
router.get('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id)
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' })
    }
    res.status(200).json({ success: true, data: faq })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create FAQ
router.post('/', async (req, res) => {
  try {
    const { question, answer, category, status, order } = req.body

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Please provide question and answer',
      })
    }

    const newFAQ = await FAQ.create({
      question,
      answer,
      category: category || 'General',
      status: status || 'Active',
      order: Number(order) || 0,
    })

    res.status(201).json({
      success: true,
      message: 'FAQ added successfully',
      data: newFAQ,
    })
  } catch (error) {
    console.error('Error creating FAQ:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT update FAQ
router.put('/:id', async (req, res) => {
  try {
    const { question, answer, category, status, order } = req.body

    const updateData = {
      question,
      answer,
      category,
      status,
      order: Number(order) || 0,
    }

    const updatedFAQ = await FAQ.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    if (!updatedFAQ) {
      return res.status(404).json({ success: false, message: 'FAQ not found' })
    }

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: updatedFAQ,
    })
  } catch (error) {
    console.error('Error updating FAQ:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE FAQ
router.delete('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id)

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' })
    }

    await FAQ.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router