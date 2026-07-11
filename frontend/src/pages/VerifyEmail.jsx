import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/api';
import { MailCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const VerifyEmail = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token was provided in the link.');
      return;
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Your email has been verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This verification link is invalid or has expired.');
      });
  }, [token]);

  const icon = {
    verifying: <Loader2 className="w-8 h-8 text-white animate-spin" />,
    success: <CheckCircle2 className="w-8 h-8 text-white" />,
    error: <XCircle className="w-8 h-8 text-white" />,
  }[status];

  const badge = {
    verifying: 'from-teal-500 to-emerald-600',
    success: 'from-emerald-500 to-teal-600',
    error: 'from-rose-500 to-red-600',
  }[status];

  const heading = {
    verifying: 'Verifying your email…',
    success: 'Email verified',
    error: 'Verification failed',
  }[status];

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${dk ? 'from-slate-950 via-slate-900 to-slate-950' : 'from-slate-50 via-teal-50 to-emerald-100'} px-4 py-8 transition-colors duration-300`}>
      <div className="max-w-md w-full">
        <div className={`${dk ? 'bg-slate-800/80 backdrop-blur-xl shadow-black/30 border-slate-700/50' : 'bg-white border-white/50'} rounded-2xl shadow-xl border p-8 text-center`}>
          <div className="flex justify-center mb-5">
            <div className={`bg-gradient-to-br ${badge} rounded-2xl p-3 shadow-lg`}>
              {icon}
            </div>
          </div>

          <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-slate-900'} mb-2`}>{heading}</h2>
          <p className={`${dk ? 'text-slate-400' : 'text-slate-500'} text-sm mb-6`}>{message}</p>

          {status === 'success' && (
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all"
            >
              Go to Dashboard
            </button>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="block w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all"
              >
                Go to Dashboard
              </Link>
              <p className={`text-xs ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                You can request a new verification link from the banner inside the app.
              </p>
            </div>
          )}

          {status === 'verifying' && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <MailCheck className="w-4 h-4" /> Please wait a moment…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
