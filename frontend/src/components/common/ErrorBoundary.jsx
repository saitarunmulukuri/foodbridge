import React from 'react';
import { AlertCircle, RefreshCw, Home, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FoodBridge Application ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndGoHome = () => {
    try {
      localStorage.removeItem('foodbridge_token');
      localStorage.removeItem('foodbridge_user');
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env?.DEV;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#F8F9FB',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#FFF4F2',
                border: '1px solid #FFD0C8',
                color: '#FF5A2F',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={28} strokeWidth={2.2} />
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                marginBottom: '24px',
              }}
            >
              We encountered an unexpected issue while rendering this page. You can try reloading or returning to the home screen.
            </p>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#FF5A2F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(255, 90, 47, 0.3)',
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                <span>Try Again</span>
              </button>

              <button
                onClick={this.handleClearAndGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Home size={14} />
                <span>Go to Home</span>
              </button>
            </div>

            {/* Error detail for debugging */}
            {(isDev || this.state.error) && (
              <details
                style={{
                  marginTop: '16px',
                  textAlign: 'left',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                  Technical error details
                </summary>
                <pre
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#EF4444',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
