import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Default flags – every new feature gets an entry here
// ---------------------------------------------------------------------------

const DEFAULT_FLAGS = {
  // Dashboard & analytics
  dashboardV2: true,
  advancedCharts: true,
  netWorthTracker: true,
  financialHealthScore: true,

  // Budgeting
  budgetAlerts: true,
  budgetRollover: false,
  sharedBudgets: false,

  // Transactions
  smartCategorization: true,
  duplicateDetection: true,
  receiptScanning: false,

  // Goals
  goalMilestones: true,
  goalSharing: false,

  // Automation
  automationRules: true,
  recurringTransactions: true,
  autoSavings: false,

  // Notifications
  smartNotifications: true,
  emailDigest: false,
  pushNotifications: false,

  // Social / family
  familyFinance: false,
  expenseSplitting: false,

  // Reports & export
  advancedExport: true,
  scheduledReports: false,
  pdfReports: true,

  // UI
  darkMode: true,
  comparisonTool: true,
  financialChat: false,
  financialTemplates: true,

  // Security
  twoFactorAuth: true,
  biometricLogin: false,

  // Misc
  betaFeatures: false,
  debugMode: false,
};

const STORAGE_KEY = 'fa_feature_flags';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FeatureFlagContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FeatureFlagProvider({ children, overrides = {}, apiEndpoint = null }) {
  const [flags, setFlags] = useState(() => {
    // Merge: defaults → persisted → overrides (props)
    let persisted = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) persisted = JSON.parse(raw);
      } catch {
        /* ignore parse errors */
      }
    }
    return { ...DEFAULT_FLAGS, ...persisted, ...overrides };
  });

  // Fetch flag overrides from backend (if endpoint is given)
  useEffect(() => {
    if (!apiEndpoint) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiEndpoint);
        if (!res.ok) return;
        const remote = await res.json();
        if (!cancelled && remote && typeof remote === 'object') {
          setFlags((prev) => {
            const merged = { ...prev, ...remote };
            persistFlags(merged);
            return merged;
          });
        }
      } catch {
        // Silent fail – keep local flags
      }
    })();

    return () => { cancelled = true; };
  }, [apiEndpoint]);

  // Persist to localStorage whenever flags change
  const persistFlags = useCallback((f) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      /* quota exceeded – ignore */
    }
  }, []);

  // Set a single flag
  const setFlag = useCallback(
    (name, value) => {
      setFlags((prev) => {
        const next = { ...prev, [name]: Boolean(value) };
        persistFlags(next);
        return next;
      });
    },
    [persistFlags]
  );

  // Bulk update
  const setMultipleFlags = useCallback(
    (updates) => {
      setFlags((prev) => {
        const next = { ...prev };
        Object.entries(updates).forEach(([k, v]) => { next[k] = Boolean(v); });
        persistFlags(next);
        return next;
      });
    },
    [persistFlags]
  );

  // Reset to defaults
  const resetFlags = useCallback(() => {
    setFlags({ ...DEFAULT_FLAGS, ...overrides });
    persistFlags({ ...DEFAULT_FLAGS, ...overrides });
  }, [overrides, persistFlags]);

  // Check if a flag is enabled
  const isFeatureEnabled = useCallback(
    (name) => flags[name] === true,
    [flags]
  );

  const value = useMemo(
    () => ({
      flags,
      setFlag,
      setMultipleFlags,
      resetFlags,
      isFeatureEnabled,
      allFlagNames: Object.keys(DEFAULT_FLAGS),
    }),
    [flags, setFlag, setMultipleFlags, resetFlags, isFeatureEnabled]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the full feature-flag context.
 */
export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within <FeatureFlagProvider>');
  return ctx;
}

/**
 * Check a single feature flag.
 * @param {string} flagName
 * @returns {boolean}
 */
export function useFeatureFlag(flagName) {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(flagName);
}

export default FeatureFlagContext;
