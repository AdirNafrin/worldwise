import heNames from '../i18n/languageNames.he.json';

export function getLanguageName(language, lang) {
  if (lang === 'he') return heNames[language.code] || language.name;
  return language.name;
}
