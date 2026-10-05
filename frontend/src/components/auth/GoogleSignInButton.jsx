/**
 * GoogleSignInButton — FoodBridge Google Identity Services Button.
 * Seamlessly integrates Google Identity Services with FoodBridge design language.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '967870553184-htkviano4mbbi9ld77qrnd4kl1cfq1c2.apps.googleusercontent.com';

export const GoogleSignInButton = ({
  onSuccess,
  onError,
  disabled = false,
  text = 'Continue with Google',
}) => {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const gsiContainerRef = useRef(null);

  const handleCredentialResponse = useCallback(
    (response) => {
      setLoading(false);
      if (response?.credential) {
        if (onSuccess) onSuccess(response.credential);
      } else {
        if (onError) {
          onError(new Error('Google sign-in could not be completed. Please try again.'));
        }
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    let isMounted = true;

    const initGsi = () => {
      if (!isMounted) return;
      if (window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup',
          });

          if (gsiContainerRef.current) {
            // Render GIS button over the container
            window.google.accounts.id.renderButton(gsiContainerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: 360,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }
        } catch (err) {
          console.warn('Google Identity Services initialization warning:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 150);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [handleCredentialResponse]);

  const handleFallbackClick = () => {
    if (disabled || loading) return;

    setLoading(true);

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setLoading(false);
          }
        });
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
      if (onError) {
        onError(
          new Error('Google Sign-In is initializing. Please try again in a few seconds.')
        );
      }
    }
  };

  const isBtnDisabled = disabled || loading;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* ── Custom FoodBridge Styled Button (Visual Layer) ── */}
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleFallbackClick}
        disabled={isBtnDisabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={loading ? 'Connecting to Google…' : text}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 10,
          border: hovered && !isBtnDisabled ? '1px solid #9CA3AF' : '1px solid #D1D5DB',
          background: hovered && !isBtnDisabled ? '#F9FAFB' : '#FFFFFF',
          color: '#374151',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
          opacity: isBtnDisabled ? 0.65 : 1,
          boxShadow: focused
            ? '0 0 0 3px rgba(255, 90, 47, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05)'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          outline: 'none',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '0 16px',
          userSelect: 'none',
        }}
      >
        {loading ? (
          <>
            <svg
              style={{
                width: 18,
                height: 18,
                animation: 'fb-spin 1s linear infinite',
                color: '#6B7280',
              }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="30 60"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ color: '#4B5563', fontSize: 13.5 }}>Connecting to Google…</span>
          </>
        ) : (
          <>
            {/* Google Multi-Color G Logo */}
            <svg
              style={{ width: 18, height: 18, flexShrink: 0 }}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span style={{ color: '#374151', fontSize: 14 }}>{text}</span>
          </>
        )}
      </button>

      {/* ── Native Google GIS Iframe Overlay ── */}
      {/* Positioned on top with opacity 0.001 to capture authentic browser user gestures directly */}
      <div
        ref={gsiContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.001,
          zIndex: 10,
          cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
          pointerEvents: isBtnDisabled ? 'none' : 'auto',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      <style>{`
        @keyframes fb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleSignInButton;

