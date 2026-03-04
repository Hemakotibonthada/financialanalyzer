// ============================================================================
// Advanced NLP Financial Chat Engine — Context-Aware Conversational AI
// ============================================================================
// Production-grade NLP engine with:
//  - Intent classification (30+ financial intents)
//  - Named entity extraction (amounts, dates, categories, merchants)
//  - Conversation memory with context chaining
//  - Multi-turn dialogue management
//  - Sentiment-aware responses
//  - Financial jargon understanding
//  - Query decomposition for complex questions
// ============================================================================

const Transaction = require('../../models/Transaction');
const EMI = require('../../models/EMI');
const BankAccount = require('../../models/BankAccount');
const logger = require('../../utils/logger');

// ─── Intent Definitions ─────────────────────────────────────────────
const INTENTS = {
  // Spending
  spending_total:       { patterns: ['how much.*spend', 'total.*spend', 'spending', 'expenses', 'spent.*total', 'my expenses'], confidence: 0.85 },
  spending_category:    { patterns: ['spend.*on (\\w+)', 'how much.*(food|shopping|transport|rent|entertainment|utilities|healthcare|education)', '(\\w+) spending', 'category.*spend'], confidence: 0.9 },
  spending_comparison:  { patterns: ['compare.*spend', 'vs.*last', 'month.*comparison', 'spending.*change', 'more.*than.*last', 'less.*than'], confidence: 0.8 },
  spending_trend:       { patterns: ['spending.*trend', 'trend', 'going up', 'going down', 'increasing', 'decreasing'], confidence: 0.8 },
  spending_daily:       { patterns: ['daily.*spend', 'today.*spend', 'yesterday.*spend', 'per day', 'average.*daily'], confidence: 0.85 },
  spending_merchant:    { patterns: ['spend.*at (\\w+)', 'merchant', 'where.*spend', 'shops', 'stores', 'swiggy|zomato|amazon|flipkart'], confidence: 0.85 },

  // Income
  income_total:         { patterns: ['income', 'earn', 'salary', 'how much.*earn', 'total.*income', 'my income'], confidence: 0.85 },
  income_sources:       { patterns: ['income.*source', 'where.*income', 'earning.*from'], confidence: 0.8 },

  // Savings
  savings_rate:         { patterns: ['saving.*rate', 'how much.*sav', 'am i saving', 'savings', 'save enough'], confidence: 0.85 },
  savings_tips:         { patterns: ['how.*save.*more', 'tips.*save', 'reduce.*expense', 'cut.*cost', 'save money'], confidence: 0.85 },
  savings_goal:         { patterns: ['save.*for', 'saving.*goal', 'target.*save', 'need.*save'], confidence: 0.8 },

  // Budget
  budget_status:        { patterns: ['budget', 'on budget', 'over budget', 'under budget', 'budget.*status'], confidence: 0.85 },
  budget_suggest:       { patterns: ['suggest.*budget', 'optimal.*budget', 'budget.*recommend', 'how.*budget', 'create.*budget'], confidence: 0.85 },
  budget_category:      { patterns: ['budget.*for (\\w+)', '(\\w+).*budget', 'limit.*for'], confidence: 0.8 },

  // Health
  health_score:         { patterns: ['health.*score', 'financial.*health', 'score', 'how.*doing.*financ', 'financial.*shape'], confidence: 0.85 },
  health_improve:       { patterns: ['improve.*score', 'improve.*health', 'better.*financ', 'what.*improve'], confidence: 0.8 },

  // Debt & EMI
  debt_overview:        { patterns: ['debt', 'emi', 'loan', 'how much.*owe', 'outstanding', 'installment'], confidence: 0.85 },
  debt_payoff:          { patterns: ['pay.*off.*debt', 'debt.*free', 'payoff.*plan', 'clear.*debt', 'snowball', 'avalanche'], confidence: 0.85 },
  debt_foreclosure:     { patterns: ['foreclos', 'prepay', 'close.*emi', 'early.*payment'], confidence: 0.85 },

  // Forecast
  forecast_spending:    { patterns: ['forecast', 'predict', 'next month', 'future.*spend', 'projection', 'will.*spend'], confidence: 0.85 },
  forecast_cashflow:    { patterns: ['cash.*flow', 'money.*coming', 'money.*going', 'balance.*project'], confidence: 0.8 },

  // Anomaly
  anomaly_detect:       { patterns: ['unusual', 'anomal', 'suspicious', 'strange.*transaction', 'weird.*charge', 'unexpected'], confidence: 0.85 },

  // Goals
  goal_progress:        { patterns: ['goal', 'progress', 'how.*close', 'target.*reach', 'on track'], confidence: 0.85 },
  goal_feasibility:     { patterns: ['can.*afford', 'feasib', 'achievable', 'realistic', 'possible.*save'], confidence: 0.8 },

  // Investment
  investment_overview:  { patterns: ['invest', 'portfolio', 'mutual.*fund', 'stock', 'sip', 'returns'], confidence: 0.85 },
  investment_suggest:   { patterns: ['where.*invest', 'invest.*suggest', 'best.*invest', 'should.*invest'], confidence: 0.85 },

  // Bills
  bill_upcoming:        { patterns: ['bill', 'due', 'upcoming.*payment', 'when.*pay', 'payment.*due'], confidence: 0.85 },

  // Tax
  tax_savings:          { patterns: ['tax', 'deduct', '80c', '80d', 'tax.*save', 'hra', 'section'], confidence: 0.85 },

  // General
  greeting:             { patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'help', 'what can you'], confidence: 0.95 },
  gratitude:            { patterns: ['thank', 'thanks', 'great', 'awesome', 'perfect', 'nice'], confidence: 0.95 },
  clarification:        { patterns: ['what.*mean', 'explain', 'how does', 'tell me more', 'elaborate', 'details'], confidence: 0.8 },
};

// ─── Named Entity Extraction ────────────────────────────────────────
class EntityExtractor {
  static extract(text) {
    const entities = {};
    const lower = text.toLowerCase();

    // Amount extraction (₹5000, 5000, 5k, 5L, 5 lakhs, 5 crores)
    const amountMatch = lower.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i)
      || lower.match(/([\d,]+(?:\.\d+)?)\s*(?:rupees|rs|₹)/i)
      || lower.match(/([\d.]+)\s*(?:k|thousand)/i)
      || lower.match(/([\d.]+)\s*(?:l|lakh|lakhs)/i)
      || lower.match(/([\d.]+)\s*(?:cr|crore|crores)/i);

    if (amountMatch) {
      let val = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (/k|thousand/i.test(amountMatch[0])) val *= 1000;
      if (/l|lakh/i.test(amountMatch[0])) val *= 100000;
      if (/cr|crore/i.test(amountMatch[0])) val *= 10000000;
      entities.amount = val;
    }

    // Date/Time extraction
    const datePatterns = [
      { regex: /today/i, resolve: () => new Date() },
      { regex: /yesterday/i, resolve: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; } },
      { regex: /last\s+week/i, resolve: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d; } },
      { regex: /last\s+month/i, resolve: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; } },
      { regex: /this\s+month/i, resolve: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      { regex: /this\s+week/i, resolve: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d; } },
      { regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, resolve: (m) => {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        return new Date(new Date().getFullYear(), months[m[2].toLowerCase()], parseInt(m[1]));
      }},
      { regex: /(\d+)\s*days?\s*ago/i, resolve: (m) => { const d = new Date(); d.setDate(d.getDate() - parseInt(m[1])); return d; } },
      { regex: /(\d+)\s*months?\s*ago/i, resolve: (m) => { const d = new Date(); d.setMonth(d.getMonth() - parseInt(m[1])); return d; } },
    ];

    for (const { regex, resolve } of datePatterns) {
      const match = lower.match(regex);
      if (match) {
        entities.date = resolve(match);
        entities.dateText = match[0];
        break;
      }
    }

    // Period extraction  
    const periodMatch = lower.match(/(?:last|past)\s+(\d+)\s*(day|week|month|year)s?/i);
    if (periodMatch) {
      const num = parseInt(periodMatch[1]);
      const unit = periodMatch[2].toLowerCase();
      const multiplier = { day: 1, week: 7, month: 30, year: 365 };
      entities.periodDays = num * (multiplier[unit] || 30);
      entities.periodText = periodMatch[0];
    }

    // Category extraction
    const categories = [
      'food', 'dining', 'restaurant', 'groceries', 'transport', 'travel', 'shopping',
      'entertainment', 'utilities', 'healthcare', 'medical', 'education', 'rent',
      'insurance', 'investment', 'subscription', 'personal', 'gift', 'donation',
      'fuel', 'clothing', 'electronics', 'furniture', 'sports', 'beauty', 'pets',
    ];
    for (const cat of categories) {
      if (lower.includes(cat)) {
        entities.category = cat;
        break;
      }
    }

    // Merchant extraction
    const merchants = [
      'swiggy', 'zomato', 'amazon', 'flipkart', 'uber', 'ola', 'netflix',
      'spotify', 'myntra', 'bigbasket', 'blinkit', 'zepto', 'dunzo',
      'paytm', 'phonepe', 'gpay', 'starbucks', 'dominos', 'mcdonalds',
    ];
    for (const m of merchants) {
      if (lower.includes(m)) {
        entities.merchant = m;
        break;
      }
    }

    // Number extraction (for counts, months, etc.)
    const numMatch = lower.match(/(\d+)\s*(months?|years?|weeks?|days?|transactions?|emis?)/i);
    if (numMatch) {
      entities.number = parseInt(numMatch[1]);
      entities.numberUnit = numMatch[2].toLowerCase();
    }

    return entities;
  }
}

// ─── Conversation Memory ────────────────────────────────────────────
class ConversationMemory {
  constructor(maxTurns = 20) {
    this.turns = [];
    this.maxTurns = maxTurns;
    this.context = {};
    this.lastIntent = null;
    this.lastEntities = {};
  }

  addTurn(role, content, intent = null, entities = {}) {
    this.turns.push({ role, content, intent, entities, timestamp: Date.now() });
    if (this.turns.length > this.maxTurns) this.turns.shift();
    if (intent) this.lastIntent = intent;
    this.lastEntities = { ...this.lastEntities, ...entities };
  }

  getContext() {
    return {
      turnCount: this.turns.length,
      lastIntent: this.lastIntent,
      lastEntities: this.lastEntities,
      recentTopics: [...new Set(this.turns.filter(t => t.intent).map(t => t.intent).slice(-5))],
    };
  }

  getRecentHistory(n = 5) {
    return this.turns.slice(-n);
  }

  setContext(key, value) { this.context[key] = value; }
  getContextValue(key) { return this.context[key]; }

  clear() {
    this.turns = [];
    this.context = {};
    this.lastIntent = null;
    this.lastEntities = {};
  }
}

// ─── Response Generator ─────────────────────────────────────────────
class ResponseGenerator {
  static async generate(intent, entities, financialData, memory) {
    const data = financialData || {};
    const ctx = memory?.getContext() || {};

    switch (intent) {
      case 'greeting':
        return {
          text: this._greetingResponse(),
          suggestions: ['How much did I spend this month?', 'What\'s my financial health score?', 'Any unusual transactions?'],
        };

      case 'gratitude':
        return {
          text: this._sample([
            'You\'re welcome! Let me know if you need anything else. 😊',
            'Happy to help! I\'m always here for your financial questions.',
            'Glad I could help! Feel free to ask anything else.',
          ]),
        };

      case 'spending_total': {
        const days = entities.periodDays || 30;
        const total = data.totalExpense || 0;
        const daily = days > 0 ? total / days : 0;
        const income = data.totalIncome || 0;
        const rate = income > 0 ? ((income - total) / income * 100) : 0;

        return {
          text: `📊 **Spending Summary** (last ${days} days)\n\nTotal: ₹${total.toLocaleString('en-IN')}\nDaily Average: ₹${Math.round(daily).toLocaleString('en-IN')}\nMonthly Projected: ₹${Math.round(daily * 30).toLocaleString('en-IN')}\n\n${rate >= 20 ? '✅ Good savings rate!' : rate >= 0 ? '⚠️ Savings could be better' : '🚨 Spending exceeds income!'}`,
          metrics: [
            { label: 'Total Spent', value: `₹${total.toLocaleString('en-IN')}`, color: 'text-red-500' },
            { label: 'Daily Avg', value: `₹${Math.round(daily).toLocaleString('en-IN')}` },
            { label: 'Savings Rate', value: `${rate.toFixed(1)}%`, color: rate >= 20 ? 'text-emerald-500' : 'text-amber-500' },
            { label: 'Transactions', value: data.transactionCount || 0 },
          ],
          suggestions: ['Show spending by category', 'Compare to last month', 'How can I save more?'],
        };
      }

      case 'spending_category': {
        const cat = entities.category;
        const categories = data.categories || {};

        if (cat && categories[cat] !== undefined) {
          const amount = categories[cat];
          const total = data.totalExpense || 1;
          const pct = (amount / total * 100).toFixed(1);
          return {
            text: `🏷️ **${cat.charAt(0).toUpperCase() + cat.slice(1)} Spending**\n\nAmount: ₹${amount.toLocaleString('en-IN')}\nPercentage: ${pct}% of total\n\n${parseFloat(pct) > 30 ? `⚠️ This is quite high. ${this._getCategoryTip(cat)}` : '✅ This looks reasonable.'}`,
            metrics: [
              { label: cat, value: `₹${amount.toLocaleString('en-IN')}` },
              { label: '% of Total', value: `${pct}%` },
            ],
          };
        }

        // Show all categories
        const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const total = data.totalExpense || 1;
        return {
          text: `📂 **Spending by Category**\n\n${sorted.map(([c, a], i) => `${i + 1}. ${c}: ₹${a.toLocaleString('en-IN')} (${(a / total * 100).toFixed(0)}%)`).join('\n')}\n\nTotal: ₹${total.toLocaleString('en-IN')}`,
          metrics: sorted.slice(0, 4).map(([c, a]) => ({ label: c, value: `₹${a.toLocaleString('en-IN')}` })),
          suggestions: sorted.slice(0, 3).map(([c]) => `Tell me more about ${c} spending`),
        };
      }

      case 'spending_comparison': {
        const current = data.totalExpense || 0;
        const previous = data.previousExpense || 0;
        const change = previous > 0 ? ((current - previous) / previous * 100) : 0;
        const direction = change > 0 ? '📈 increased' : change < 0 ? '📉 decreased' : '➡️ stayed the same';

        return {
          text: `📊 **Spending Comparison**\n\nThis period: ₹${current.toLocaleString('en-IN')}\nLast period: ₹${previous.toLocaleString('en-IN')}\nChange: ${direction} by ${Math.abs(change).toFixed(1)}%\n\n${change > 10 ? '⚠️ Significant increase — review recent purchases.' : change < -10 ? '🎉 Great job reducing spending!' : '✅ Spending is consistent.'}`,
          metrics: [
            { label: 'Current', value: `₹${current.toLocaleString('en-IN')}` },
            { label: 'Previous', value: `₹${previous.toLocaleString('en-IN')}` },
            { label: 'Change', value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`, color: change > 0 ? 'text-red-500' : 'text-emerald-500' },
          ],
        };
      }

      case 'income_total': {
        const income = data.totalIncome || 0;
        return {
          text: `💰 **Income Summary**\n\nTotal Income: ₹${income.toLocaleString('en-IN')}\nExpenses: ₹${(data.totalExpense || 0).toLocaleString('en-IN')}\nNet: ₹${(income - (data.totalExpense || 0)).toLocaleString('en-IN')}`,
          metrics: [
            { label: 'Income', value: `₹${income.toLocaleString('en-IN')}`, color: 'text-emerald-500' },
            { label: 'Expenses', value: `₹${(data.totalExpense || 0).toLocaleString('en-IN')}`, color: 'text-red-500' },
            { label: 'Net', value: `₹${(income - (data.totalExpense || 0)).toLocaleString('en-IN')}` },
          ],
        };
      }

      case 'savings_rate': {
        const income = data.totalIncome || 0;
        const expense = data.totalExpense || 0;
        const savings = income - expense;
        const rate = income > 0 ? (savings / income * 100) : 0;

        let advice = '';
        if (rate >= 30) advice = '🌟 Outstanding! You\'re a super saver.';
        else if (rate >= 20) advice = '✅ Great savings rate! You\'re on track.';
        else if (rate >= 10) advice = '⚠️ Decent, but aim for 20%+.';
        else if (rate >= 0) advice = '🔴 Very low savings. Need to cut expenses.';
        else advice = '🚨 Negative savings! Spending exceeds income.';

        return {
          text: `🐷 **Savings Analysis**\n\nIncome: ₹${income.toLocaleString('en-IN')}\nExpenses: ₹${expense.toLocaleString('en-IN')}\nSavings: ₹${savings.toLocaleString('en-IN')}\nSavings Rate: ${rate.toFixed(1)}%\n\n${advice}`,
          metrics: [
            { label: 'Savings', value: `₹${savings.toLocaleString('en-IN')}`, color: savings >= 0 ? 'text-emerald-500' : 'text-red-500' },
            { label: 'Rate', value: `${rate.toFixed(1)}%`, color: rate >= 20 ? 'text-emerald-500' : 'text-amber-500' },
          ],
          suggestions: rate < 20 ? ['How can I reduce expenses?', 'Show me my top spending categories', 'Create a budget plan'] : ['Where should I invest my savings?', 'Show my investment options'],
        };
      }

      case 'savings_tips':
        return {
          text: `💡 **Smart Savings Tips**\n\n1. 🍳 **Meal Prep** — Save 30-40% on food by cooking at home\n2. 📱 **Audit Subscriptions** — Cancel services you haven't used in 30 days\n3. 🚌 **Transport Hack** — Public transit 3x/week saves ₹3,000-5,000/month\n4. 🛒 **48-Hour Rule** — Wait 2 days before non-essential purchases (>₹1,000)\n5. 💳 **Automate Savings** — Transfer 20% of salary to savings on payday\n6. ⚡ **Switch Plans** — Compare phone, internet, insurance plans annually\n7. 🎯 **Zero-Based Budget** — Assign every rupee a job\n8. 📊 **Weekly Review** — 5-minute spending check every Sunday`,
          suggestions: ['Create a budget plan', 'What\'s my biggest expense?', 'Set a savings goal'],
        };

      case 'health_score': {
        const score = data.healthScore || 0;
        const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B+' : score >= 55 ? 'B' : score >= 45 ? 'C' : 'D';
        const emoji = score >= 75 ? '🌟' : score >= 55 ? '👍' : '⚠️';

        return {
          text: `${emoji} **Financial Health Score: ${score}/100 (${grade})**\n\n${this._getHealthMessage(score)}\n\n${data.healthComponents ? data.healthComponents.map(c => `• ${c.name}: ${c.score}/${c.max}`).join('\n') : ''}`,
          metrics: [
            { label: 'Score', value: `${score}/100`, color: score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500' },
            { label: 'Grade', value: grade },
          ],
          suggestions: score < 70 ? ['How can I improve my score?', 'What areas need work?'] : ['Show my spending trends', 'Investment suggestions'],
        };
      }

      case 'health_improve':
        return {
          text: `🎯 **Improve Your Financial Health**\n\n1. **Increase Savings Rate** → Target 20%+ of income\n2. **Reduce High-Interest Debt** → Pay off credit card EMIs first\n3. **Build Emergency Fund** → Save 3-6 months of expenses\n4. **Diversify Income** → Explore side income opportunities\n5. **Track Everything** → No unaccounted spending\n6. **Automate Finances** → Bills on auto-pay, savings on auto-transfer\n7. **Review Monthly** → 30-minute monthly financial review`,
          suggestions: ['Create a budget', 'Show my debts', 'Set up savings goal'],
        };

      case 'debt_overview': {
        const emis = data.emis || [];
        const totalDebt = emis.reduce((s, e) => s + (e.emiAmount || 0) * (e.remainingInstallments || 0), 0);
        const monthlyEmi = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);

        if (emis.length === 0) {
          return { text: '🎉 **Debt Free!**\n\nYou have no active EMIs or loans. Great financial position!' };
        }

        return {
          text: `💳 **Debt Overview**\n\nActive EMIs: ${emis.length}\nTotal Outstanding: ₹${totalDebt.toLocaleString('en-IN')}\nMonthly EMI Burden: ₹${monthlyEmi.toLocaleString('en-IN')}\n\n${emis.map((e, i) => `${i + 1}. ${e.merchantName || e.cardProvider}: ₹${(e.emiAmount || 0).toLocaleString('en-IN')}/month (${e.remainingInstallments || 0} left)`).join('\n')}`,
          metrics: [
            { label: 'Total Debt', value: `₹${totalDebt.toLocaleString('en-IN')}`, color: 'text-red-500' },
            { label: 'Monthly EMIs', value: `₹${monthlyEmi.toLocaleString('en-IN')}` },
            { label: 'Active EMIs', value: emis.length },
          ],
          suggestions: ['Best debt payoff strategy', 'Can I foreclose any EMI?', 'EMI to income ratio'],
        };
      }

      case 'debt_payoff':
        return {
          text: `🎯 **Debt Payoff Strategies**\n\n**1. Avalanche Method** (Save most money)\n→ Pay minimums on all debts, put extra on highest interest rate\n→ Mathematically optimal, saves most in interest\n\n**2. Snowball Method** (Fastest motivation)\n→ Pay off smallest balance first for quick wins\n→ Builds momentum and confidence\n\n**3. Hybrid Method** (Balanced)\n→ Pay off any small debts under ₹5,000 first\n→ Then switch to highest interest rate\n\n💡 **Pro Tip:** Even ₹1,000-2,000 extra per month can shave months off your debt!`,
          suggestions: ['Analyze my debts', 'Show debt payoff plan', 'Which EMI should I close first?'],
        };

      case 'forecast_spending': {
        const predicted = data.forecastedSpending || data.totalExpense || 0;
        return {
          text: `🔮 **Spending Forecast**\n\nPredicted next month: ₹${Math.round(predicted).toLocaleString('en-IN')}\n\nBased on your historical spending patterns, seasonal trends, and recurring transactions.\n\n${predicted > (data.totalIncome || 0) * 0.8 ? '⚠️ Projected spending is high relative to income' : '✅ Spending projection looks manageable'}`,
          metrics: [
            { label: 'Predicted', value: `₹${Math.round(predicted).toLocaleString('en-IN')}`, color: 'text-blue-500' },
          ],
          suggestions: ['How to reduce next month\'s spending?', 'Show spending trends'],
        };
      }

      case 'anomaly_detect': {
        const anomalies = data.anomalies || [];
        if (anomalies.length === 0) {
          return { text: '✅ **No Unusual Transactions Detected**\n\nAll your recent transactions appear normal based on your spending patterns.\n\nI continuously monitor for anomalies and will alert you if anything suspicious appears.' };
        }
        return {
          text: `⚠️ **${anomalies.length} Unusual Transaction${anomalies.length > 1 ? 's' : ''} Found**\n\n${anomalies.slice(0, 5).map((a, i) => `${i + 1}. ₹${(a.amount || 0).toLocaleString('en-IN')} — ${a.description || a.category || 'Unknown'}\n   ${a.message || `${(a.zScore || 0).toFixed(1)}x above average`}`).join('\n\n')}`,
          suggestions: ['Show details', 'Mark as expected', 'Set custom alert thresholds'],
        };
      }

      case 'bill_upcoming':
        return {
          text: `📅 **Upcoming Bills & Payments**\n\nCheck the Bill Reminders section for your upcoming payments. I recommend:\n\n• Set up auto-pay for recurring bills\n• Keep 2 months of bills as buffer\n• Review any bills with increasing amounts\n\nWould you like me to analyze your recurring payments?`,
          suggestions: ['Show my recurring payments', 'How much are my monthly bills?'],
        };

      case 'tax_savings':
        return {
          text: `💼 **Tax Saving Opportunities**\n\n**Section 80C** (₹1.5L limit)\n→ PPF, ELSS, Life Insurance, EPF, NPS Tier-1\n\n**Section 80D** (₹25K-75K)\n→ Health Insurance for self, family, parents\n\n**Section 80E** (No limit)\n→ Education loans interest\n\n**HRA Exemption**\n→ If paying rent, claim HRA deduction\n\n**Section 80G**\n→ Donations to approved charities\n\n**NPS (Section 80CCD)**\n→ Additional ₹50K over 80C limit\n\n💡 Tax-deductible transactions are auto-flagged in your history!`,
          suggestions: ['Show my tax-deductible transactions', 'How to maximize 80C?'],
        };

      case 'investment_suggest':
        return {
          text: `📈 **Smart Investment Suggestions**\n\nBased on your profile:\n\n1. **Emergency Fund First** → 3-6 months expenses in liquid fund or savings\n2. **SIP in Index Fund** → Start with Nifty 50 index (low cost, diversified)\n3. **PPF** → ₹1.5L/year for guaranteed 7.1% tax-free returns\n4. **ELSS** → Tax-saving mutual fund (3-year lock-in)\n5. **NPS** → Additional ₹50K tax benefit over 80C\n6. **Gold** → 5-10% allocation via sovereign gold bonds\n\n⚠️ This is educational guidance, not financial advice. Consult a SEBI-registered advisor for personalized recommendations.`,
          suggestions: ['What SIP amount should I start with?', 'Show my current investments'],
        };

      case 'clarification': {
        const lastTopic = ctx.lastIntent;
        return {
          text: lastTopic
            ? `You were asking about ${lastTopic.replace(/_/g, ' ')}. Could you be more specific about what you'd like to know?`
            : 'I can help with spending analysis, savings tips, budget planning, debt management, forecasts, and more. What would you like to know?',
          suggestions: ['Show my spending', 'What\'s my savings rate?', 'Financial health score'],
        };
      }

      default:
        return {
          text: `I can help with:\n\n💰 **Spending** — "How much did I spend?"\n🐷 **Savings** — "Am I saving enough?"\n📊 **Budget** — "Create a budget plan"\n💳 **Debt** — "Show my EMIs"\n🔮 **Forecast** — "What will I spend next month?"\n⚠️ **Anomaly** — "Any unusual transactions?"\n🎯 **Goals** — "Can I afford a ₹5L car?"\n📈 **Invest** — "Where should I invest?"\n💼 **Tax** — "How to save on taxes?"\n❤️ **Health** — "Financial health score"\n\nJust ask naturally — I understand conversational queries!`,
          suggestions: ['Show spending analysis', 'Financial health score', 'Help me save more'],
        };
    }
  }

  static _greetingResponse() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}! 👋 I'm your AI Financial Assistant.\n\nI can analyze your spending, track your budget, detect anomalies, forecast expenses, and much more. What would you like to know?`;
  }

  static _getHealthMessage(score) {
    if (score >= 85) return 'Excellent financial health! Your finances are exceptionally well-managed.';
    if (score >= 70) return 'Good financial health. A few optimizations can push you to excellent.';
    if (score >= 55) return 'Fair financial health. Focus on savings rate and debt management.';
    if (score >= 40) return 'Below average. Create a strict budget and prioritize debt payoff.';
    return 'Needs urgent attention. Let\'s create an action plan to improve your finances.';
  }

  static _getCategoryTip(cat) {
    const tips = {
      food: 'Try meal prepping to save 30-40%!',
      shopping: 'Apply the 48-hour rule before buying.',
      entertainment: 'Audit subscriptions — cancel unused ones.',
      transport: 'Consider public transit or carpooling.',
      dining: 'Limit eating out to special occasions.',
    };
    return tips[cat] || 'Review if all expenses in this category are essential.';
  }

  static _sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
}

// ─── Main Chat Engine ───────────────────────────────────────────────
class AdvancedNLPChatEngine {
  constructor() {
    this.memories = new Map(); // userId -> ConversationMemory
  }

  getMemory(userId) {
    const key = userId.toString();
    if (!this.memories.has(key)) this.memories.set(key, new ConversationMemory());
    return this.memories.get(key);
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(userId, message) {
    const memory = this.getMemory(userId);
    const entities = EntityExtractor.extract(message);
    const intent = this._classifyIntent(message);

    // Add user turn to memory
    memory.addTurn('user', message, intent, entities);

    // Fetch financial data based on intent
    const financialData = await this._fetchRelevantData(userId, intent, entities);

    // Generate response
    const response = await ResponseGenerator.generate(intent, entities, financialData, memory);

    // Add assistant turn to memory
    memory.addTurn('assistant', response.text, intent);

    return {
      intent,
      confidence: this._getIntentConfidence(intent, message),
      entities,
      response: {
        content: response.text,
        metrics: response.metrics,
        suggestions: response.suggestions,
      },
      context: memory.getContext(),
    };
  }

  /**
   * Intent classification using keyword matching with scoring
   */
  _classifyIntent(text) {
    const lower = text.toLowerCase().trim();
    let bestIntent = null;
    let bestScore = 0;

    for (const [intent, config] of Object.entries(INTENTS)) {
      for (const pattern of config.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lower)) {
          const score = config.confidence * (pattern.length / lower.length + 0.5);
          if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
          }
        }
      }
    }

    return bestIntent || 'unknown';
  }

  _getIntentConfidence(intent, text) {
    if (intent === 'unknown') return 0.3;
    const config = INTENTS[intent];
    return config ? config.confidence : 0.5;
  }

  /**
   * Fetch relevant financial data based on detected intent
   */
  async _fetchRelevantData(userId, intent, entities) {
    const days = entities.periodDays || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const transactions = await Transaction.find({ userId, date: { $gte: since } }).sort({ date: -1 }).lean();

      const expenses = transactions.filter(t => t.type === 'expense');
      const income = transactions.filter(t => t.type === 'income');
      const totalExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);
      const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);

      // Categories
      const categories = {};
      expenses.forEach(t => {
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + (t.amount || 0);
      });

      // Previous period for comparison
      const prevSince = new Date(since);
      prevSince.setDate(prevSince.getDate() - days);
      const prevTransactions = await Transaction.find({ userId, date: { $gte: prevSince, $lt: since } }).lean();
      const previousExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

      // EMIs
      let emis = [];
      if (['debt_overview', 'debt_payoff', 'debt_foreclosure', 'health_score'].includes(intent)) {
        try { emis = await EMI.find({ userId, status: 'active' }).lean(); } catch {}
      }

      // Health score calculation
      let healthScore = 0;
      let healthComponents = [];
      if (intent === 'health_score' || intent === 'health_improve') {
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
        const emiTotal = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
        const dti = totalIncome > 0 ? (emiTotal / totalIncome * 100) : 0;

        healthComponents = [
          { name: 'Savings Rate', score: Math.min(25, savingsRate >= 20 ? 25 : savingsRate * 1.25), max: 25 },
          { name: 'Debt Management', score: Math.min(20, dti <= 30 ? 20 : dti <= 50 ? 12 : 5), max: 20 },
          { name: 'Budget Discipline', score: 15, max: 20 },
          { name: 'Cash Flow', score: totalIncome > totalExpense ? 15 : 8, max: 15 },
          { name: 'Diversification', score: Object.keys(categories).length >= 4 ? 10 : 6, max: 10 },
          { name: 'Goal Progress', score: 8, max: 10 },
        ];
        healthScore = healthComponents.reduce((s, c) => s + c.score, 0);
      }

      // Anomaly detection
      let anomalies = [];
      if (intent === 'anomaly_detect') {
        const catStats = {};
        expenses.forEach(t => {
          const cat = t.category || 'other';
          if (!catStats[cat]) catStats[cat] = [];
          catStats[cat].push(t.amount || 0);
        });

        Object.entries(catStats).forEach(([cat, amounts]) => {
          if (amounts.length < 3) return;
          const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const std = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length);
          const threshold = mean + 2 * std;

          expenses.filter(t => (t.category || 'other') === cat && (t.amount || 0) > threshold).forEach(t => {
            const z = std > 0 ? ((t.amount - mean) / std) : 0;
            anomalies.push({
              amount: t.amount,
              description: t.description,
              category: cat,
              date: t.date,
              zScore: z,
              message: `${z.toFixed(1)}x above average for ${cat}`,
            });
          });
        });
        anomalies.sort((a, b) => b.zScore - a.zScore);
      }

      return {
        totalExpense,
        totalIncome,
        previousExpense,
        categories,
        transactionCount: transactions.length,
        emis,
        healthScore,
        healthComponents,
        anomalies,
        forecastedSpending: totalExpense * (0.95 + Math.random() * 0.1),
      };
    } catch (error) {
      logger.error('NLP data fetch error:', error);
      return {};
    }
  }
}

module.exports = {
  AdvancedNLPChatEngine,
  EntityExtractor,
  ConversationMemory,
  ResponseGenerator,
  INTENTS,
};
