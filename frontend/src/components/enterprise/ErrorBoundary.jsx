// ============================================================================
// Enterprise Error Boundary — Graceful Error Handling & Recovery
// ============================================================================

import React, { Component, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

// ============================================================================
// § 1 — Error Boundary Class Component
// ============================================================================

export class EnterpriseErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging (could be sent to a logging service)
    console.error('[EnterpriseErrorBoundary] Error caught:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Call optional onError callback
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

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
          retryCount: this.state.retryCount,
        });
      }

      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          retryCount={this.state.retryCount}
          level={this.props.level || 'page'}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// § 2 — Error Fallback UI Component
// ============================================================================

function ErrorFallbackUI({ error, errorInfo, onRetry, onGoHome, retryCount, level = 'page' }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyError = () => {
    const errorText = [
      `Error: ${error?.message}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `Stack: ${error?.stack}`,
      `Component: ${errorInfo?.componentStack}`,
    ].join('\n');

    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Compact widget for component-level errors
  if (level === 'widget') {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800
        rounded-xl p-4 text-center">
        <AlertTriangle size={20} className="text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">Something went wrong</p>
        <p className="text-xs text-red-500 dark:text-red-500 mt-1 mb-3">{error?.message}</p>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400
            rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <RefreshCw size={12} className="inline mr-1" /> Retry
        </button>
      </div>
    );
  }

  // Full page error screen
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30
            flex items-center justify-center animate-pulse">
            <AlertTriangle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something Went Wrong
          </h1>
          <p className="text-gray-500 text-sm">
            An unexpected error occurred. This has been automatically logged.
          </p>
        </div>

        {/* Error Message */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
          shadow-lg overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <Bug size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-red-700 dark:text-red-400 break-words">
                  {error?.message || 'Unknown error'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Details (expandable) */}
          <div className="border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-6 py-3 text-xs
                text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span>Technical Details</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="px-6 pb-4 space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={copyError}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500
                      hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Error'}
                  </button>
                </div>
                <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800
                  rounded-lg p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                  {error?.stack || 'No stack trace available'}
                </pre>
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Component Stack:</p>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800
                      rounded-lg p-3 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            disabled={retryCount >= 3}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl
              font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-blue-500/20"
          >
            <RefreshCw size={16} className={retryCount >= 3 ? '' : 'hover:animate-spin'} />
            {retryCount >= 3 ? 'Max Retries Reached' : `Try Again${retryCount > 0 ? ` (${retryCount}/3)` : ''}`}
          </button>
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-800
              text-gray-700 dark:text-gray-300 rounded-xl font-medium
              hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            <Home size={16} />
            Go Home
          </button>
        </div>

        {retryCount >= 3 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            If this issue persists, try clearing your browser cache or contact support.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// § 3 — API Error Handler Utility
// ============================================================================

export class APIError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Wraps an async function with standard error handling
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const { onError, fallback, rethrow = false } = options;

      // Axios error handling
      if (error.response) {
        const apiError = new APIError(
          error.response.data?.message || `API Error: ${error.response.status}`,
          error.response.status,
          error.response.data
        );

        if (onError) onError(apiError);
        if (rethrow) throw apiError;
        return fallback !== undefined ? fallback : null;
      }

      // Network error
      if (error.request) {
        const networkError = new APIError('Network error. Please check your connection.', 0);
        if (onError) onError(networkError);
        if (rethrow) throw networkError;
        return fallback !== undefined ? fallback : null;
      }

      // Other errors
      if (onError) onError(error);
      if (rethrow) throw error;
      return fallback !== undefined ? fallback : null;
    }
  };
}

// ============================================================================
// § 4 — Loading States
// ============================================================================

export function EnterpriseLoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: { spinner: 'w-6 h-6', text: 'text-xs' },
    md: { spinner: 'w-10 h-10', text: 'text-sm' },
    lg: { spinner: 'w-16 h-16', text: 'text-base' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${s.spinner} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent
          border-b-transparent border-l-transparent animate-spin" />
      </div>
      <p className={`${s.text} text-gray-500 mt-3`}>{text}</p>
    </div>
  );
}

export function EnterpriseSkeletonCard({ lines = 3, height = 'h-32' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
      p-6 animate-pulse ${height}`}>
      <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function EnterpriseDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      {/* Chart Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnterpriseSkeletonCard lines={5} height="h-64" />
        <EnterpriseSkeletonCard lines={5} height="h-64" />
      </div>
      {/* Table */}
      <EnterpriseSkeletonCard lines={8} height="h-80" />
    </div>
  );
}

// ============================================================================
// § 5 — Empty State Component
// ============================================================================

export function EnterpriseEmptyState({
  icon: Icon = AlertTriangle,
  title = 'No Data Available',
  description = 'There is no data to display at this time.',
  action,
  actionLabel,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
            font-medium hover:bg-blue-700 transition-all"
        >
          {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// § 6 — Exports
// ============================================================================

export default EnterpriseErrorBoundary;
