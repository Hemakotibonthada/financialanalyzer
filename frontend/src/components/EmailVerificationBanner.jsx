import React, { useState } from 'react';
import { MailWarning, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { toast } from 'react-toastify';

/**
 * Shows an amber banner prompting users to verify their email.
 * Only renders for local (MongoDB) accounts that explicitly report
 * emailVerification.verified === false — existing/legacy and Firebase
 * accounts (where the field is absent) are never nagged.
 */
const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('emailBannerDismissed') === '1'
  );
  const [sending, setSending] = useState(false);

  const needsVerification = user?.emailVerification && user.emailVerification.verified === false;
  if (!needsVerification || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await authService.resendVerification();
      toast.success(res.data?.message || 'Verification email sent.');
      if (res.data?.devUrl) {
        // Convenience in local dev when SMTP isn't configured.
        console.info('[verify] Dev verification link:', res.data.devUrl);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send verification email.');
    } finally {
      setSending(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('emailBannerDismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Please verify your email address
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
            Confirm <span className="font-medium">{user.email}</span> to secure your account and receive alerts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleResend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {sending ? 'Sending…' : 'Resend email'}
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
