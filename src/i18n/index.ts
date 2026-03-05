import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import ja from './ja';
import en from './en';

const i18n = new I18n({ ja, en });

i18n.defaultLocale = 'ja';
i18n.enableFallback = true;

export function initLocale(languageSetting: 'ja' | 'en' | 'system') {
  if (languageSetting === 'system') {
    const deviceLocale = getLocales()[0]?.languageCode ?? 'ja';
    i18n.locale = deviceLocale === 'en' ? 'en' : 'ja';
  } else {
    i18n.locale = languageSetting;
  }
}

export function t(scope: string, options?: Record<string, any>): string {
  return i18n.t(scope, options);
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

export { i18n };
