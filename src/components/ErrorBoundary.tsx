import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream-surface flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-sage-border shadow-hover p-8 text-center">
            
            {/* Official Nivaro Wordmark on Dark Backing */}
            <div className="h-14 px-5 py-2.5 rounded-2xl bg-black border border-[#4A4A4A]/30 shadow-sm flex items-center justify-center mx-auto mb-5 w-fit">
              <img
                src="/brand/nivaro-logo.png"
                alt="Nivaro"
                className="h-9 w-auto object-contain"
                width={1024}
                height={342}
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-3 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
              <span>Unexpected Issue</span>
            </div>

            <h1 className="text-2xl font-extrabold text-walnut-deep mb-2">
              Something Needs Repair!
            </h1>

            <p className="text-sm text-walnut-medium mb-6 leading-relaxed">
              We encountered an unexpected glitch while rendering the page. Don't worry, your data is safe.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-glow hover:bg-amber-hover text-walnut-deep font-bold text-sm shadow-subtle transition-all cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sage-light hover:bg-sage/10 text-walnut-deep border border-sage-border font-semibold text-sm transition-all cursor-pointer min-h-[44px]"
              >
                <Home className="w-4 h-4 text-sage" aria-hidden="true" />
                <span>Back to Homepage</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
