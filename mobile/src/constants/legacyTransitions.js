/**
 * Allowed claim-status transitions for the Legacy Guard module.
 *
 * This is a verbatim copy of CLAIM_STATUS_TRANSITIONS from
 * backend/constants/legacyConstants.js.
 *
 * Drift between this file and the backend constant will cause the UI
 * to hide a valid action or offer an invalid one.
 * scripts/verify-legacy-transitions.js enforces that the two stay
 * identical — run it (or let CI run it) before merging any change to
 * either file.
 */
export const CLAIM_STATUS_TRANSITIONS = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['acknowledged', 'rejected', 'withdrawn'],
  acknowledged: [
    'under_review',
    'additional_info_required',
    'rejected',
    'withdrawn',
  ],
  under_review: [
    'approved',
    'rejected',
    'additional_info_required',
    'withdrawn',
  ],
  additional_info_required: ['under_review', 'submitted', 'withdrawn'],
  approved: ['settled'],
  rejected: ['appealed', 'withdrawn'],
  appealed: ['under_review', 'rejected'],
  settled: [],
  withdrawn: [],
};
