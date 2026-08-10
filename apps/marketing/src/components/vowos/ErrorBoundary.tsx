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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-primary shadow-sm mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-2xl text-stone-900 font-bold">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-stone-600">
            {this.state.error?.message || 'An unexpected application error occurred. We have safely caught it to protect your data.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reload VowOS
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
