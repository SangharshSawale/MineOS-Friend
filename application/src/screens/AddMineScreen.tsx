import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { createMine } from '../services/mineService';
import colors from '../theme/colors';
import type { HomeStackParamList } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddMine'>;

export default function AddMineScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [operator, setOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || !location.trim() || !operator.trim()) {
      setError('All fields are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createMine({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        location: location.trim(),
        operator: operator.trim(),
      });
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Failed to create mine. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Register a new coal mine site for governance and compliance monitoring.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <CustomInput
          label="Mine Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. North Ridge Coal Mine"
          autoCapitalize="words"
        />

        <CustomInput
          label="Mine Code"
          value={code}
          onChangeText={setCode}
          placeholder="e.g. NRCM-01"
          autoCapitalize="characters"
        />

        <CustomInput
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Jharkhand, India"
          autoCapitalize="words"
        />

        <CustomInput
          label="Operator"
          value={operator}
          onChangeText={setOperator}
          placeholder="e.g. Coal India Ltd."
          autoCapitalize="words"
        />

        <CustomButton title="Create Mine" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#FFE3E3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: 14,
  },
});
