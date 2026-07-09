import { useI18n } from '../i18n/I18nContext';

export function withT(WrappedComponent) {
  return function WithT(props) {
    const { t } = useI18n();
    return <WrappedComponent {...props} t={t} />;
  };
}
