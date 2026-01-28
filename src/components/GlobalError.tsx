
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalError extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
          <div className="max-w-md w-full bg-card border border-destructive/50 rounded-lg p-6 shadow-lg">
            <h1 className="text-xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              An error occurred while rendering the application.
            </p>
            <pre className="bg-secondary/50 p-4 rounded text-xs font-mono overflow-auto max-h-64 border border-border">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
