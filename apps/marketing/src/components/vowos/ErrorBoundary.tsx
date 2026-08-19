import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VowosErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VowOS Uncaught Application Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="flex min-h-screen flex-col items-center justify-center p-6 text-center"
          style={{ backgroundColor: 'var(--surface-canvas, #F8F5F1)', color: 'var(--text-primary, #1D1A20)' }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-sm mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="max-w-md text-sm text-stone-600 mb-6">
            {this.state.error?.message || 'An unexpected application error occurred. We have safely caught it to protect your data.'}
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reload VowOS
            </button>
            <a
              href={`mailto:nedpearson@gmail.com?subject=VowOS Production Error Report&body=An error occurred in the VIP Roberts Enterprises testing environment.%0A%0AError:%0A${encodeURIComponent(this.state.error?.message || 'Unknown Error')}%0A%0AStack Trace:%0A${encodeURIComponent(this.state.error?.stack || 'No stack trace available')}%0A%0ARecommendation: Please investigate and provide the best case scenario resolution.`}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              Report to nedpearson@gmail.com
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
