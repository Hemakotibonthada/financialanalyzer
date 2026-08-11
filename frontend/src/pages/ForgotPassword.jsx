import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/api';
import { KeyRound, Loader2, MailCheck, ArrowLeft } from 'lucide-react';

/**
 * Request a password reset link.
 *
 * The backend deliberately answers identically for known and unknown
 * addresses so this page cannot be used to discover which emails have
 * accounts. This screen must not undo that by saying anything more specific
 * than what the API returns.
 */
const ForgotPassword = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;

    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const res = await authService.forgotPassword(trimmed);
      setStatus('sent');
      setMessage(
        res.data?.message
        || 'If an account exists for that address, a reset link is on its way.'
      );
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message
        || 'We could not send the reset email. Please try again shortly.'
      );
    }
  };

  const shell = dk
    ? 'from-slate-950 via-slate-900 to-slate-950'
    : 'from-slate-50 via-teal-50 to-emerald-100';
  const card = dk
    ? 'bg-slate-800/80 backdrop-blur-xl shadow-black/30 border-slate-700/50'
    : 'bg-white border-white/50';
  const field = dk
    ? 'bg-slate-900/60 border-slate-700 text-white placeholder-slate-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${shell} px-4 py-8 transition-colors duration-300`}
    >
      <div className="max-w-md w-full">
        <div className={`${card} rounded-2xl shadow-xl border p-8`}>
          <div className="flex justify-center mb-5">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-3 shadow-lg">
              {status === 'sent'
                ? <MailCheck className="w-8 h-8 text-white" />
                : <KeyRound className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h2
            className={`text-2xl font-bold text-center ${dk ? 'text-white' : 'text-slate-900'} mb-2`}
          >
            {status === 'sent' ? 'Check your inbox' : 'Forgot your password?'}
          </h2>
          <p
            className={`${dk ? 'text-slate-400' : 'text-slate-500'} text-sm text-center mb-6`}
          >
            {status === 'sent'
              ? message
              : 'Enter the email address on your account and we will send you a link to set a new password.'}
          </p>

          {status !== 'sent' && (
            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${dk ? 'text-slate-300' : 'text-slate-700'}`}
                  htmlFor="reset-email"
                >
                  Email address
                </label>
                <input
                  autoComplete="email"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border ${field} focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  id="reset-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-rose-500" role="alert">{message}</p>
              )}

              <button
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                disabled={status === 'sending'}
                type="submit"
              >
                {status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'sending' ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          {status === 'sent' && (
            <p className={`text-xs text-center ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              The link expires in one hour and can only be used once. If it does not arrive,
              check your spam folder before requesting another.
            </p>
          )}

          <div className="mt-6 text-center">
            <Link
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${dk ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
              to="/login"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
