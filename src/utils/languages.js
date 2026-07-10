import heNames from '../i18n/languageNames.he.json';

// The country dataset only has English language names (from the source
// dataset). This translates a { code, name } language entry to Hebrew using
// our own hand-built dictionary, falling back to the English name for the
// handful of obscure languages/dialects that dictionary doesn't cover.
export function getLanguageName(language, lang) {
  if (lang === 'he') return heNames[language.code] || language.name;
  return language.name;
}
