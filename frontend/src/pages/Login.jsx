import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeGradientText, ThemeButton } from '../components/ui/ThemePageComponents';
import { DollarSign, Mail, Lock, Eye, EyeOff, AlertCircle, Play } from 'lucide-react';

const Login = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMonth, setRememberMonth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password, { rememberThisMonth: rememberMonth });
      
      if (result.success) {
        // Redirect to dashboard after successful login
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const result = await login('demo@financialanalyzer.com', 'Demo@123456', { rememberThisMonth: false });
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Demo login failed. Please ensure the demo account is set up.');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      setError('Demo account not available. Please contact the administrator.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${dk ? 'from-slate-950 via-slate-900 to-slate-950' : 'from-slate-50 via-blue-50 to-indigo-100'} px-4 py-8 transition-colors duration-300`}>
      <div className="max-w-md w-full">
        <div className={`${dk ? 'bg-slate-800/80 backdrop-blur-xl shadow-black/30 border-slate-700/50' : 'bg-white border-white/50'} rounded-2xl shadow-xl border p-6 sm:p-8`}>
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2.5 sm:p-3 shadow-lg shadow-blue-500/25">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h2 className={`text-2xl sm:text-3xl font-bold text-center ${dk ? 'text-white' : 'text-slate-900'} mb-2`}>
            Welcome Back
          </h2>
          <p className={`text-center ${dk ? 'text-slate-400' : 'text-slate-500'} text-sm sm:text-base mb-6 sm:mb-8`}>
            Sign in to your Financial Analyzer account
          </p>

          {error && (
            <div className={`flex items-start gap-2 p-3 sm:p-4 ${dk ? 'bg-red-900/20 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'} border rounded-xl text-sm mb-4 animate-shake`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1.5 sm:mb-2`}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 ${dk ? 'bg-slate-700/50' : 'bg-white'} border ${error ? (dk ? 'border-red-600' : 'border-red-300') : (dk ? `border-slate-600` : `border-slate-300`)} rounded-xl ${dk ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'} focus:ring-2 focus:ring-blue-500/40 ${dk ? `focus:border-blue-400` : `focus:border-blue-500`} transition-all text-sm sm:text-base`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-2`}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`block w-full pl-9 sm:pl-10 pr-10 py-2.5 ${dk ? 'bg-slate-700/50' : 'bg-white'} border ${error ? (dk ? 'border-red-600' : 'border-red-300') : (dk ? `border-slate-600` : `border-slate-300`)} rounded-xl ${dk ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'} focus:ring-2 focus:ring-blue-500/40 ${dk ? `focus:border-blue-400` : `focus:border-blue-500`} transition-all text-sm sm:text-base`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 ${dk ? 'hover:text-slate-300' : 'hover:text-slate-600'} transition-colors`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start sm:items-center">
              <input
                type="checkbox"
                id="rememberMonth"
                checked={rememberMonth}
                onChange={(e) => setRememberMonth(e.target.checked)}
                className={`h-4 w-4 mt-0.5 sm:mt-0 text-blue-600 focus:ring-blue-500 ${dk ? 'border-slate-600 bg-slate-700' : 'border-slate-300'} rounded flex-shrink-0`}
              />
              <label htmlFor="rememberMonth" className={`ml-2 block text-xs sm:text-sm ${dk ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                Save this login for the rest of the month (don't ask)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${dk ? 'focus:ring-offset-slate-800' : ''} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Login Divider */}
          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${dk ? 'border-slate-700' : 'border-slate-200'}`} />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className={`px-3 ${dk ? 'bg-slate-800/80 text-slate-500' : 'bg-white text-slate-400'}`}>
                or
              </span>
            </div>
          </div>

          {/* Demo Login Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${dk ? 'focus:ring-offset-slate-800' : ''} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
          >
            <Play className="w-4 h-4 fill-current" />
            {demoLoading ? 'Loading Demo...' : 'Try Demo Account'}
          </button>
          <p className={`text-center text-xs ${dk ? 'text-slate-500' : 'text-slate-400'} mt-2`}>
            Explore with pre-loaded financial data — no sign-up needed
          </p>

          <div className="mt-5 sm:mt-6 text-center space-y-2">
            <p className={`text-xs sm:text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              <Link to="/forgot-password" className={`${dk ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-medium`}>
                Forgot your password?
              </Link>
            </p>
            <p className={`text-xs sm:text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              Don't have an account?{' '}
              <Link to="/register" className={`${dk ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-medium`}>
                Sign up
              </Link>
            </p>
            <p className={`text-[11px] ${dk ? 'text-slate-500' : 'text-slate-400'} pt-1`}>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <span className="mx-1.5">·</span>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
