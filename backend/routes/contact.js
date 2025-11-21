const express = require('express');
const router = express.Router();
const ContactSubmission = require('../models/ContactSubmission');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/contact/submit
 * @desc    Submit a contact form
 * @access  Public
 */
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create contact submission
    const contactSubmission = await ContactSubmission.create({
      name,
      email,
      phone,
      subject,
      message,
      category: category || 'general',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      data: {
        id: contactSubmission._id,
        createdAt: contactSubmission.createdAt
      }
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again later.'
    });
  }
});

/**
 * @route   GET /api/contact/submissions
 * @desc    Get all contact submissions (Admin only)
 * @access  Private/Admin
 */
router.get('/submissions', protect, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      category, 
      search,
      priority,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    // Execute query with pagination
    const submissions = await ContactSubmission.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('notes.addedBy', 'name email');

    // Get total count
    const total = await ContactSubmission.countDocuments(filter);

    // Get statistics
    const stats = {
      total: await ContactSubmission.countDocuments(),
      new: await ContactSubmission.countDocuments({ status: 'new' }),
      inProgress: await ContactSubmission.countDocuments({ status: 'in-progress' }),
      resolved: await ContactSubmission.countDocuments({ status: 'resolved' }),
      closed: await ContactSubmission.countDocuments({ status: 'closed' }),
      byCategory: await ContactSubmission.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      byPriority: await ContactSubmission.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submissions'
    });
  }
});

/**
 * @route   PUT /api/contact/submissions/:id/status
 * @desc    Update contact submission status (Admin only)
 * @access  Private/Admin
 */
router.put('/submissions/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, priority, note } = req.body;

    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    // Update status
    if (status) {
      submission.status = status;
      if (status === 'resolved' || status === 'closed') {
        submission.resolvedAt = new Date();
        submission.resolvedBy = req.user._id;
      }
    }

    // Update priority
    if (priority) {
      submission.priority = priority;
    }

    // Add note if provided
    if (note) {
      submission.notes.push({
        note,
        addedBy: req.user._id,
        addedAt: new Date()
      });
    }

    await submission.save();

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update submission'
    });
  }
});

/**
 * @route   PUT /api/contact/submissions/:id/assign
 * @desc    Assign contact submission to admin (Admin only)
 * @access  Private/Admin
 */
router.put('/submissions/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'in-progress' },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Submission assigned successfully',
      data: submission
    });
  } catch (error) {
    console.error('Assign submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign submission'
    });
  }
});

/**
 * @route   DELETE /api/contact/submissions/:id
 * @desc    Delete contact submission (Admin only)
 * @access  Private/Admin
 */
router.delete('/submissions/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission'
    });
  }
});

module.exports = router;
