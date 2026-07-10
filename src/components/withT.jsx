import { useI18n } from '../i18n/I18nContext';

// Class components (like ErrorBoundary) can't call the useI18n hook
// directly, since hooks only work in function components. This wraps a
// class component so it still receives the translate function as a `t` prop.
export function withT(WrappedComponent) {
  return function WithT(props) {
    const { t } = useI18n();
    return <WrappedComponent {...props} t={t} />;
  };
}
