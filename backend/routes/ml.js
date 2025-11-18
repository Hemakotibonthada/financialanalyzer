const express = require('express');
const router = express.Router();
const MLModel = require('../models/MLModel');
const Prediction = require('../models/Prediction');
const Anomaly = require('../models/Anomaly');
const mlService = require('../services/mlService');
const { authenticate } = require('../middleware/auth');

// ML Model Routes
router.post('/models', authenticate, async (req, res) => {
  try {
    const model = new MLModel({ ...req.body, userId: req.user._id });
    await model.save();
    res.status(201).json(model);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/models', authenticate, async (req, res) => {
  try {
    const models = await MLModel.find({ userId: req.user._id });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/models/:id', authenticate, async (req, res) => {
  try {
    const model = await MLModel.findOne({ _id: req.params.id, userId: req.user._id });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/models/:id', authenticate, async (req, res) => {
  try {
    const model = await MLModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/models/:id', authenticate, async (req, res) => {
  try {
    const model = await MLModel.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prediction Routes
router.post('/predictions/spending', authenticate, async (req, res) => {
  try {
    const { category, days } = req.body;
    const prediction = await mlService.predictSpending(req.user._id, category, days);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/predictions/budget', authenticate, async (req, res) => {
  try {
    const { category, months } = req.body;
    const forecast = await mlService.forecastBudget(req.user._id, category, months);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/predictions', authenticate, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/predictions/:id', authenticate, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/predictions/:id/verify', authenticate, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    
    await prediction.verify(req.body.actualValue);
    await prediction.save();
    
    res.json(prediction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/predictions/stats/accuracy', authenticate, async (req, res) => {
  try {
    const { predictionType } = req.query;
    const stats = await Prediction.getAccuracyStats(req.user._id, predictionType);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anomaly Detection Routes
router.post('/anomalies/detect', authenticate, async (req, res) => {
  try {
    const anomalies = await mlService.detectAnomalies(req.user._id);
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/anomalies/detect-fraud', authenticate, async (req, res) => {
  try {
    const frauds = await mlService.detectFraud(req.user._id);
    res.json(frauds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const { status, severity } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    const anomalies = await Anomaly.find(query)
      .populate('transactionId')
      .sort({ createdAt: -1 });
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/anomalies/active', authenticate, async (req, res) => {
  try {
    const anomalies = await Anomaly.getActiveAnomalies(req.user._id);
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/anomalies/stats', authenticate, async (req, res) => {
  try {
    const stats = await Anomaly.getAnomalyStats(req.user._id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/anomalies/:id/resolve', authenticate, async (req, res) => {
  try {
    const anomaly = await Anomaly.findOne({ _id: req.params.id, userId: req.user._id });
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });
    
    await anomaly.markAsResolved(req.body.resolution);
    await anomaly.save();
    
    res.json(anomaly);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/anomalies/:id/mark-fraud', authenticate, async (req, res) => {
  try {
    const anomaly = await Anomaly.findOne({ _id: req.params.id, userId: req.user._id });
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });
    
    await anomaly.markAsFraud(req.body.reportedToAuthorities);
    await anomaly.save();
    
    res.json(anomaly);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
