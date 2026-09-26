import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function CustomInput({
  label,
  error,
  style,
  secureTextEntry,
  ...rest
}: CustomInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const showPasswordToggle = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            showPasswordToggle && styles.inputWithToggle,
            error ? styles.inputError : null,
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          {...rest}
        />
        {showPasswordToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.toggleButton}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  inputError: {
    borderColor: colors.error,
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
