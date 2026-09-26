/**
 * LanguageToggle.tsx
 *
 * A self-contained language switcher pill component for the ProfileScreen.
 * Renders two pressable buttons: EN | हिं
 * On press, changes i18next language and persists the choice to AsyncStorage.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import i18n, { saveLanguagePreference, type SupportedLanguage } from '../i18n';
import colors from '../theme/colors';

const LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'EN', nativeLabel: 'English' },
  { code: 'hi', label: 'हिं', nativeLabel: 'हिंदी' },
];

export default function LanguageToggle() {
  const { t } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const currentLang = (i18n.language ?? 'en') as SupportedLanguage;

  const handleSwitch = async (lang: SupportedLanguage) => {
    if (lang === currentLang || switching) return;
    setSwitching(true);
    try {
      await saveLanguagePreference(lang);
      await i18n.changeLanguage(lang);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={[styles.accentLine, { backgroundColor: '#8B5CF6' }]} />

      <View style={styles.cardContent}>
        {/* Icon + label */}
        <View style={[styles.iconContainer, { backgroundColor: colors.navyLight }]}>
          <Ionicons name="language-outline" size={22} color="#8B5CF6" />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{t('profile.languageToggle')}</Text>
          <Text style={styles.subtitle}>{t('profile.languageSubtitle')}</Text>
        </View>

        {/* Toggle pill */}
        <View style={styles.pillContainer}>
          {switching ? (
            <ActivityIndicator size="small" color={colors.gold} style={styles.spinner} />
          ) : (
            LANGUAGES.map((lang, idx) => {
              const isActive = lang.code === currentLang;
              return (
                <Pressable
                  key={lang.code}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${lang.nativeLabel}`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => handleSwitch(lang.code)}
                  style={[
                    styles.pillButton,
                    idx === 0 && styles.pillLeft,
                    idx === LANGUAGES.length - 1 && styles.pillRight,
                    isActive && styles.pillActive,
                  ]}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {lang.label}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    minHeight: 36,
    alignItems: 'center',
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLeft: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
  },
  pillRight: {
    // no extra border
  },
  pillActive: {
    backgroundColor: colors.gold,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  pillTextActive: {
    color: colors.navy,
  },
  spinner: {
    paddingHorizontal: 14,
  },
});
