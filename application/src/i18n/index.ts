/**
 * src/i18n/index.ts
 *
 * Initializes i18next with react-i18next for multilingual support.
 *
 * - Detects the device's preferred locale using expo-localization.
 * - Supports English ('en') and Hindi ('hi'); falls back to 'en'.
 * - Persists the user's manual language choice in AsyncStorage.
 * - Call `import '../i18n'` once at the app entry point (index.ts).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import hi from './hi.json';

export type SupportedLanguage = 'en' | 'hi';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi'];
const LANGUAGE_STORAGE_KEY = 'mineos_language';

/** Returns the saved user preference, or detects device locale, defaulting to 'en'. */
async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    // 1. Check if user has manually set a language preference.
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }

    // 2. Detect device locale (e.g. 'hi-IN' → 'hi').
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode ?? 'en';
    if (SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)) {
      return deviceLang as SupportedLanguage;
    }
  } catch {
    // AsyncStorage or locale read failure — fall through to default.
  }

  return 'en';
}

/** Saves the user's chosen language to AsyncStorage. */
export async function saveLanguagePreference(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

// Initialize i18next synchronously with English as the immediate fallback.
// resolveInitialLanguage() runs asynchronously and changes the language once ready.
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: 'en',           // immediate fallback — overridden below once AsyncStorage resolves
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React Native handles XSS natively
    },
  });

// Asynchronously apply the persisted / device-detected language.
resolveInitialLanguage().then((lang) => {
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
