import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMonth, setRememberMonth] = useState(false);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8 transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-black/30 border border-white/50 dark:border-slate-700/50 p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2.5 sm:p-3 shadow-lg shadow-blue-500/25">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm sm:text-base mb-6 sm:mb-8">
            Sign in to your Financial Analyzer account
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-400 text-sm mb-4 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 bg-white dark:bg-slate-700/50 border ${error ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'} rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm sm:text-base`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`block w-full pl-9 sm:pl-10 pr-10 py-2.5 bg-white dark:bg-slate-700/50 border ${error ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'} rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm sm:text-base`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
                className="h-4 w-4 mt-0.5 sm:mt-0 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded flex-shrink-0 dark:bg-slate-700"
              />
              <label htmlFor="rememberMonth" className="ml-2 block text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Save this login for the rest of the month (don't ask)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 text-center space-y-2">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Forgot your password?
              </Link>
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
