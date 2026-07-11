import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

/**
 * Shared shell for public legal pages (Terms, Privacy).
 * Theme-aware, responsive, readable typography.
 */
const LegalLayout = ({ title, updated, children }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const appName = 'Financial Analyzer';

  return (
    <div className={`min-h-screen ${dk ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${dk ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} border-b backdrop-blur sticky top-0 z-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-2 shadow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-lg ${dk ? 'text-white' : 'text-slate-900'}`}>{appName}</span>
          </Link>
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${dk ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl shadow-sm p-6 sm:p-10`}>
          <h1 className={`text-3xl font-bold mb-1 ${dk ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
          <p className={`text-sm mb-8 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Last updated: {updated}</p>
          <div className={`legal-prose space-y-6 text-[15px] leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
            {children}
          </div>
        </div>

        <div className={`mt-6 text-center text-sm ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link to="/login" className="hover:underline">Sign in</Link>
        </div>
      </main>
    </div>
  );
};

export const LegalSection = ({ heading, children }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  return (
    <section>
      <h2 className={`text-lg font-semibold mb-2 ${dk ? 'text-white' : 'text-slate-900'}`}>{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
};

export default LegalLayout;
