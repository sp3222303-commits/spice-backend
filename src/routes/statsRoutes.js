const express = require('express')
const router = express.Router()

const MenuItem = require('../models/MenuItem')
const RegionalDish = require('../models/RegionalDish')
const Chef = require('../models/Chef')
const Testimonial = require('../models/Testimonial')
const GalleryImage = require('../models/GalleryImage')
const Banner = require('../models/Banner')
const FAQ = require('../models/FAQ')

// @route  GET /api/stats
// @desc   Get dashboard statistics from all collections
router.get('/', async (req, res) => {
  try {
    const [
      menuItemsTotal,
      menuItemsAvailable,
      regionalDishesTotal,
      chefsTotal,
      chefsActive,
      testimonialsTotal,
      testimonialsActive,
      galleryTotal,
      bannersTotal,
      bannersActive,
      faqsTotal,
      faqsActive,
    ] = await Promise.all([
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ status: 'Available' }),
      RegionalDish.countDocuments(),
      Chef.countDocuments(),
      Chef.countDocuments({ status: 'Active' }),
      Testimonial.countDocuments(),
      Testimonial.countDocuments({ status: 'Active' }),
      GalleryImage.countDocuments(),
      Banner.countDocuments(),
      Banner.countDocuments({ status: 'Active' }),
      FAQ.countDocuments(),
      FAQ.countDocuments({ status: 'Active' }),
    ])

    // Total items across menu + regional
    const totalItems = menuItemsTotal + regionalDishesTotal

    // Get recent items (for "Recent Activity" section)
    const recentMenuItems = await MenuItem.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name category image createdAt')

    const recentRegionalDishes = await RegionalDish.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name state category image createdAt')

    const recentChefs = await Chef.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name role image createdAt')

    res.status(200).json({
      success: true,
      data: {
        stats: {
          menuItems: {
            total: menuItemsTotal,
            available: menuItemsAvailable,
            unavailable: menuItemsTotal - menuItemsAvailable,
          },
          regionalDishes: {
            total: regionalDishesTotal,
          },
          chefs: {
            total: chefsTotal,
            active: chefsActive,
            inactive: chefsTotal - chefsActive,
          },
          testimonials: {
            total: testimonialsTotal,
            active: testimonialsActive,
            inactive: testimonialsTotal - testimonialsActive,
          },
          gallery: {
            total: galleryTotal,
          },
          banners: {
            total: bannersTotal,
            active: bannersActive,
            inactive: bannersTotal - bannersActive,
          },
          faqs: {
            total: faqsTotal,
            active: faqsActive,
            inactive: faqsTotal - faqsActive,
          },
          totalItems,
        },
        recent: {
          menuItems: recentMenuItems,
          regionalDishes: recentRegionalDishes,
          chefs: recentChefs,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router