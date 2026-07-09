import { Component } from 'react';
import { withT } from './withT';

class ErrorBoundaryBase extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">{t('error.boundary.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('error.boundary.body')}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t('error.boundary.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withT(ErrorBoundaryBase);
