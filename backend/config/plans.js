/**
 * SaaS subscription plans (source of truth).
 *
 * Tiers are ordered by rank so entitlement checks can do >= comparisons.
 * Prices are in the smallest currency unit (paise) for the payment gateway,
 * plus a human `displayPrice`. Limits of `null` mean "unlimited".
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    rank: 0,
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'INR',
    displayPrice: '\u20b90',
    tagline: 'Get started with the essentials',
    features: [
      'Up to 3 debts / loans',
      'Up to 3 EMIs tracked',
      'Basic dashboard & reports',
      'Manual transaction entry'
    ],
    limits: {
      maxDebts: 3,
      maxEmis: 3,
      maxBankAccounts: 1,
      gmailSync: false,
      aiInsights: false,
      advancedAnalytics: false,
      exportReports: false,
      debtSpiralMonitor: false,
      prioritySupport: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    rank: 1,
    priceMonthly: 29900, // \u20b9299 in paise
    priceYearly: 299000, // \u20b92990/yr (~2 months free)
    currency: 'INR',
    displayPrice: '\u20b9299',
    tagline: 'For serious money management',
    popular: true,
    features: [
      'Unlimited debts, loans & EMIs',
      'Gmail auto-sync of statements',
      'AI-powered insights',
      'Debt Spiral Monitor',
      'Export reports (PDF/CSV/Excel)',
      'Email support'
    ],
    limits: {
      maxDebts: null,
      maxEmis: null,
      maxBankAccounts: 10,
      gmailSync: true,
      aiInsights: true,
      advancedAnalytics: true,
      exportReports: true,
      debtSpiralMonitor: true,
      prioritySupport: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    rank: 2,
    priceMonthly: 59900, // \u20b9599 in paise
    priceYearly: 599000,
    currency: 'INR',
    displayPrice: '\u20b9599',
    tagline: 'Everything, unlimited, with priority support',
    features: [
      'Everything in Pro',
      'Unlimited bank accounts',
      'Advanced enterprise analytics',
      'Family / multi-profile finance',
      'Priority support',
      'Early access to new features'
    ],
    limits: {
      maxDebts: null,
      maxEmis: null,
      maxBankAccounts: null,
      gmailSync: true,
      aiInsights: true,
      advancedAnalytics: true,
      exportReports: true,
      debtSpiralMonitor: true,
      prioritySupport: true
    }
  }
};

const PLAN_ORDER = ['free', 'pro', 'premium'];

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

// Does `userPlanId` meet or exceed the required tier?
function planMeets(userPlanId, requiredPlanId) {
  return getPlan(userPlanId).rank >= getPlan(requiredPlanId).rank;
}

// Public (safe) plan catalogue for the pricing page.
function publicPlans() {
  return PLAN_ORDER.map((id) => {
    const p = PLANS[id];
    return {
      id: p.id,
      name: p.name,
      rank: p.rank,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      currency: p.currency,
      displayPrice: p.displayPrice,
      tagline: p.tagline,
      popular: !!p.popular,
      features: p.features,
      limits: p.limits
    };
  });
}

module.exports = { PLANS, PLAN_ORDER, getPlan, planMeets, publicPlans };
