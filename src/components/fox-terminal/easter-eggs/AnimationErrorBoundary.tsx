/**
 * Animation Error Boundary
 * Catches errors in animations and falls back to text
 */

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  commandName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AnimationErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback to text-only display
      return (
        this.props.fallback || (
          <div className="text-red-400 font-mono">
            <div className="text-yellow-400 mb-2">
              ⚠️ Animation failed to load
            </div>
            <div className="text-sm text-gray-400">
              {this.props.commandName ? `Command: ${this.props.commandName}` : 'Unknown command'}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Error: {this.state.error?.message || 'Unknown error'}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
