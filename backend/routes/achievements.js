// ============================================================
// Financial Analyzer - Achievements & Gamification Routes
// Feature #92: Gamification API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const AchievementService = require('../services/achievementService');

// GET /api/achievements/profile - Get user gamification profile
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await AchievementService.getUserProfile(req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/achievements/check - Check for new achievements after action
router.post('/check', auth, async (req, res) => {
  try {
    const { actionType, actionData } = req.body;
    const result = await AchievementService.checkNewAchievements(
      req.user._id || req.user.id,
      actionType,
      actionData || {}
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/achievements/leaderboard - Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const type = req.query.type || 'points';
    const limit = parseInt(req.query.limit) || 20;
    const result = await AchievementService.getLeaderboard(type, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/achievements/challenges - Get available challenges
router.get('/challenges', auth, (req, res) => {
  try {
    const result = AchievementService.getChallenges();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/achievements/daily - Get daily quests
router.get('/daily', auth, (req, res) => {
  try {
    const result = AchievementService.getDailyQuests();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
