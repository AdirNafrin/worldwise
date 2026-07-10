import { Component } from 'react';
import { withT } from './withT';

// React only supports error boundaries as class components, which is why
// this one isn't a function component like the rest of the app. It catches
// any render/lifecycle error thrown by its children and shows a friendly
// fallback screen with a reload button instead of a blank white page.
class ErrorBoundaryBase extends Component {
  state = { hasError: false };

  // Called by React after a child throws during render; flips this
  // boundary into its fallback UI state.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Called after the error has been caught, purely for diagnostics.
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
    // No error: render the app as normal.
    return this.props.children;
  }
}

// Wrapped with withT so it can show translated text despite being a class
// component that can't call the useI18n hook itself.
export const ErrorBoundary = withT(ErrorBoundaryBase);
