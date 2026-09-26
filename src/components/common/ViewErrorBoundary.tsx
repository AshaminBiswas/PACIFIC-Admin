import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onResetView?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ViewErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Pacific ViewErrorBoundary] Uncaught view error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onResetView) {
      this.props.onResetView();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || '';
      const isChunkError =
        errorMsg.includes('dynamically imported module') ||
        errorMsg.includes('Failed to load module script') ||
        errorMsg.includes('Strict MIME type checking') ||
        errorMsg.includes('Loading chunk');

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {isChunkError ? 'Console Update Detected' : 'View Loading Error'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isChunkError
                  ? 'A newer version of the Pacific Admin Console was recently published. Reloading will apply the latest assets.'
                  : 'An unexpected error occurred while rendering this module. You can reload or return to dashboard.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold text-xs shadow-lg shadow-[#7FB706]/20 transition active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Reload Console</span>
              </button>

              {this.props.onResetView && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition active:scale-95 border border-white/10"
                >
                  <Home size={14} />
                  <span>Go to Overview</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
