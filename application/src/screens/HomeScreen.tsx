import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import MineCard from '../components/MineCard';
import { fetchMines } from '../services/mineService';
import { getUser } from '../services/storage';
import colors from '../theme/colors';
import type { Mine, User } from '../types';

const TODAY_TASKS = [
  { id: '1', title: 'Ventilation check — Section B', due: '10:00 AM' },
  { id: '2', title: 'PPE compliance audit', due: '1:30 PM' },
  { id: '3', title: 'Dust level monitoring', due: '4:00 PM' },
];

const OPEN_VIOLATIONS = [
  { id: '1', title: 'PPE non-compliance', severity: 'High', mine: 'North Ridge' },
  { id: '2', title: 'Blocked emergency exit', severity: 'Critical', mine: 'East Valley' },
  { id: '3', title: 'Overdue equipment inspection', severity: 'Medium', mine: 'South Pit' },
];

function severityColor(severity: string): string {
  switch (severity) {
    case 'Critical':
      return colors.error;
    case 'High':
      return '#E27A00';
    case 'Medium':
      return colors.gold;
    default:
      return colors.textSecondary;
  }
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [mines, setMines] = useState<Mine[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMinesFromApi = useCallback(async () => {
    try {
      const data = await fetchMines();
      setMines(data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? 'Failed to load mines.'
        : 'Failed to load mines.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      getUser().then(setUser);
      loadMinesFromApi();
    }, [loadMinesFromApi]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMinesFromApi();
    setRefreshing(false);
  };

  const greeting = user?.name ? `Welcome, ${user.name}` : 'Welcome';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
    >
      <View style={styles.greetingCard}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.roleBadge}>Mine Worker</Text>
        <Text style={styles.greetingSubtext}>
          MineOS — Coal Mine Governance & Compliance Dashboard
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Mines</Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading mines from server...</Text>
          </View>
        ) : mines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No mines registered yet. Tap '+ Add Mine' to begin.
            </Text>
          </View>
        ) : (
          mines.map((mine) => (
            <View key={mine._id} style={styles.mineRow}>
              <View style={styles.mineCardWrapper}>
                <MineCard mine={mine} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Tasks</Text>
        {TODAY_TASKS.map((task) => (
          <View key={task.id} style={styles.card}>
            <Text style={styles.cardTitle}>{task.title}</Text>
            <Text style={styles.cardMeta}>Due: {task.due}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Violations</Text>
        {OPEN_VIOLATIONS.map((violation) => (
          <View key={violation.id} style={styles.card}>
            <View style={styles.violationHeader}>
              <Text style={styles.cardTitle}>{violation.title}</Text>
              <Text style={[styles.severity, { color: severityColor(violation.severity) }]}>
                {violation.severity}
              </Text>
            </View>
            <Text style={styles.cardMeta}>{violation.mine}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  greetingCard: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  greetingSubtext: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  addLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gold,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mineCardWrapper: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  severity: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
});
