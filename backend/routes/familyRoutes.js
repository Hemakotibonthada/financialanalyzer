const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const FamilyMember = require('../models/FamilyMember');

router.use(authenticate);

// Add family member
router.post('/members', async (req, res) => {
  try {
    const member = new FamilyMember({ ...req.body, userId: req.user._id });
    await member.save();
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// List family members
router.get('/members', async (req, res) => {
  try {
    const { relationship, active } = req.query;
    const filter = { userId: req.user._id };
    if (relationship) filter.relationship = relationship;
    if (active !== undefined) filter.isActive = active === 'true';

    const members = await FamilyMember.find(filter).sort({ name: 1 });
    res.json({ success: true, data: members, count: members.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update family member
router.put('/members/:id', async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Remove family member (soft delete)
router.delete('/members/:id', async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Family budget overview
router.get('/budget', async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.user._id, isActive: true });
    const totalAllowance = members.reduce((sum, m) => sum + (m.allowance?.amount || 0), 0);
    const breakdown = members.map(m => ({
      id: m._id,
      name: m.name,
      relationship: m.relationship,
      allowance: m.allowance?.amount || 0,
      frequency: m.allowance?.frequency || 'monthly'
    }));
    res.json({ success: true, data: { totalAllowance, memberCount: members.length, breakdown } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update allowance
router.post('/allowance/:id', async (req, res) => {
  try {
    const { amount, frequency } = req.body;
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { 'allowance.amount': amount, 'allowance.frequency': frequency, 'allowance.lastPaidAt': new Date() } },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Family spending breakdown
router.get('/spending', async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.user._id, isActive: true });
    const spending = members.map(m => ({
      id: m._id,
      name: m.name,
      relationship: m.relationship,
      role: m.role,
      allowance: m.allowance?.amount || 0,
      frequency: m.allowance?.frequency || 'monthly',
      lastPaid: m.allowance?.lastPaidAt || null
    }));
    const totalMonthly = spending.reduce((sum, s) => {
      const amt = s.allowance;
      if (s.frequency === 'daily') return sum + amt * 30;
      if (s.frequency === 'weekly') return sum + amt * 4;
      if (s.frequency === 'biweekly') return sum + amt * 2;
      if (s.frequency === 'monthly') return sum + amt;
      if (s.frequency === 'quarterly') return sum + amt / 3;
      if (s.frequency === 'yearly') return sum + amt / 12;
      return sum + amt;
    }, 0);
    res.json({ success: true, data: { spending, totalMonthly } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
