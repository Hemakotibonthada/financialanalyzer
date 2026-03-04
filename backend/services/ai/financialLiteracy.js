// ============================================================================
// Financial Literacy AI — Personalized Learning & Education Engine
// ============================================================================
// Context-aware financial education:
//  - Personalized learning paths based on financial behavior
//  - Concept explanations with real examples from user's data
//  - Quiz generation for financial literacy assessment
//  - Tips of the day with contextual relevance
//  - Jargon decoder for Indian financial terms
//  - Achievement-based gamification
// ============================================================================

const logger = require('../../utils/logger');

// ─── Knowledge Base ─────────────────────────────────────────────────
const CONCEPTS = {
  // Budgeting
  '50-30-20': {
    title: 'The 50/30/20 Budget Rule',
    category: 'budgeting',
    difficulty: 'beginner',
    explanation: 'A simple budgeting framework: allocate 50% of income to needs (rent, groceries, utilities), 30% to wants (dining, entertainment, shopping), and 20% to savings & investments.',
    realWorldExample: 'If you earn ₹50,000/month → ₹25,000 for needs, ₹15,000 for wants, ₹10,000 for savings.',
    actionStep: 'Calculate your current split and adjust spending to match this ratio.',
    indianContext: 'In India, rent often exceeds 30% in metros. Adjust to 60/20/20 if needed.',
    tags: ['budget', 'rule', 'allocation'],
  },
  'emergency-fund': {
    title: 'Emergency Fund',
    category: 'savings',
    difficulty: 'beginner',
    explanation: 'A cash reserve of 3-6 months of essential expenses kept in a liquid, easily accessible account. This protects you from unexpected events like job loss, medical emergencies, or urgent repairs.',
    realWorldExample: 'Monthly expenses of ₹30,000 → Emergency fund target: ₹90,000 to ₹1,80,000.',
    actionStep: 'Start with ₹1,000/month in a liquid fund. Increase as income grows.',
    indianContext: 'Keep in a savings account or liquid mutual fund for quick access. Not in FD (penalties for early withdrawal).',
    tags: ['emergency', 'savings', 'safety'],
  },
  'compound-interest': {
    title: 'Power of Compound Interest',
    category: 'investing',
    difficulty: 'beginner',
    explanation: 'Earning interest on your interest. Over time, your money grows exponentially rather than linearly. Einstein called it the "eighth wonder of the world."',
    realWorldExample: '₹10,000/month SIP at 12% for 20 years = ₹1 Crore! But only ₹24L invested.',
    actionStep: 'Start investing early — even small amounts compound significantly over time.',
    indianContext: 'PPF gives 7.1% compounded annually, tax-free. ELSS funds historically return 12-15%.',
    tags: ['compound', 'interest', 'growth', 'magic'],
  },
  'debt-to-income': {
    title: 'Debt-to-Income Ratio (DTI)',
    category: 'debt',
    difficulty: 'intermediate',
    explanation: 'The percentage of your monthly gross income that goes to debt payments (EMIs, loans). Banks use this to assess your creditworthiness.',
    realWorldExample: 'Income: ₹60,000, EMIs: ₹18,000 → DTI = 30%. Banks prefer DTI < 40%.',
    actionStep: 'Calculate your DTI. If above 40%, prioritize paying off high-interest debt.',
    indianContext: 'Indian banks typically reject loans if DTI > 50-55%. Maintain DTI < 36% for best rates.',
    tags: ['debt', 'ratio', 'loan', 'emi'],
  },
  'sip': {
    title: 'Systematic Investment Plan (SIP)',
    category: 'investing',
    difficulty: 'beginner',
    explanation: 'A method of investing a fixed amount in mutual funds at regular intervals (usually monthly). Benefits from rupee cost averaging — you buy more units when prices are low and fewer when high.',
    realWorldExample: '₹5,000/month SIP in Nifty 50 index fund for 10 years at 12% returns = ~₹11.6L (invested ₹6L).',
    actionStep: 'Start a SIP with as little as ₹500/month. Increase by 10% annually.',
    indianContext: 'Direct plans have lower expense ratios than regular plans. Use Groww, Zerodha, or AMC websites.',
    tags: ['sip', 'mutual fund', 'invest', 'systematic'],
  },
  'section-80c': {
    title: 'Section 80C Tax Deductions',
    category: 'tax',
    difficulty: 'intermediate',
    explanation: 'Allows deduction up to ₹1,50,000 from taxable income. Eligible investments: PPF, ELSS, LIC, NPS (partial), EPF, NSC, tax-saving FD, children\'s tuition fees, home loan principal.',
    realWorldExample: 'If in 30% bracket: ₹1.5L in 80C saves ₹46,800 in taxes (including cess).',
    actionStep: 'Invest in ELSS + PPF to maximize returns while saving taxes.',
    indianContext: 'ELSS: 3-year lock-in, ~12-15% returns. PPF: 15-year lock-in, 7.1% guaranteed, tax-free maturity.',
    tags: ['tax', '80c', 'deduction', 'save tax'],
  },
  'inflation': {
    title: 'Inflation Impact on Savings',
    category: 'investing',
    difficulty: 'intermediate',
    explanation: 'Inflation erodes the purchasing power of money over time. If inflation is 6% and your savings earn 4%, you\'re losing 2% in real terms. Your investments must beat inflation.',
    realWorldExample: '₹100 today will buy what ₹56 buys in 10 years at 6% inflation.',
    actionStep: 'Ensure your long-term investments return at least 2-3% above inflation rate.',
    indianContext: 'India\'s CPI inflation averages 5-6%. FD returns (6-7%) barely beat it. Equity (12-15%) clearly beats it.',
    tags: ['inflation', 'purchasing power', 'real returns'],
  },
  'asset-allocation': {
    title: 'Asset Allocation',
    category: 'investing',
    difficulty: 'intermediate',
    explanation: 'Diversifying investments across asset classes (equity, debt, gold, real estate) to balance risk and return. Your allocation should match your age, goals, and risk tolerance.',
    realWorldExample: 'Age 30: 70% equity, 20% debt, 10% gold. Age 50: 40% equity, 45% debt, 15% gold.',
    actionStep: 'Use the "100 minus age" rule for equity allocation as a starting point.',
    indianContext: 'Indians are traditionally over-invested in real estate and gold, under-invested in equity.',
    tags: ['asset', 'allocation', 'diversify', 'portfolio'],
  },
  'credit-score': {
    title: 'CIBIL Score & Credit Health',
    category: 'credit',
    difficulty: 'beginner',
    explanation: 'A number (300-900) representing your creditworthiness. Based on repayment history (35%), credit utilization (30%), credit age (15%), credit mix (10%), and inquiries (10%).',
    realWorldExample: 'Score 750+: Best interest rates. 650-749: Standard rates. Below 650: May be rejected.',
    actionStep: 'Check free CIBIL score quarterly. Pay bills on time. Keep credit utilization below 30%.',
    indianContext: 'CIBIL is the primary bureau in India. Free annual report from cibil.com. Banks check CIBIL for all loans.',
    tags: ['cibil', 'credit score', 'loan', 'creditworthy'],
  },
  'hra': {
    title: 'HRA Tax Exemption',
    category: 'tax',
    difficulty: 'intermediate',
    explanation: 'House Rent Allowance exemption for salaried employees paying rent. Exempt amount is least of: actual HRA received, 50% of salary (metro) or 40% (non-metro), or rent paid minus 10% of salary.',
    realWorldExample: 'Salary: ₹50K, HRA: ₹20K, Rent: ₹15K, Metro → Exempt: min(20K, 25K, 10K) = ₹10K/month.',
    actionStep: 'Get rent receipts from landlord. Can claim even if paying rent to parents (with their PAN).',
    indianContext: 'Metro cities: Delhi, Mumbai, Chennai, Kolkata get 50% rule. Others get 40%.',
    tags: ['hra', 'rent', 'tax', 'exemption'],
  },
};

// ─── Daily Tips ─────────────────────────────────────────────────────
const DAILY_TIPS = [
  { tip: 'Set up automatic savings — transfer 20% of salary to a separate account on payday.', category: 'savings' },
  { tip: 'Review all subscriptions quarterly — cancel any you haven\'t used in 2 weeks.', category: 'spending' },
  { tip: 'The best time to start investing was yesterday. The second best time is today.', category: 'investing' },
  { tip: 'Track every expense for one week. You\'ll find at least ₹2,000 in unnecessary spending.', category: 'tracking' },
  { tip: 'Pay credit card bills in full every month to avoid 36-40% annual interest.', category: 'credit' },
  { tip: 'An emergency fund should be your #1 financial priority before investing.', category: 'safety' },
  { tip: 'Use UPI/online payments for tracking. Cash purchases are harder to track and optimize.', category: 'tracking' },
  { tip: 'Increase your SIP by 10% every year. This small step can 2x your final corpus!', category: 'investing' },
  { tip: 'Don\'t invest money you\'ll need within 3 years in equity. Use debt funds or FDs instead.', category: 'investing' },
  { tip: 'Health insurance isn\'t optional. A single hospitalization can wipe out years of savings.', category: 'insurance' },
  { tip: 'Compare interest rates from at least 3 banks before taking a loan. Difference of 0.5% saves lakhs.', category: 'debt' },
  { tip: 'Cook at home 5 days a week and eating out on weekends. You\'ll save ₹5,000-8,000/month.', category: 'spending' },
  { tip: 'TDS doesn\'t mean you don\'t owe taxes. File ITR to claim eligible refunds.', category: 'tax' },
  { tip: 'Keep 2-3 months of expenses in a high-interest savings account for instant access.', category: 'safety' },
  { tip: 'Don\'t time the market. Regular SIPs through ups and downs outperform lump sum timing attempts.', category: 'investing' },
  { tip: 'Create separate bank accounts for: spending, savings, investments, and emergency fund.', category: 'organization' },
  { tip: 'Review your financial goals every quarter and adjust contributions based on progress.', category: 'goals' },
  { tip: 'Use the debt avalanche method: pay off highest interest rate debt first to save money.', category: 'debt' },
  { tip: 'Your net worth = assets - liabilities. Track it monthly to see true financial progress.', category: 'tracking' },
  { tip: 'Max out PPF (₹1.5L/year) before considering other debt instruments. It\'s tax-free at 7.1%!', category: 'investing' },
];

// ─── Quiz Questions ─────────────────────────────────────────────────
const QUIZ_BANK = [
  {
    question: 'What is the recommended emergency fund size?',
    options: ['1 month expenses', '3-6 months expenses', '1 year income', '₹50,000 fixed'],
    correct: 1,
    explanation: 'Financial experts recommend 3-6 months of essential expenses as an emergency fund.',
    category: 'savings',
  },
  {
    question: 'In the 50/30/20 rule, what does the 20% represent?',
    options: ['Rent', 'Entertainment', 'Savings & Investments', 'Food'],
    correct: 2,
    explanation: '50% needs, 30% wants, 20% savings & debt repayment.',
    category: 'budgeting',
  },
  {
    question: 'What is the maximum deduction under Section 80C?',
    options: ['₹1,00,000', '₹1,50,000', '₹2,00,000', '₹2,50,000'],
    correct: 1,
    explanation: 'Section 80C allows deduction up to ₹1,50,000 for investments in PPF, ELSS, LIC, etc.',
    category: 'tax',
  },
  {
    question: 'What CIBIL score is generally considered "good"?',
    options: ['300-500', '500-650', '650-750', '750+'],
    correct: 3,
    explanation: 'A CIBIL score of 750+ is considered excellent and gets the best interest rates.',
    category: 'credit',
  },
  {
    question: 'What does SIP stand for?',
    options: ['Savings Investment Plan', 'Systematic Investment Plan', 'Standard Interest Payment', 'Smart Investment Portfolio'],
    correct: 1,
    explanation: 'Systematic Investment Plan — investing fixed amounts at regular intervals in mutual funds.',
    category: 'investing',
  },
  {
    question: 'At 12% annual returns, how long does it take to double your money?',
    options: ['3 years', '6 years', '8 years', '12 years'],
    correct: 1,
    explanation: 'Rule of 72: 72 ÷ 12 = 6 years. This is the "Rule of 72" for estimating doubling time.',
    category: 'investing',
  },
  {
    question: 'Which type of debt should you pay off first?',
    options: ['Smallest balance', 'Largest balance', 'Highest interest rate', 'Newest loan'],
    correct: 2,
    explanation: 'Mathematically, paying highest interest first (avalanche method) saves the most money.',
    category: 'debt',
  },
  {
    question: 'What is the ideal Debt-to-Income ratio?',
    options: ['Below 20%', 'Below 36%', 'Below 50%', 'Below 70%'],
    correct: 1,
    explanation: 'Financial experts recommend keeping DTI below 36% for financial health.',
    category: 'debt',
  },
];

// ─── Jargon Decoder ─────────────────────────────────────────────────
const JARGON = {
  'nav': 'Net Asset Value — the per-unit price of a mutual fund.',
  'aum': 'Assets Under Management — total money managed by a fund.',
  'cagr': 'Compound Annual Growth Rate — average annual return considering compounding.',
  'pe ratio': 'Price to Earnings — stock price divided by earnings per share. Lower = potentially cheaper.',
  'exit load': 'Fee charged when you withdraw from a mutual fund before a specified period.',
  'expense ratio': 'Annual fee charged by mutual fund for management. Lower is better. Direct < Regular.',
  'elss': 'Equity Linked Savings Scheme — tax-saving mutual fund under 80C with 3-year lock-in.',
  'nfo': 'New Fund Offer — when a new mutual fund scheme is launched.',
  'ipo': 'Initial Public Offering — when a company first sells shares to the public.',
  'demat': 'Dematerialized account — electronic holding of shares and securities.',
  'nifty': 'Nifty 50 — index of top 50 companies on NSE by market cap.',
  'sensex': 'Sensitive Index — index of top 30 companies on BSE.',
  'dii': 'Domestic Institutional Investors — Indian mutual funds, insurance companies investing.',
  'fii': 'Foreign Institutional Investors — foreign entities investing in Indian markets.',
  'repo rate': 'Rate at which RBI lends to banks. Higher repo = higher loan interest rates.',
  'gdp': 'Gross Domestic Product — total value of goods/services produced in a country.',
  'ulip': 'Unit Linked Insurance Plan — insurance + investment combo. Usually high charges.',
  'tds': 'Tax Deducted at Source — tax deducted before you receive income.',
  'itr': 'Income Tax Return — annual filing to report income and pay/claim refund.',
  'gst': 'Goods and Services Tax — indirect tax on supply of goods and services.',
};

class FinancialLiteracyAI {
  /**
   * Get personalized learning path based on financial behavior
   */
  getLearningPath(financialProfile) {
    const { savingsRate = 0, hasDebt = false, hasInvestments = false, hasBudget = false } = financialProfile;
    const path = [];

    // Stage 1: Basics
    if (!hasBudget) {
      path.push({ concept: '50-30-20', reason: 'Start with a budget framework', priority: 1 });
    }

    // Stage 2: Safety net
    if (savingsRate < 10) {
      path.push({ concept: 'emergency-fund', reason: 'Build your financial safety net', priority: 2 });
    }

    // Stage 3: Debt management
    if (hasDebt) {
      path.push({ concept: 'debt-to-income', reason: 'Understand and manage your debt burden', priority: 3 });
    }

    // Stage 4: Tax optimization
    path.push({ concept: 'section-80c', reason: 'Save taxes while building wealth', priority: 4 });
    path.push({ concept: 'hra', reason: 'Optimize your salary structure', priority: 5 });

    // Stage 5: Investing
    if (!hasInvestments) {
      path.push({ concept: 'sip', reason: 'Start your investment journey', priority: 6 });
      path.push({ concept: 'compound-interest', reason: 'Understand the power of time', priority: 7 });
    }

    // Stage 6: Advanced
    path.push({ concept: 'asset-allocation', reason: 'Optimize your portfolio', priority: 8 });
    path.push({ concept: 'inflation', reason: 'Protect your wealth from inflation', priority: 9 });
    path.push({ concept: 'credit-score', reason: 'Maintain access to cheap credit', priority: 10 });

    return {
      path: path.map(p => ({ ...p, content: CONCEPTS[p.concept] || {} })),
      totalConcepts: path.length,
      estimatedTime: `${path.length * 5} minutes`,
    };
  }

  /**
   * Get concept explanation
   */
  getConcept(conceptId) {
    return CONCEPTS[conceptId] || null;
  }

  /**
   * Get all concepts for a category
   */
  getConceptsByCategory(category) {
    return Object.entries(CONCEPTS)
      .filter(([, c]) => c.category === category)
      .map(([id, c]) => ({ id, ...c }));
  }

  /**
   * Get daily tip (contextual)
   */
  getDailyTip(dayOfYear = null) {
    const day = dayOfYear || Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = day % DAILY_TIPS.length;
    return DAILY_TIPS[index];
  }

  /**
   * Generate quiz
   */
  generateQuiz(category = null, count = 5) {
    let pool = category ? QUIZ_BANK.filter(q => q.category === category) : [...QUIZ_BANK];
    
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return {
      questions: pool.slice(0, Math.min(count, pool.length)).map((q, i) => ({
        id: i + 1,
        question: q.question,
        options: q.options,
        category: q.category,
      })),
      answers: pool.slice(0, Math.min(count, pool.length)).map((q, i) => ({
        id: i + 1,
        correct: q.correct,
        explanation: q.explanation,
      })),
    };
  }

  /**
   * Evaluate quiz answers
   */
  evaluateQuiz(userAnswers, correctAnswers) {
    let score = 0;
    const results = userAnswers.map((answer, i) => {
      const correct = correctAnswers[i];
      const isCorrect = answer === correct?.correct;
      if (isCorrect) score++;
      return {
        questionId: i + 1,
        userAnswer: answer,
        correctAnswer: correct?.correct,
        isCorrect,
        explanation: correct?.explanation,
      };
    });

    const percentage = userAnswers.length > 0 ? Math.round(score / userAnswers.length * 100) : 0;

    return {
      score,
      total: userAnswers.length,
      percentage,
      grade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'D',
      results,
      feedback: percentage >= 80
        ? '🌟 Excellent financial literacy! You\'re well-equipped to make smart money decisions.'
        : percentage >= 60
        ? '👍 Good understanding! Review the concepts you missed to strengthen your knowledge.'
        : '📚 Keep learning! Financial literacy is a journey. Review the explanations and try again.',
    };
  }

  /**
   * Decode financial jargon
   */
  decodeJargon(term) {
    const lower = term.toLowerCase().trim();
    return JARGON[lower] || `I don't have a definition for "${term}" yet. Try terms like NAV, SIP, ELSS, CIBIL, etc.`;
  }

  /**
   * Search jargon
   */
  searchJargon(query) {
    const lower = query.toLowerCase();
    return Object.entries(JARGON)
      .filter(([term, def]) => term.includes(lower) || def.toLowerCase().includes(lower))
      .map(([term, definition]) => ({ term: term.toUpperCase(), definition }));
  }

  /**
   * Get all concepts
   */
  getAllConcepts() {
    return Object.entries(CONCEPTS).map(([id, concept]) => ({ id, ...concept }));
  }
}

module.exports = new FinancialLiteracyAI();
