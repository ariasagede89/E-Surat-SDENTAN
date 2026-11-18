import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare state: ErrorBoundaryState;
  declare props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Terjadi kesalahan pada tampilan aplikasi.';
    return {
      hasError: true,
      errorMessage: msg,
    };
  }

  componentDidCatch(error: unknown, errorInfo: unknown): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      const keysToRemove = [
        'simas_sekolah',
        'simas_surat_masuk',
        'simas_surat_keluar',
        'simas_arsip',
        'simas_guru',
        'simas_siswa',
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">
                Terjadi Kendala Saat Memuat Tampilan
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi mengalami gangguan sementara saat memproses data. Data Anda di Cloud Firestore tetap aman.
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Cache Lokal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
