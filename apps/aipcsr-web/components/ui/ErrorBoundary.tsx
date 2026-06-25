'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex w-full h-full min-h-[400px] items-center justify-center p-6">
          <ErrorState 
            title="UI Error" 
            description="A rendering error occurred in this section."
            onRetry={() => this.setState({ hasError: false, error: undefined })}
            // @ts-ignore
            error={{ status: 500, message: this.state.error?.message, detail: this.state.error?.stack }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
