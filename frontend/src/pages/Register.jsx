import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeGradientText, ThemeButton } from '../components/ui/ThemePageComponents';
import { toast } from 'react-toastify';
import { DollarSign, Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';

// Password strength calculator
const getPasswordStrength = (password) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  score = Object.values(checks).filter(Boolean).length;
  
  let label, color;
  if (score <= 1) { label = 'Very Weak'; color = 'bg-red-500'; }
  else if (score === 2) { label = 'Weak'; color = 'bg-orange-500'; }
  else if (score === 3) { label = 'Fair'; color = 'bg-yellow-500'; }
  else if (score === 4) { label = 'Good'; color = 'bg-blue-500'; }
  else { label = 'Strong'; color = 'bg-green-500'; }
  
  return { score, checks, label, color, percentage: (score / 5) * 100 };
};

const Register = () => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await register(name, email, password);
      
      if (result.success) {
        // Redirect to dashboard after successful registration
        navigate('/dashboard', { replace: true });
      } else {
        // Show server-side error message to user
        const msg = result.message || 'Registration failed. Please try again.';
        setError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${dk ? 'from-slate-950 via-slate-900 to-slate-950' : 'from-slate-50 via-blue-50 to-indigo-100'} px-4 py-8 transition-colors duration-300`}>
      <div className="max-w-md w-full">
        <div className={`${dk ? 'bg-slate-800/80 backdrop-blur-xl shadow-black/30 border-slate-700/50' : 'bg-white border-white/50'} rounded-2xl shadow-xl border p-6 sm:p-8`}>
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2.5 sm:p-3 shadow-lg shadow-blue-500/25">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h2 className={`text-2xl sm:text-3xl font-bold text-center ${dk ? 'text-white' : 'text-slate-900'} mb-2`}>
            Create Account
          </h2>
          <p className={`text-center ${dk ? 'text-slate-400' : 'text-slate-500'} text-sm sm:text-base mb-6 sm:mb-8`}>
            Start managing your finances smartly
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Inline error banner */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5 cursor-pointer hover:text-red-300" onClick={() => setError('')} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="reg-name" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1.5 sm:mb-2`}>Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <User className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 ${dk ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'} border rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all text-sm sm:text-base`}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1.5 sm:mb-2`}>Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 ${dk ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'} border rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all text-sm sm:text-base`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1.5 sm:mb-2`}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-10 py-2.5 ${dk ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'} border rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all text-sm sm:text-base`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 ${dk ? 'hover:text-slate-300' : 'hover:text-slate-600'} transition-colors`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Password strength:</span>
                    <span className={`text-xs font-bold ${
                      passwordStrength.score <= 2 ? 'text-red-500' : 
                      passwordStrength.score === 3 ? 'text-yellow-500' : 'text-green-500'
                    }`}>{passwordStrength.label}</span>
                  </div>
                  <div className={`w-full ${dk ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-1.5`}>
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`} 
                         style={{ width: `${passwordStrength.percentage}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[
                      { key: 'length', label: '8+ characters' },
                      { key: 'uppercase', label: 'Uppercase letter' },
                      { key: 'lowercase', label: 'Lowercase letter' },
                      { key: 'number', label: 'Number' },
                      { key: 'special', label: 'Special character' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1">
                        {passwordStrength.checks[key] 
                          ? <Check className="w-3 h-3 text-green-500" /> 
                          : <X className={`w-3 h-3 ${dk ? 'text-slate-600' : 'text-slate-300'}`} />}
                        <span className={`text-xs ${passwordStrength.checks[key] ? (dk ? 'text-green-400' : 'text-green-600') : (dk ? 'text-slate-500' : 'text-slate-400')}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className={`block text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'} mb-1.5 sm:mb-2`}>Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 sm:h-5 sm:w-5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-10 py-2.5 ${dk ? 'bg-slate-700/50 text-white placeholder-slate-500 focus:border-blue-400' : 'bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'} border rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all text-sm sm:text-base ${
                    confirmPassword && confirmPassword !== password ? (dk ? 'border-red-500' : 'border-red-400') : (dk ? 'border-slate-600' : 'border-slate-300')
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 ${dk ? 'hover:text-slate-300' : 'hover:text-slate-600'} transition-colors`}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${dk ? 'focus:ring-offset-slate-800' : ''} disabled:opacity-50 transition-all duration-200`}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 text-center">
            <p className={`text-xs sm:text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              Already have an account?{' '}
              <Link to="/login" className={`${dk ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-medium`}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
