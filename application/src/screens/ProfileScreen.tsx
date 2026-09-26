import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { logout } from '../services/authService';
import { getUser } from '../services/storage';
import { getPendingCount } from '../services/offlineTaskService';
import { getConnectionStatus, subscribeToNetwork } from '../services/networkService';
import LanguageToggle from '../components/LanguageToggle';
import colors from '../theme/colors';
import type { ProfileStackParamList, RootStackParamList, User } from '../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

type SettingItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  hasSwitch?: boolean;
  route?: keyof ProfileStackParamList;
  tab?: 'Messages';
};

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'attendance-check-in',
    title: 'Attendance Check-In',
    subtitle: 'Submit a geo-tagged attendance photo',
    icon: 'camera-outline',
    accentColor: colors.success,
    route: 'AttendanceCheckIn',
  },
  {
    id: 'assigned-actions',
    title: 'Assigned Actions',
    subtitle: 'View and update your tasks',
    icon: 'clipboard-outline',
    accentColor: colors.gold,
    tab: 'Messages',
  },
  {
    id: 'offline-sync',
    title: 'Offline Sync Mode',
    subtitle: 'Save data without internet',
    icon: 'cloud-offline-outline',
    accentColor: '#3B82F6',
    hasSwitch: true,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'View safety alerts',
    icon: 'notifications-outline',
    accentColor: colors.success,
  },
  {
    id: 'help-support',
    title: 'Help & Support',
    subtitle: 'Contact system admin',
    icon: 'help-circle-outline',
    accentColor: colors.gold,
  },
];

export default function ProfileScreen({ navigation }: Props) {
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getUser().then(setUser);
      getPendingCount().then(setPendingCount);
      getConnectionStatus().then((s) => setIsOnline(s === 'online'));
    }, []),
  );

  useEffect(() => {
    const unsub = subscribeToNetwork((status) => setIsOnline(status === 'online'));
    return unsub;
  }, []);

  const visibleSettings = useMemo(() => SETTINGS_ITEMS.map((item) => {
    if (item.id === 'assigned-actions' && pendingCount > 0) {
      return {
        ...item,
        subtitle: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`,
      };
    }
    if (item.id === 'offline-sync') {
      return {
        ...item,
        subtitle: isOnline ? 'Connected — auto-sync enabled' : 'Offline — data saved locally',
      };
    }
    return item;
  }), [pendingCount, isOnline]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          const rootNavigation = navigation.getParent()?.getParent();
          rootNavigation?.reset({
            index: 0,
            routes: [{ name: 'Login' as keyof RootStackParamList }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <Ionicons name="person-circle" size={70} color={colors.navy} />
          <Text style={styles.profileName}>{user?.name ?? 'MineOS User'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          <Text style={styles.roleBadge}>Mine Worker</Text>
        </View>

        <Text style={styles.sectionTitle}>APP SETTINGS</Text>

        <View style={styles.settingsList}>
          {visibleSettings.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.settingCard, pressed && styles.settingCardPressed]}
              onPress={() => {
                if (item.route) {
                  // Cast required: item.route is keyof ProfileStackParamList (string union),
                  // but navigate() expects a literal overload. The actual value is always
                  // one of the valid screen names at runtime.
                  navigation.navigate(item.route as 'AttendanceCheckIn');
                } else if (item.tab) {
                  navigation.getParent()?.navigate(item.tab);
                }
              }}
            >
              <View style={[styles.accentLine, { backgroundColor: item.accentColor }]} />
              <View style={styles.settingContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.navyLight }]}>
                  <Ionicons name={item.icon} size={22} color={item.accentColor} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                {item.hasSwitch ? (
                  <Switch
                    value={offlineSyncEnabled}
                    onValueChange={setOfflineSyncEnabled}
                    trackColor={{ false: '#475569', true: colors.gold }}
                    thumbColor={colors.white}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Language Toggle — standalone card below the settings list */}
        <View style={styles.languageSection}>
          <Text style={styles.sectionTitle}>LANGUAGE</Text>
          <LanguageToggle />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  profileEmail: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  languageSection: {
    marginTop: 24,
  },
  settingsList: {
    gap: 12,
  },
  settingCard: {
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingCardPressed: {
    opacity: 0.92,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  settingContent: {
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
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
