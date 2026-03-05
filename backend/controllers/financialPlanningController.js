// ============================================================================
// Financial Planning Controller — Enterprise Financial Planning API
// ============================================================================

const {
  RetirementPlanner,
  InvestmentCalculator,
  DebtPayoffOptimizer,
  EmergencyFundPlanner,
  TaxOptimizer,
  WealthProjector,
  InsuranceCalculator,
  FinancialPlanGenerator,
  FinancialMath,
} = require('../services/financialPlanningService');
const logger = require('../utils/logger');

const financialPlanningController = {
  // POST /api/planning/retirement — Retirement planning
  async getRetirementPlan(req, res) {
    try {
      const planner = new RetirementPlanner(req.body);
      const result = planner.calculate();
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/sip — SIP returns calculator
  async calculateSIP(req, res) {
    try {
      const { monthlySIP = 10000, annualReturn = 0.12, years = 10, annualStepUp = 0 } = req.body;
      const result = InvestmentCalculator.sipReturns(monthlySIP, annualReturn, years, annualStepUp);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/lumpsum — Lumpsum investment
  async calculateLumpsum(req, res) {
    try {
      const { amount = 100000, annualReturn = 0.12, years = 10 } = req.body;
      const result = InvestmentCalculator.lumpsumReturns(amount, annualReturn, years);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/sip-for-goal — SIP needed for a target
  async sipForGoal(req, res) {
    try {
      const { targetAmount = 5000000, annualReturn = 0.12, years = 10 } = req.body;
      const result = InvestmentCalculator.sipForGoal(targetAmount, annualReturn, years);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/sip-delay — Impact of delaying SIP
  async sipDelayCost(req, res) {
    try {
      const { monthlySIP = 10000, annualReturn = 0.12, totalYears = 20, delayYears = 5 } = req.body;
      const result = InvestmentCalculator.sipDelayCost(monthlySIP, annualReturn, totalYears, delayYears);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/debt-payoff — Debt payoff strategies
  async getDebtPayoff(req, res) {
    try {
      const { debts = [], extraMonthlyPayment = 0 } = req.body;
      const optimizer = new DebtPayoffOptimizer(debts);
      const result = optimizer.compare(extraMonthlyPayment);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/emergency-fund — Emergency fund calculator
  async getEmergencyFundPlan(req, res) {
    try {
      const planner = new EmergencyFundPlanner();
      const result = planner.calculate(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/tax — Tax calculation & optimization
  async calculateTax(req, res) {
    try {
      const { grossIncome, deductions = {} } = req.body;
      const optimizer = new TaxOptimizer();
      const result = optimizer.calculateTax(grossIncome, deductions);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/tax-tips — Tax saving recommendations
  async getTaxTips(req, res) {
    try {
      const { income = 1200000, currentDeductions = {} } = req.body;
      const optimizer = new TaxOptimizer();
      const result = optimizer.getOptimizationTips(income, currentDeductions);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/wealth-projection — Long-term wealth forecast
  async getWealthProjection(req, res) {
    try {
      const projector = new WealthProjector();
      const result = projector.project(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/insurance — Insurance needs analysis
  async getInsuranceNeeds(req, res) {
    try {
      const calculator = new InsuranceCalculator();
      const life = calculator.calculateLifeInsurance(req.body);
      const health = calculator.calculateHealthInsurance(req.body);
      res.json({ success: true, data: { life, health } });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/comprehensive — Full financial plan
  async getComprehensivePlan(req, res) {
    try {
      const generator = new FinancialPlanGenerator();
      const result = generator.generate(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/planning/emi — EMI calculator
  async calculateEMI(req, res) {
    try {
      const { principal, annualRate, tenureMonths } = req.body;
      const result = FinancialMath.amortizationSchedule(principal, annualRate, tenureMonths);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Financial planning error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = financialPlanningController;
