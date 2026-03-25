const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Funder = require('../models/Funder');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /api/funders — list all funders
router.get('/', async (req, res) => {
  try {
    const { round, type, status, sortBy = 'investmentDate', order = 'desc' } = req.query;
    const query = { userId: req.user._id };
    if (round) query.round = round;
    if (type) query.type = type;
    if (status) query.status = status;
    const funders = await Funder.find(query).sort({ [sortBy]: order === 'asc' ? 1 : -1 }).lean();
    res.json({ success: true, data: funders, count: funders.length });
  } catch (error) {
    logger.error('Get funders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/funders/summary — funding summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await Funder.getFundingSummary(req.user._id);
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Get funding summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/funders — add funder
router.post('/', async (req, res) => {
  try {
    const funder = await Funder.create({ ...req.body, userId: req.user._id });
    logger.info(`Funder created: ${funder._id} by user: ${req.user._id}`);
    res.status(201).json({ success: true, data: funder });
  } catch (error) {
    logger.error('Create funder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/funders/:id — single funder
router.get('/:id', async (req, res) => {
  try {
    const funder = await Funder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!funder) return res.status(404).json({ success: false, message: 'Funder not found' });
    res.json({ success: true, data: funder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/funders/:id — update funder
router.put('/:id', async (req, res) => {
  try {
    const funder = await Funder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!funder) return res.status(404).json({ success: false, message: 'Funder not found' });
    res.json({ success: true, data: funder });
  } catch (error) {
    logger.error('Update funder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/funders/:id — delete funder
router.delete('/:id', async (req, res) => {
  try {
    const funder = await Funder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!funder) return res.status(404).json({ success: false, message: 'Funder not found' });
    res.json({ success: true, message: 'Funder deleted' });
  } catch (error) {
    logger.error('Delete funder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
