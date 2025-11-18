const express = require('express');
const router = express.Router();
const advancedSearchService = require('../services/advancedSearchService');
const { authenticate } = require('../middleware/auth');

// Universal search
router.get('/universal', authenticate, async (req, res) => {
  try {
    const { q, limit, offset } = req.query;
    const results = await advancedSearchService.universalSearch(
      req.user._id,
      q,
      {
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Natural language search
router.post('/natural-language', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    const results = await advancedSearchService.processNaturalLanguageQuery(
      req.user._id,
      query
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search suggestions
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const suggestions = await advancedSearchService.getSearchSuggestions(req.user._id, q);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
