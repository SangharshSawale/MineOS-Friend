import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../theme/colors';
import type { Mine } from '../types';

interface MineCardProps {
  mine: Mine;
  onPress?: () => void;
}

export default function MineCard({ mine, onPress }: MineCardProps) {
  const isActive = mine.status === 'active';

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.name}>{mine.name}</Text>
        <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveText]}>
            {mine.status.charAt(0).toUpperCase() + mine.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.code}>Code: {mine.code}</Text>
      <Text style={styles.location}>{mine.location}</Text>
      <Text style={styles.operator}>Operator: {mine.operator}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: {
    backgroundColor: '#E3F9E5',
  },
  inactiveBadge: {
    backgroundColor: '#FFE3E3',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.error,
  },
  code: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  operator: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
