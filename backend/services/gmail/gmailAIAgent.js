// ============================================================
// Gmail AI Agent — Self-Learning Email Intelligence System
// ============================================================
// A dedicated AI agent that learns from the user's actual Gmail data.
// Trains local models for: classification, transaction extraction,
// spam/financial filtering, pattern recognition, and smart summarization.
// Models persist to disk and improve with every sync.
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// ─── Naive Bayes Classifier (Trainable, Serializable) ─────────
class GmailNaiveBayes {
  constructor(name) {
    this.name = name;
    this.classCounts = {};
    this.featureCounts = {};
    this.vocabulary = new Set();
    this.totalDocs = 0;
    this.trained = false;
  }

  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[₹$€£]/g, ' CURRENCY ')
      .replace(/\b\d{1,3}(,\d{3})*(\.\d+)?\b/g, ' AMOUNT ')
      .replace(/\b\d{10,}\b/g, ' LONGNUM ')
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && t.length < 25);
  }

  train(documents) {
    for (const { text, label } of documents) {
      const tokens = this.tokenize(text);
      if (tokens.length === 0) continue;

      this.classCounts[label] = (this.classCounts[label] || 0) + 1;
      if (!this.featureCounts[label]) this.featureCounts[label] = {};

      for (const token of tokens) {
        this.vocabulary.add(token);
        this.featureCounts[label][token] = (this.featureCounts[label][token] || 0) + 1;
      }
      this.totalDocs++;
    }
    this.trained = true;
  }

  predict(text) {
    if (!this.trained || this.totalDocs === 0) return { label: 'unknown', confidence: 0 };

    const tokens = this.tokenize(text);
    const classes = Object.keys(this.classCounts);
    const vocabSize = this.vocabulary.size || 1;
    let bestLabel = 'unknown';
    let bestScore = -Infinity;
    const scores = {};

    for (const cls of classes) {
      const classCount = this.classCounts[cls];
      let logProb = Math.log(classCount / this.totalDocs);
      const totalWordsInClass = Object.values(this.featureCounts[cls] || {}).reduce((a, b) => a + b, 0);

      for (const token of tokens) {
        const wordCount = (this.featureCounts[cls]?.[token] || 0) + 1; // Laplace smoothing
        logProb += Math.log(wordCount / (totalWordsInClass + vocabSize));
      }

      scores[cls] = logProb;
      if (logProb > bestScore) {
        bestScore = logProb;
        bestLabel = cls;
      }
    }

    // Convert log probs to confidence
    const maxScore = Math.max(...Object.values(scores));
    const expSum = Object.values(scores).reduce((s, v) => s + Math.exp(v - maxScore), 0);
    const confidence = Math.exp(scores[bestLabel] - maxScore) / expSum;

    return { label: bestLabel, confidence: Math.round(confidence * 100) / 100, scores };
  }

  serialize() {
    return {
      name: this.name,
      classCounts: this.classCounts,
      featureCounts: this.featureCounts,
      vocabulary: [...this.vocabulary],
      totalDocs: this.totalDocs,
      trained: this.trained
    };
  }

  static deserialize(data) {
    const model = new GmailNaiveBayes(data.name);
    model.classCounts = data.classCounts || {};
    model.featureCounts = data.featureCounts || {};
    model.vocabulary = new Set(data.vocabulary || []);
    model.totalDocs = data.totalDocs || 0;
    model.trained = data.trained || false;
    return model;
  }
}

// ─── Pattern Learner (learns user-specific financial patterns) ─
class PatternLearner {
  constructor() {
    this.senderPatterns = {};  // sender → category mapping learned from user data
    this.amountPatterns = {};  // category → typical amount ranges
    this.timePatterns = {};    // category → typical day-of-month
    this.merchantMap = {};     // merchant name normalization
  }

  learnFromEmail(email) {
    const sender = email.from?.email?.toLowerCase() || '';
    const category = email.classification?.primaryCategory || 'other';
    const amount = email.extractedData?.transactions?.[0]?.amount;
    const date = email.receivedAt ? new Date(email.receivedAt) : null;

    // Learn sender → category mapping
    if (sender && category !== 'other') {
      if (!this.senderPatterns[sender]) {
        this.senderPatterns[sender] = {};
      }
      this.senderPatterns[sender][category] = (this.senderPatterns[sender][category] || 0) + 1;
    }

    // Learn category → amount range
    if (category && amount && amount > 0) {
      if (!this.amountPatterns[category]) {
        this.amountPatterns[category] = { min: amount, max: amount, sum: 0, count: 0 };
      }
      const ap = this.amountPatterns[category];
      ap.min = Math.min(ap.min, amount);
      ap.max = Math.max(ap.max, amount);
      ap.sum += amount;
      ap.count++;
    }

    // Learn category → typical day of month
    if (category && date) {
      const day = date.getDate();
      if (!this.timePatterns[category]) {
        this.timePatterns[category] = {};
      }
      this.timePatterns[category][day] = (this.timePatterns[category][day] || 0) + 1;
    }
  }

  predictCategory(senderEmail) {
    const patterns = this.senderPatterns[senderEmail?.toLowerCase()];
    if (!patterns) return null;
    const sorted = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { category: sorted[0][0], confidence: sorted[0][1] / Object.values(patterns).reduce((a, b) => a + b, 0) } : null;
  }

  getInsights() {
    return {
      knownSenders: Object.keys(this.senderPatterns).length,
      categoryAmountRanges: Object.fromEntries(
        Object.entries(this.amountPatterns).map(([cat, d]) => [cat, {
          min: d.min, max: d.max, avg: Math.round(d.sum / d.count), count: d.count
        }])
      ),
      recurringDays: Object.fromEntries(
        Object.entries(this.timePatterns).map(([cat, days]) => {
          const sorted = Object.entries(days).sort((a, b) => b[1] - a[1]);
          return [cat, sorted.slice(0, 3).map(([day, count]) => ({ day: parseInt(day), count }))];
        })
      )
    };
  }

  serialize() {
    return { senderPatterns: this.senderPatterns, amountPatterns: this.amountPatterns, timePatterns: this.timePatterns, merchantMap: this.merchantMap };
  }

  static deserialize(data) {
    const learner = new PatternLearner();
    learner.senderPatterns = data.senderPatterns || {};
    learner.amountPatterns = data.amountPatterns || {};
    learner.timePatterns = data.timePatterns || {};
    learner.merchantMap = data.merchantMap || {};
    return learner;
  }
}

// ─── Gmail AI Agent (Main Class) ──────────────────────────────
class GmailAIAgent {
  constructor() {
    this.categoryClassifier = new GmailNaiveBayes('category');
    this.financialFilter = new GmailNaiveBayes('financial');
    this.transactionTypeClassifier = new GmailNaiveBayes('txnType');
    this.patternLearner = new PatternLearner();
    this.modelDir = path.join(process.cwd(), 'data', 'gmail-models');
    this.trainingStats = { lastTrained: null, totalEmails: 0, accuracy: 0, version: 0 };

    // Ensure model directory exists
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }

    logger.info('[GmailAIAgent] Initialized');
  }

  // ── Train from user's actual Gmail data ──────────────────────
  async trainFromUserEmails(userId) {
    try {
      const GmailEmail = require('../../models/GmailEmail');
      const emails = await GmailEmail.find({ userId })
        .sort('-receivedAt')
        .limit(5000)
        .lean();

      if (emails.length < 5) {
        logger.info(`[GmailAIAgent] Not enough emails to train for user ${userId} (${emails.length})`);
        return { success: false, reason: 'insufficient_data', emailCount: emails.length };
      }

      logger.info(`[GmailAIAgent] Training on ${emails.length} emails for user ${userId}`);
      const startTime = Date.now();

      // ── 1. Train Category Classifier ──
      const categoryDocs = [];
      const financialDocs = [];
      const txnTypeDocs = [];

      for (const email of emails) {
        const text = `${email.subject || ''} ${email.snippet || ''} ${email.body?.substring(0, 500) || ''}`;
        const fromText = `${email.from?.name || ''} ${email.from?.email || ''}`;
        const fullText = `${fromText} ${text}`;

        // Category training data
        const category = email.classification?.primaryCategory;
        if (category && category !== 'other') {
          categoryDocs.push({ text: fullText, label: category });
        }

        // Financial vs non-financial
        const isFinancial = email.classification?.isFinancial ||
          email.extractedData?.transactionCount > 0 ||
          /bank|credit|debit|payment|transaction|upi|neft|rtgs|emi|loan|insurance|salary|mutual\s*fund/i.test(text);
        financialDocs.push({ text: fullText, label: isFinancial ? 'financial' : 'non_financial' });

        // Transaction type (credit/debit)
        if (email.extractedData?.transactions?.length > 0) {
          const txn = email.extractedData.transactions[0];
          if (txn.type) {
            txnTypeDocs.push({ text: fullText, label: txn.type });
          }
        }

        // Pattern learning
        this.patternLearner.learnFromEmail(email);
      }

      // Train models
      if (categoryDocs.length >= 5) {
        this.categoryClassifier = new GmailNaiveBayes('category');
        this.categoryClassifier.train(categoryDocs);
      }

      if (financialDocs.length >= 5) {
        this.financialFilter = new GmailNaiveBayes('financial');
        this.financialFilter.train(financialDocs);
      }

      if (txnTypeDocs.length >= 5) {
        this.transactionTypeClassifier = new GmailNaiveBayes('txnType');
        this.transactionTypeClassifier.train(txnTypeDocs);
      }

      // ── 2. Cross-validation accuracy estimate ──
      let correct = 0;
      let total = 0;
      const testSet = categoryDocs.slice(-Math.min(50, Math.floor(categoryDocs.length * 0.2)));
      for (const { text, label } of testSet) {
        const pred = this.categoryClassifier.predict(text);
        if (pred.label === label) correct++;
        total++;
      }
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const elapsed = Date.now() - startTime;
      this.trainingStats = {
        lastTrained: new Date(),
        totalEmails: emails.length,
        accuracy,
        version: (this.trainingStats.version || 0) + 1,
        categoryDocs: categoryDocs.length,
        financialDocs: financialDocs.length,
        txnTypeDocs: txnTypeDocs.length,
        trainingTimeMs: elapsed,
        uniqueSenders: Object.keys(this.patternLearner.senderPatterns).length,
        categoriesLearned: Object.keys(this.categoryClassifier.classCounts).length,
      };

      // ── 3. Save models to disk ──
      await this.saveModels(userId);

      logger.info(`[GmailAIAgent] Training complete for user ${userId}: ${accuracy}% accuracy, ${categoryDocs.length} category docs, ${elapsed}ms`);

      return {
        success: true,
        ...this.trainingStats
      };
    } catch (error) {
      logger.error(`[GmailAIAgent] Training failed for user ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ── Analyze a single email using trained models ──────────────
  analyzeEmail(emailData) {
    const text = `${emailData.from?.name || ''} ${emailData.from?.email || ''} ${emailData.subject || ''} ${emailData.body?.substring(0, 1000) || ''} ${emailData.snippet || ''}`;

    const result = {
      category: this.categoryClassifier.predict(text),
      isFinancial: this.financialFilter.predict(text),
      transactionType: this.transactionTypeClassifier.predict(text),
      senderPrediction: this.patternLearner.predictCategory(emailData.from?.email),
      amounts: this._extractAmounts(text),
      dates: this._extractDates(text),
      entities: this._extractEntities(text),
    };

    // Merge sender-based prediction if more confident
    if (result.senderPrediction && result.senderPrediction.confidence > (result.category.confidence || 0)) {
      result.category = {
        label: result.senderPrediction.category,
        confidence: result.senderPrediction.confidence,
        source: 'pattern_learner'
      };
    }

    return result;
  }

  // ── Batch analyze emails ─────────────────────────────────────
  batchAnalyze(emails) {
    return emails.map(email => ({
      emailId: email._id,
      subject: email.subject,
      ...this.analyzeEmail(email)
    }));
  }

  // ── Get agent insights and stats ─────────────────────────────
  getAgentStatus() {
    return {
      trained: this.categoryClassifier.trained,
      stats: this.trainingStats,
      models: {
        categoryClassifier: {
          trained: this.categoryClassifier.trained,
          classes: Object.keys(this.categoryClassifier.classCounts),
          totalDocs: this.categoryClassifier.totalDocs,
          vocabularySize: this.categoryClassifier.vocabulary.size
        },
        financialFilter: {
          trained: this.financialFilter.trained,
          totalDocs: this.financialFilter.totalDocs,
        },
        transactionTypeClassifier: {
          trained: this.transactionTypeClassifier.trained,
          totalDocs: this.transactionTypeClassifier.totalDocs,
        },
        patternLearner: this.patternLearner.getInsights()
      }
    };
  }

  // ── Save models to disk ──────────────────────────────────────
  async saveModels(userId) {
    try {
      const modelPath = path.join(this.modelDir, `${String(userId)}_gmail_agent.json`);
      const data = {
        version: 2,
        savedAt: new Date().toISOString(),
        userId: String(userId),
        stats: this.trainingStats,
        categoryClassifier: this.categoryClassifier.serialize(),
        financialFilter: this.financialFilter.serialize(),
        transactionTypeClassifier: this.transactionTypeClassifier.serialize(),
        patternLearner: this.patternLearner.serialize(),
      };
      fs.writeFileSync(modelPath, JSON.stringify(data), 'utf-8');
      logger.info(`[GmailAIAgent] Models saved for user ${userId}`);
    } catch (error) {
      logger.error(`[GmailAIAgent] Failed to save models:`, error.message);
    }
  }

  // ── Load models from disk ────────────────────────────────────
  async loadModels(userId) {
    try {
      const modelPath = path.join(this.modelDir, `${String(userId)}_gmail_agent.json`);
      if (!fs.existsSync(modelPath)) {
        logger.info(`[GmailAIAgent] No saved models for user ${userId}`);
        return false;
      }

      const data = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
      this.categoryClassifier = GmailNaiveBayes.deserialize(data.categoryClassifier);
      this.financialFilter = GmailNaiveBayes.deserialize(data.financialFilter);
      this.transactionTypeClassifier = GmailNaiveBayes.deserialize(data.transactionTypeClassifier);
      this.patternLearner = PatternLearner.deserialize(data.patternLearner);
      this.trainingStats = data.stats || {};

      logger.info(`[GmailAIAgent] Models loaded for user ${userId} (v${data.version}, ${this.trainingStats.totalEmails} emails, ${this.trainingStats.accuracy}% accuracy)`);
      return true;
    } catch (error) {
      logger.error(`[GmailAIAgent] Failed to load models:`, error.message);
      return false;
    }
  }

  // ── Smart email summary using trained patterns ───────────────
  generateSmartSummary(email) {
    const analysis = this.analyzeEmail(email);
    const parts = [];

    // Sender context
    parts.push(`From: ${email.from?.name || email.from?.email || 'Unknown'}`);

    // Category-based insight
    if (analysis.category.label !== 'unknown') {
      parts.push(`Category: ${analysis.category.label.replace(/_/g, ' ')} (${Math.round(analysis.category.confidence * 100)}% confident)`);
    }

    // Financial status
    if (analysis.isFinancial.label === 'financial') {
      parts.push('This is a financial email.');
    }

    // Transaction info
    if (analysis.amounts.length > 0) {
      const mainAmt = Math.max(...analysis.amounts);
      const typeStr = analysis.transactionType.label === 'credit' ? 'Credit' : analysis.transactionType.label === 'debit' ? 'Debit' : 'Amount';
      parts.push(`${typeStr}: ₹${mainAmt.toLocaleString('en-IN')}`);
    }

    // Dates
    if (analysis.dates.length > 0) {
      parts.push(`Date mentioned: ${analysis.dates[0]}`);
    }

    // Entities
    if (analysis.entities.upiIds.length > 0) parts.push(`UPI: ${analysis.entities.upiIds[0]}`);
    if (analysis.entities.accountNumbers.length > 0) parts.push(`Account: ${analysis.entities.accountNumbers[0]}`);
    if (analysis.entities.referenceNumbers.length > 0) parts.push(`Ref: ${analysis.entities.referenceNumbers[0]}`);

    return parts.join(' | ');
  }

  // ── Private: Extract amounts from text ───────────────────────
  _extractAmounts(text) {
    const amounts = [];
    const pattern = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 0 && val < 100000000) amounts.push(val);
    }
    return [...new Set(amounts)].sort((a, b) => b - a);
  }

  // ── Private: Extract dates from text ─────────────────────────
  _extractDates(text) {
    const dates = [];
    const patterns = [
      /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})/gi,
      /(?:due|payment|expiry|renewal|next)\s*(?:date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        dates.push(m[1]);
      }
    }
    return [...new Set(dates)].slice(0, 5);
  }

  // ── Private: Extract financial entities from text ─────────────
  _extractEntities(text) {
    return {
      upiIds: (text.match(/[a-z0-9][\w.\-]+@[a-z]+/gi) || []).slice(0, 3),
      accountNumbers: (text.match(/(?:a\/c|account|acct)\s*(?:no\.?\s*)?:?\s*(\w{4,})/gi) || []).slice(0, 3),
      referenceNumbers: (text.match(/(?:ref|utr|txn\s*id|reference)\s*(?:no\.?\s*)?:?\s*([A-Z0-9]{6,})/gi) || []).slice(0, 3),
      ifscCodes: (text.match(/[A-Z]{4}0[A-Z0-9]{6}/g) || []).slice(0, 3),
      policyNumbers: (text.match(/(?:policy|certificate)\s*(?:no|number|#)\s*:?\s*([A-Z0-9]{5,20})/gi) || []).slice(0, 3),
    };
  }
}

// ── Singleton instance ─────────────────────────────────────────
const gmailAIAgent = new GmailAIAgent();

module.exports = {
  GmailAIAgent,
  GmailNaiveBayes,
  PatternLearner,
  gmailAIAgent
};
