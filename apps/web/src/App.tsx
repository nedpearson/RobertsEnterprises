import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { router } from './app/routes';
import './index.css';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#c0392b' }}>Something went wrong</h2>
          <p style={{ color: '#666', fontFamily: 'monospace', fontSize: 13 }}>{this.state.error.message}</p>
          <button
            style={{
              padding: '10px 20px',
              background: '#1a1a2e',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              marginTop: 16
            }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
