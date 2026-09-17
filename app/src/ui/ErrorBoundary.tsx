import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('NEXUS screen failed', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="stage"><main className="card m-6 max-w-sm p-7"><p className="eyebrow">NEXUS</p><h1 className="my-4 text-2xl font-bold">Let’s try that again.</h1><p className="mb-6 text-[var(--text-2)]">This screen couldn’t open. Your saved demo data is still in this browser.</p><button className="btn btn-primary" onClick={() => { location.hash = 'home'; location.reload(); }}>Reopen NEXUS</button></main></div>;
  }
}
