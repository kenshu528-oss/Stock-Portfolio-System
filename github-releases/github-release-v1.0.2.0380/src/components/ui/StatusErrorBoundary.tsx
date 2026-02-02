import React, { Component, ErrorInfo, ReactNode } from 'react';
import { DisconnectedIcon } from './Icons';

interface Props {
  children: ReactNode;
  fallbackStatus?: {
    text: string;
    color: string;
    icon: React.ComponentType<{ className?: string; size?: 'sm' | 'md' | 'lg' }>;
  };
}

interface State {
  hasError: boolean;
  error?: Error;
}

class StatusErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Status rendering error:', error, errorInfo);
    
    // Log error details for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  public render() {
    if (this.state.hasError) {
      // Fallback UI for status rendering errors
      const fallback = this.props.fallbackStatus || {
        text: '狀態錯誤',
        color: 'text-red-400',
        icon: DisconnectedIcon
      };

      return (
        <div className="flex items-center gap-2" title="狀態顯示錯誤，已使用預設狀態">
          <fallback.icon className={fallback.color} size="sm" />
          <span className={`text-sm ${fallback.color}`}>
            {fallback.text}
          </span>
        </div>
      );
    }

    return this.props.children;
  }

  // Method to reset error boundary
  public resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };
}

export default StatusErrorBoundary;

// Hook to use with functional components
export const useStatusErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleStatusError = React.useCallback((error: Error) => {
    console.error('Status handling error:', error);
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleStatusError,
    resetError,
    hasError: !!error
  };
};