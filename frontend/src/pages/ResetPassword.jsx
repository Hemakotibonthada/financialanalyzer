import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/api';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Landing page for the emailed reset link (/reset-password?token=...).
 *
 * The token is single-use and expires after an hour, so a failure here is
 * expected often enough that the error path has to be genuinely helpful:
 * it offers a way to request a fresh link rather than dead-ending.
 */
const ResetPassword = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [message, setMessage] = useState('');

  const problem = useMemo(() => {
    if (!password) return null;
    if (password.length < 6) return 'Use at least 6 characters.';
    if (confirm && password !== confirm) return 'Both passwords must match.';
    return null;
  }, [password, confirm]);

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'saving') return;

    if (!token) {
      setStatus('error');
      setMessage('This link is missing its reset token. Please request a new one.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('Your new password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Both passwords must match.');
      return;
    }

    setStatus('saving');
    setMessage('');

    try {
      const res = await authService.resetPassword(token, password);
      setStatus('done');
      setMessage(res.data?.message || 'Your password has been reset.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message
        || 'That reset link is invalid or has expired. Please request a new one.'
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

  const badge = status === 'done'
    ? 'from-emerald-500 to-teal-600'
    : status === 'error'
      ? 'from-rose-500 to-red-600'
      : 'from-teal-500 to-emerald-600';

  const icon = status === 'done'
    ? <CheckCircle2 className="w-8 h-8 text-white" />
    : status === 'error'
      ? <XCircle className="w-8 h-8 text-white" />
      : <ShieldCheck className="w-8 h-8 text-white" />;

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${shell} px-4 py-8 transition-colors duration-300`}
    >
      <div className="max-w-md w-full">
        <div className={`${card} rounded-2xl shadow-xl border p-8`}>
          <div className="flex justify-center mb-5">
            <div className={`bg-gradient-to-br ${badge} rounded-2xl p-3 shadow-lg`}>{icon}</div>
          </div>

          <h2
            className={`text-2xl font-bold text-center ${dk ? 'text-white' : 'text-slate-900'} mb-2`}
          >
            {status === 'done' ? 'Password updated' : 'Choose a new password'}
          </h2>

          {status === 'done' ? (
            <>
              <p
                className={`${dk ? 'text-slate-400' : 'text-slate-500'} text-sm text-center mb-6`}
              >
                {message} For your security, every other signed-in device was signed out.
              </p>
              <button
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all"
                onClick={() => navigate('/login', { replace: true })}
                type="button"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <p
                className={`${dk ? 'text-slate-400' : 'text-slate-500'} text-sm text-center mb-6`}
              >
                Pick something you have not used here before.
              </p>

              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label
                    className={`block text-sm font-medium mb-1.5 ${dk ? 'text-slate-300' : 'text-slate-700'}`}
                    htmlFor="new-password"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="new-password"
                      autoFocus
                      className={`w-full px-4 py-3 pr-11 rounded-xl border ${field} focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                      id="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      type={reveal ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={reveal ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setReveal((v) => !v)}
                      type="button"
                    >
                      {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1.5 ${dk ? 'text-slate-300' : 'text-slate-700'}`}
                    htmlFor="confirm-password"
                  >
                    Confirm new password
                  </label>
                  <input
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl border ${field} focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                    id="confirm-password"
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    type={reveal ? 'text' : 'password'}
                    value={confirm}
                  />
                </div>

                {problem && (
                  <p className={`text-sm ${dk ? 'text-amber-400' : 'text-amber-600'}`}>{problem}</p>
                )}
                {status === 'error' && (
                  <p className="text-sm text-rose-500" role="alert">{message}</p>
                )}

                <button
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                  disabled={status === 'saving' || Boolean(problem) || !password || !confirm}
                  type="submit"
                >
                  {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {status === 'saving' ? 'Saving…' : 'Set new password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  className={`text-sm font-medium ${dk ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                  to="/forgot-password"
                >
                  Request a new link
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
