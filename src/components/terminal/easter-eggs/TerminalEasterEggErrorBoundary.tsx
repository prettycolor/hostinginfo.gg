import { Component, type ErrorInfo, type ReactNode } from "react";

interface TerminalEasterEggErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: () => void;
}

interface TerminalEasterEggErrorBoundaryState {
  hasError: boolean;
}

export class TerminalEasterEggErrorBoundary extends Component<
  TerminalEasterEggErrorBoundaryProps,
  TerminalEasterEggErrorBoundaryState
> {
  constructor(props: TerminalEasterEggErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TerminalEasterEggErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[TerminalEasterEggErrorBoundary] Easter egg crash caught:",
      error,
      info,
    );
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
