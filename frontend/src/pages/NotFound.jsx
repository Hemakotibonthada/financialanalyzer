import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * 404 Not Found page with helpful navigation options.
 */
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 Number */}
        <div className="mb-8">
          <h1
            className="text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700"
            aria-hidden="true"
          >
            404
          </h1>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-8 text-lg">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            Go Back
          </button>
          <Link
            to="/advanced-search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
            Search
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/analyze', label: 'Analyzer' },
              { to: '/reports', label: 'Reports' },
              { to: '/emi-tracker', label: 'EMI Tracker' },
              { to: '/investments', label: 'Investments' },
              { to: '/help', label: 'Help Center' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
