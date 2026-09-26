import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomInput from '../components/CustomInput';
import MineCard from '../components/MineCard';
import { fetchMines } from '../services/mineService';
import { saveSelectedMine } from '../services/storage';
import colors from '../theme/colors';
import type { InspectionStackParamList, Mine } from '../types';

type Props = NativeStackScreenProps<InspectionStackParamList, 'SelectMine'>;

export default function SelectMineScreen({ navigation }: Props) {
  const [mines, setMines] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMines();
      setMines(data.filter((mine) => mine.status === 'active'));
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? 'Failed to load mines from server.'
        : 'Failed to load mines from server.';
      Alert.alert('Error', message);
      setMines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMines();
    }, [loadMines]),
  );

  const filteredMines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return mines;
    }

    return mines.filter(
      (mine) =>
        mine.name.toLowerCase().includes(query) ||
        mine.code.toLowerCase().includes(query) ||
        mine.location.toLowerCase().includes(query) ||
        mine.operator.toLowerCase().includes(query),
    );
  }, [mines, searchQuery]);

  const handleSelectMine = async (mine: Mine) => {
    await saveSelectedMine(mine);
    navigation.navigate('StartInspection');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading active mines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <CustomInput
          label="Search Mines"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, code, location, or operator"
          autoCapitalize="none"
        />
        <Text style={styles.searchHint}>
          Showing {filteredMines.length} active mine{filteredMines.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredMines}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <MineCard
            mine={item}
            onPress={() => handleSelectMine(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'No active mines match your search.'
                : 'No active mines available. Add mines from the Home screen.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  searchHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
