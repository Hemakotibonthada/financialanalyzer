// ============================================================================
// Error Boundary — Graceful error handling for React components
// ============================================================================
// Catches JavaScript errors in component trees and displays a fallback UI.
// Includes auto-retry, error reporting, and dark mode support.
// ============================================================================

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.group('🔴 ErrorBoundary caught an error');
      console.error('Error:', error);
      console.error('Component stack:', errorInfo?.componentStack);
      console.groupEnd();
    }

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, retry: this.handleRetry })
          : this.props.fallback;
      }

      const isDark = document.documentElement.classList.contains('dark');
      const { error, errorInfo, retryCount, showDetails } = this.state;
      const maxRetries = this.props.maxRetries ?? 3;

      return (
        <div className={`min-h-[400px] flex items-center justify-center p-6 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <div className={`max-w-lg w-full rounded-2xl border p-8 text-center transition-all ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
            {/* Icon */}
            <div className={`inline-flex p-4 rounded-full mb-6 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            {/* Title */}
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {this.props.title || 'Something went wrong'}
            </h2>

            {/* Description */}
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {this.props.message || 'An unexpected error occurred. You can try again or go back to the dashboard.'}
            </p>

            {/* Error message */}
            {error && (
              <div className={`mb-6 rounded-xl p-3 text-left ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-xs font-mono ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {error.message || String(error)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                </button>
              )}
              <button
                onClick={this.handleGoHome}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>

            {/* Expandable stack trace (dev only) */}
            {import.meta.env.DEV && errorInfo && (
              <div className="mt-4">
                <button
                  onClick={this.toggleDetails}
                  className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showDetails ? 'Hide' : 'Show'} technical details
                </button>
                {showDetails && (
                  <pre className={`mt-2 p-3 rounded-lg text-left text-[10px] font-mono overflow-auto max-h-40 ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Page-level wrapper ─────────────────────────────────────────────
export function PageErrorBoundary({ children, pageName }) {
  return (
    <ErrorBoundary
      title={`Error in ${pageName || 'this page'}`}
      message="This section encountered an error. Your data is safe. Try refreshing or navigate to another page."
      maxRetries={3}
    >
      {children}
    </ErrorBoundary>
  );
}

// ─── Widget-level wrapper (inline, smaller) ─────────────────────────
export function WidgetErrorBoundary({ children, name }) {
  return (
    <ErrorBoundary
      fallback={({ retry }) => {
        const isDark = document.documentElement.classList.contains('dark');
        return (
          <div className={`rounded-xl p-4 border text-center ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}>
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {name || 'Widget'} failed to load
            </p>
            <button onClick={retry}
              className="mt-2 text-xs text-indigo-500 hover:text-indigo-400 font-medium">
              Retry
            </button>
          </div>
        );
      }}
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
