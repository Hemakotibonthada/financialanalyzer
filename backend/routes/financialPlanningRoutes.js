// ============================================================================
// Financial Planning Routes — Enterprise Planning API
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const controller = require('../controllers/financialPlanningController');

// Investment Calculators
router.post('/sip', authenticate, controller.calculateSIP);
router.post('/lumpsum', authenticate, controller.calculateLumpsum);
router.post('/sip-for-goal', authenticate, controller.sipForGoal);
router.post('/sip-delay', authenticate, controller.sipDelayCost);
router.post('/emi', authenticate, controller.calculateEMI);

// Planning Tools
router.post('/retirement', authenticate, controller.getRetirementPlan);
router.post('/debt-payoff', authenticate, controller.getDebtPayoff);
router.post('/emergency-fund', authenticate, controller.getEmergencyFundPlan);
router.post('/wealth-projection', authenticate, controller.getWealthProjection);
router.post('/insurance', authenticate, controller.getInsuranceNeeds);

// Tax
router.post('/tax', authenticate, controller.calculateTax);
router.post('/tax-tips', authenticate, controller.getTaxTips);

// Comprehensive
router.post('/comprehensive', authenticate, controller.getComprehensivePlan);

module.exports = router;
