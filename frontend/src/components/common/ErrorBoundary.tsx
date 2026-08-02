import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

const CHUNK_LOAD_PATTERNS = [
  /Loading chunk/,
  /Failed to fetch dynamically imported module/,
  /dynamically imported/,
  /Importing a module script failed/,
  /error loading dynamically/,
];

function isChunkLoadError(error: Error): boolean {
  return CHUNK_LOAD_PATTERNS.some((p) => p.test(error.message));
}

// Auth-related error patterns — occurs when auth state is stale or race-conditioned
const AUTH_ERROR_PATTERNS = [
  /Authentication required/,
  /Unauthorized/,
  /isAdminAuthValidated/,
  /Cannot read properties of undefined.*user/,
  /Cannot read properties of null.*user/,
];

function isAuthError(error: Error): boolean {
  return AUTH_ERROR_PATTERNS.some((p) => p.test(error.message));
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Callback to retry rendering after an error */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
  isAuthError: boolean;
  chunkRetryCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
      isAuthError: false,
      chunkRetryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
      isAuthError: isAuthError(error),
      chunkRetryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      // REQ-FE-BP-001: first retry resets the boundary → React re-renders →
      // retryLazy re-attempts the dynamic import. Only reload after a second
      // consecutive chunk failure (stale SW is the usual cause then).
      if (this.state.chunkRetryCount < 1) {
        this.setState((s) => ({
          hasError: false,
          error: null,
          isChunkError: false,
          isAuthError: false,
          chunkRetryCount: s.chunkRetryCount + 1,
        }));
        return;
      }
      window.location.reload();
      return;
    }
    if (this.state.isAuthError) {
      // For auth errors, redirect to login which forces full re-initialization
      window.location.href = '/rrfashion/#/auth/login';
      return;
    }
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({
      hasError: false,
      error: null,
      isChunkError: false,
      isAuthError: false,
      chunkRetryCount: 0,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-amber-500 mb-4" aria-hidden="true">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">New version available</h2>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              A new version of RR Fashion has been deployed. Please refresh your browser to get the latest update.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium"
                aria-label="Try loading the latest version again"
              >
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 font-medium"
                aria-label="Refresh the page to load the latest version"
              >
                Refresh Now
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-red-500 mb-4" aria-hidden="true">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-2 text-center max-w-md">
            An unexpected error occurred. You can try again or refresh the page.
          </p>
          {this.state.error && (
            <p className="text-sm text-gray-400 mb-6 text-center max-w-md font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Try again to load this content"
            >
              Try Again
            </button>
            <button
              onClick={this.handleRefresh}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              aria-label="Refresh the entire page"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
