const express = require('express');
const router = express.Router();
const InsurancePolicy = require('../models/InsurancePolicy');
const { authenticate } = require('../middleware/auth');

// Create Insurance Policy
router.post('/', authenticate, async (req, res) => {
  try {
    const policy = new InsurancePolicy({ ...req.body, userId: req.user._id });
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Policies
router.get('/', authenticate, async (req, res) => {
  try {
    const { policyType, status } = req.query;
    const query = { userId: req.user._id };
    if (policyType) query.policyType = policyType;
    if (status) query.status = status;
    
    const policies = await InsurancePolicy.find(query).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Policy by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Policy
router.put('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Policy
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Premium Payment
router.post('/:id/premiums', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.recordPremiumPayment(req.body.amount, req.body.paymentDate, req.body.paymentMethod);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// File Claim
router.post('/:id/claims', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.fileClaim(req.body);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Claim Status
router.put('/:id/claims/:claimId', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.updateClaimStatus(req.params.claimId, req.body.status, req.body.settlementAmount, req.body.notes);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Calculate Returns
router.get('/:id/returns', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    const returns = policy.calculateReturns();
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assess Risk
router.post('/:id/risk-assessment', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.assessRisk();
    await policy.save();
    
    res.json(policy.riskAssessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Expiring Policies
router.get('/alerts/expiring', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const policies = await InsurancePolicy.getExpiringPolicies(req.user._id, days);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Premiums Due
router.get('/alerts/premiums-due', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const policies = await InsurancePolicy.getPremiumsDue(req.user._id, days);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Coverage Analysis
router.get('/analysis/coverage', authenticate, async (req, res) => {
  try {
    const analysis = await InsurancePolicy.getCoverageAnalysis(req.user._id);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GMAIL INSURANCE EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/insurance/sync-from-gmail
 * Extract insurance policy info from synced Gmail emails
 */
router.post('/sync-from-gmail', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const GmailEmail = require('../models/GmailEmail');
    const logger = require('../utils/logger');

    // Find insurance-related emails
    const insuranceEmails = await GmailEmail.find({
      userId,
      $or: [
        { 'classification.primaryCategory': 'insurance_notification' },
        { 'classification.primaryCategory': 'insurance' },
        { subject: { $regex: /insurance|policy|premium|claim|coverage|nominee|renewal|lic|sbi\s*life|max\s*life|hdfc\s*ergo|icici\s*lombard|star\s*health|bajaj\s*allianz|tata\s*aia/i } },
        { 'from.email': { $regex: /insurance|lic\.in|sbilife|maxlife|hdfcergo|icicilombard|starhealth|bajaj|tataaia|newindia|oriental|national|uiic/i } }
      ]
    }).sort('-receivedAt').limit(200).lean();

    logger.info(`Found ${insuranceEmails.length} insurance-related emails for user ${userId}`);

    const results = { found: insuranceEmails.length, policiesCreated: 0, policiesUpdated: 0, premiumsDetected: 0 };

    // Insurance provider patterns
    const providerPatterns = [
      { regex: /lic|life\s*insurance\s*corporation/i, name: 'LIC', type: 'life' },
      { regex: /sbi\s*life/i, name: 'SBI Life', type: 'life' },
      { regex: /max\s*life/i, name: 'Max Life', type: 'life' },
      { regex: /hdfc\s*life/i, name: 'HDFC Life', type: 'life' },
      { regex: /tata\s*aia/i, name: 'Tata AIA', type: 'life' },
      { regex: /icici\s*pru/i, name: 'ICICI Prudential', type: 'life' },
      { regex: /hdfc\s*ergo/i, name: 'HDFC Ergo', type: 'general' },
      { regex: /icici\s*lombard/i, name: 'ICICI Lombard', type: 'general' },
      { regex: /bajaj\s*allianz/i, name: 'Bajaj Allianz', type: 'general' },
      { regex: /star\s*health/i, name: 'Star Health', type: 'health' },
      { regex: /new\s*india\s*assurance/i, name: 'New India Assurance', type: 'general' },
      { regex: /oriental\s*insurance/i, name: 'Oriental Insurance', type: 'general' },
      { regex: /national\s*insurance/i, name: 'National Insurance', type: 'general' },
      { regex: /united\s*india/i, name: 'United India Insurance', type: 'general' },
      { regex: /care\s*health|religare/i, name: 'Care Health', type: 'health' },
      { regex: /niva\s*bupa|max\s*bupa/i, name: 'Niva Bupa', type: 'health' },
      { regex: /digit\s*insurance|go\s*digit/i, name: 'Digit Insurance', type: 'general' },
      { regex: /acko/i, name: 'Acko', type: 'motor' },
    ];

    // Date extraction patterns
    const datePatterns = [
      /(?:due\s*date|payment\s*date|next\s*(?:premium|payment)|renewal\s*date)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:due\s*date|payment\s*date|next\s*(?:premium|payment)|renewal\s*date)[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})/i,
      /(?:valid\s*(?:till|until|upto)|expiry|expires)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:policy\s*period|cover\s*period)[:\s]*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*(?:to|-)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    ];

    // Policy number patterns
    const policyNumPatterns = [
      /(?:policy\s*(?:no|number|#|id))[:\s#]*([A-Z0-9]{5,20})/i,
      /(?:certificate\s*(?:no|number))[:\s#]*([A-Z0-9]{5,20})/i,
    ];

    const amountPattern = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;

    for (const email of insuranceEmails) {
      try {
        const fullText = `${email.subject || ''} ${email.body || ''} ${email.snippet || ''}`;
        const fromText = `${email.from?.name || ''} ${email.from?.email || ''}`;

        // Detect provider
        let provider = null;
        let insuranceType = 'general';
        for (const p of providerPatterns) {
          if (p.regex.test(fullText) || p.regex.test(fromText)) {
            provider = p.name;
            insuranceType = p.type;
            break;
          }
        }
        if (!provider) continue; // Skip non-insurance emails

        // Extract policy number
        let policyNumber = null;
        for (const pat of policyNumPatterns) {
          const m = fullText.match(pat);
          if (m) { policyNumber = m[1]; break; }
        }

        // Extract amounts (premium)
        const amounts = [];
        let m;
        const amtRegex = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
        while ((m = amtRegex.exec(fullText)) !== null) {
          amounts.push(parseFloat(m[1].replace(/,/g, '')));
        }
        const premiumAmount = amounts.length > 0 ? Math.max(...amounts.filter(a => a < 500000)) || amounts[0] : null;

        // Extract dates
        let dueDate = null;
        let expiryDate = null;
        for (const pat of datePatterns) {
          const dm = fullText.match(pat);
          if (dm) {
            const parsed = new Date(dm[1]);
            if (!isNaN(parsed.getTime())) {
              if (/due|payment|next|renewal/i.test(pat.source)) dueDate = parsed;
              else expiryDate = parsed;
            }
          }
        }

        // Determine insurance sub-type from content
        if (/health|medical|hospitalization|cashless/i.test(fullText)) insuranceType = 'health';
        else if (/motor|car|vehicle|bike|two.?wheeler|four.?wheeler/i.test(fullText)) insuranceType = 'motor';
        else if (/term|life|endowment|whole\s*life|money.?back|jeevan/i.test(fullText)) insuranceType = 'life';
        else if (/travel/i.test(fullText)) insuranceType = 'travel';
        else if (/home|property|fire/i.test(fullText)) insuranceType = 'home';

        // Check if policy already exists
        let policy = null;
        if (policyNumber) {
          policy = await InsurancePolicy.findOne({ userId, 'provider.policyNumber': policyNumber });
        }
        if (!policy && provider) {
          policy = await InsurancePolicy.findOne({ userId, 'provider.name': provider, type: insuranceType });
        }

        if (policy) {
          // Update existing policy with latest info
          let updated = false;
          if (dueDate && (!policy.policyDetails.nextDueDate || dueDate > policy.policyDetails.nextDueDate)) {
            policy.policyDetails.nextDueDate = dueDate;
            updated = true;
          }
          if (expiryDate && (!policy.endDate || expiryDate > policy.endDate)) {
            policy.endDate = expiryDate;
            updated = true;
          }
          if (premiumAmount && premiumAmount !== policy.policyDetails.premiumAmount) {
            policy.policyDetails.premiumAmount = premiumAmount;
            updated = true;
          }

          // Check if this email indicates a premium payment
          if (/paid|payment\s*(?:successful|received|confirmed)|thank\s*you\s*for\s*your\s*payment|premium\s*received/i.test(fullText)) {
            const alreadyRecorded = policy.premiumHistory?.some(p =>
              Math.abs(new Date(p.paidDate) - new Date(email.receivedAt)) < 86400000
            );
            if (!alreadyRecorded && premiumAmount) {
              policy.premiumHistory = policy.premiumHistory || [];
              policy.premiumHistory.push({
                dueDate: dueDate || email.receivedAt,
                paidDate: email.receivedAt,
                amount: premiumAmount,
                status: 'paid',
                source: 'gmail'
              });
              results.premiumsDetected++;
              updated = true;
            }
          }

          if (updated) {
            await policy.save();
            results.policiesUpdated++;
          }
        } else if (policyNumber || premiumAmount) {
          // Create new policy from email data
          const newPolicy = new InsurancePolicy({
            userId,
            type: insuranceType,
            provider: {
              name: provider,
              policyNumber: policyNumber || `AUTO_${Date.now()}`,
            },
            policyDetails: {
              premiumAmount: premiumAmount || 0,
              premiumFrequency: 'yearly',
              nextDueDate: dueDate || null,
              sumInsured: amounts.find(a => a > 100000) || 0,
            },
            startDate: email.receivedAt,
            endDate: expiryDate || null,
            status: 'active',
            source: 'gmail',
            gmailEmailId: email._id,
            premiumHistory: premiumAmount && /paid|received|confirmed/i.test(fullText) ? [{
              dueDate: dueDate || email.receivedAt,
              paidDate: email.receivedAt,
              amount: premiumAmount,
              status: 'paid',
              source: 'gmail'
            }] : []
          });

          try {
            await newPolicy.save();
            results.policiesCreated++;
            if (premiumAmount && /paid/i.test(fullText)) results.premiumsDetected++;
          } catch (saveErr) {
            logger.warn('Could not save insurance policy:', saveErr.message);
          }
        }
      } catch (emailErr) {
        logger.warn('Error processing insurance email:', emailErr.message);
      }
    }

    logger.info('Insurance Gmail sync completed:', results);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/insurance/gmail-insights
 * Get insurance insights extracted from Gmail
 */
router.get('/gmail-insights', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const GmailEmail = require('../models/GmailEmail');

    const insuranceEmails = await GmailEmail.find({
      userId,
      $or: [
        { 'classification.primaryCategory': { $in: ['insurance_notification', 'insurance'] } },
        { subject: { $regex: /insurance|policy|premium|claim|renewal/i } }
      ]
    }).sort('-receivedAt').limit(50).select('subject from receivedAt extractedData classification snippet').lean();

    // Extract upcoming dates and payment info
    const insights = {
      recentEmails: insuranceEmails.slice(0, 10).map(e => ({
        subject: e.subject,
        from: e.from?.name || e.from?.email,
        date: e.receivedAt,
        category: e.classification?.primaryCategory,
      })),
      totalInsuranceEmails: insuranceEmails.length,
      providers: [...new Set(insuranceEmails.map(e => e.from?.name).filter(Boolean))],
      lastEmailDate: insuranceEmails[0]?.receivedAt || null,
    };

    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
