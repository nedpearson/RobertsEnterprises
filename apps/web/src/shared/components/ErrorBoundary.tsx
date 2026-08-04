import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in VowOS React Tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = '#/dashboard';
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FBF9F5',
          fontFamily: "'Jost', -apple-system, sans-serif",
          color: '#2B2A28',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: 500,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 10px 30px rgba(43,42,40,0.06)',
            border: '1px solid #ECE6DC'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#F6E5E2',
              color: '#B4453C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 'bold',
              margin: '0 auto 24px auto'
            }}>
              !
            </div>
            <h1 style={{
              fontSize: 24,
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              margin: '0 0 12px 0'
            }}>
              Something went wrong.
            </h1>
            <p style={{
              color: '#8A8178',
              fontSize: 15,
              lineHeight: 1.6,
              margin: '0 0 24px 0'
            }}>
              An unexpected error occurred in the layout renderer. You can try refreshing the page or returning to the dashboard.
            </p>
            {this.state.error && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#f8f9fa',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #eee',
                fontSize: 12,
                fontFamily: 'monospace',
                overflowX: 'auto',
                marginBottom: 24,
                color: '#B4453C'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center'
            }}>
              <button 
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ECE6DC',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#2B2A28',
                  transition: 'background-color 0.2s'
                }}
              >
                Reload Page
              </button>
              <button 
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#C9A15A',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 10px rgba(201,161,90,0.2)'
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
