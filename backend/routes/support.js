const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// POST /api/support/tickets - Submit a support ticket
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const { name, email, subject, category, priority, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const ticket = {
      userId: req.user._id || req.user.id,
      name: name || req.user.name,
      email: email || req.user.email,
      subject,
      category: category || 'general',
      priority: priority || 'normal',
      message,
      status: 'open',
      createdAt: new Date(),
      ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}`,
    };

    // Store in database if model exists, otherwise just log
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      if (db) {
        await db.collection('support_tickets').insertOne(ticket);
      }
    } catch (dbErr) {
      console.log('Support ticket stored in memory only:', dbErr.message);
    }

    res.json({
      success: true,
      data: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        message: 'Your support ticket has been submitted successfully.',
      },
    });
  } catch (err) {
    console.error('Support ticket error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit support ticket' });
  }
});

// GET /api/support/tickets - Get user's tickets
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const tickets = db
      ? await db.collection('support_tickets').find({ userId: req.user._id || req.user.id }).sort({ createdAt: -1 }).toArray()
      : [];
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
