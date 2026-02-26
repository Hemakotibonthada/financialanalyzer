const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Template = require('../models/Template');

router.use(authenticate);

// List templates (filterable by category, type)
router.get('/', async (req, res) => {
  try {
    const { category, type, tag, sort } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (type) {
      filter.type = type;
      if (type === 'user') filter.createdBy = req.user._id;
    } else {
      filter.$or = [{ isPublic: true }, { createdBy: req.user._id }];
    }
    if (tag) filter.tags = { $in: Array.isArray(tag) ? tag : [tag] };

    const sortOption = sort === 'popular' ? { usageCount: -1 }
      : sort === 'rating' ? { 'rating.average': -1 }
      : { createdAt: -1 };

    const templates = await Template.find(filter).sort(sortOption).populate('createdBy', 'name email');
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get template detail
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).populate('createdBy', 'name email');
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create custom template
router.post('/', async (req, res) => {
  try {
    const template = new Template({ ...req.body, type: 'user', createdBy: req.user._id });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Apply template to user's data
router.post('/:id/apply', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    template.usageCount += 1;
    await template.save();

    res.json({
      success: true,
      data: { config: template.config, category: template.category, name: template.name },
      message: 'Template applied successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rate a template
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const newCount = template.rating.count + 1;
    const newAvg = ((template.rating.average * template.rating.count) + rating) / newCount;
    template.rating = { average: Math.round(newAvg * 10) / 10, count: newCount };
    await template.save();

    res.json({ success: true, data: template.rating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user's custom template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id, type: 'user' });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found or not authorized' });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
