/**
 * Entitlement middleware — gates features by subscription plan.
 *
 * Usage:
 *   router.get('/x', authenticate, requirePlan('pro'), handler)
 *   router.post('/y', authenticate, requireFeature('gmailSync'), handler)
 *
 * Also exposes helpers to enforce numeric limits (e.g., max debts) in routes.
 */

const { getPlan, planMeets } = require('../config/plans');
const logger = require('../utils/logger');

// Resolve the effective plan id for a user, honouring subscription status.
function effectivePlanId(user) {
  if (!user) return 'free';
  // Admins/owners always have full access.
  if (user.role === 'admin') return 'premium';
  const sub = user.subscription;
  if (!sub) return 'free';
  const activeish = ['active', 'trialing'].includes(sub.status);
  // Expired period falls back to free.
  const notExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
  if (activeish && notExpired) return sub.plan || 'free';
  return 'free';
}

function planContext(user) {
  const id = effectivePlanId(user);
  return { id, plan: getPlan(id), limits: getPlan(id).limits };
}

// Require a minimum tier (e.g., 'pro').
function requirePlan(minPlanId) {
  return (req, res, next) => {
    const current = effectivePlanId(req.user);
    if (planMeets(current, minPlanId)) return next();
    return res.status(403).json({
      success: false,
      code: 'UPGRADE_REQUIRED',
      message: `This feature requires the ${getPlan(minPlanId).name} plan or higher.`,
      requiredPlan: minPlanId,
      currentPlan: current
    });
  };
}

// Require a boolean feature flag from plan limits (e.g., 'gmailSync').
function requireFeature(featureKey) {
  return (req, res, next) => {
    const { limits, id } = planContext(req.user);
    if (limits && limits[featureKey]) return next();
    return res.status(403).json({
      success: false,
      code: 'UPGRADE_REQUIRED',
      message: `Your current plan does not include "${featureKey}". Please upgrade.`,
      feature: featureKey,
      currentPlan: id
    });
  };
}

/**
 * Enforce a numeric limit for a resource. Returns true if allowed, or sends a
 * 403 and returns false. Call inside a route before creating a resource.
 *   if (!enforceLimit(req, res, 'maxDebts', currentCount)) return;
 */
function enforceLimit(req, res, limitKey, currentCount) {
  const { limits, id } = planContext(req.user);
  const max = limits ? limits[limitKey] : null;
  if (max === null || max === undefined) return true; // unlimited
  if (currentCount < max) return true;
  res.status(403).json({
    success: false,
    code: 'LIMIT_REACHED',
    message: `You've reached your plan limit (${max}) for this resource. Upgrade for more.`,
    limitKey,
    limit: max,
    currentPlan: id
  });
  return false;
}

module.exports = { effectivePlanId, planContext, requirePlan, requireFeature, enforceLimit };
