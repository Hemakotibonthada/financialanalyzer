import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function Input({
  label,
  error,
  helperText,
  left,
  right,
  secureTextEntry = false,
  accessibilityLabel,
  style,
  ...props
}) {
  const { colors } = useTheme();
  const [secure, setSecure] = useState(secureTextEntry);
  const borderColor = error ? colors.danger : colors.border;
  const labelStyle = [styles.label, { color: colors.text }];
  const inputWrapStyle = [styles.inputWrap, { backgroundColor: colors.surface, borderColor }];
  const inputStyle = [styles.input, { color: colors.text }];
  const helpStyle = [styles.helper, { color: error ? colors.danger : colors.textMuted }];
  const toggleStyle = [styles.toggleText, { color: colors.primary }];

  return (
    <View style={style}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <View style={inputWrapStyle}>
        {left ? <View style={styles.slot}>{left}</View> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel || label || props.placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secure}
          style={inputStyle}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={secure ? 'Show password' : 'Hide password'}
            accessibilityRole="button"
            hitSlop={styles.hitSlop}
            onPress={() => setSecure((value) => !value)}
            style={styles.toggle}
          >
            <Text style={toggleStyle}>{secure ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
        {right ? <View style={styles.slot}>{right}</View> : null}
      </View>
      {error || helperText ? <Text style={helpStyle}>{error || helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    marginBottom: spacing.xs
  },
  inputWrap: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: HIT_TARGET,
    paddingHorizontal: spacing.md
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: HIT_TARGET,
    paddingVertical: spacing.sm
  },
  slot: {
    marginHorizontal: spacing.xs
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET
  },
  toggleText: {
    ...typography.caption,
    fontWeight: '600'
  },
  helper: {
    ...typography.caption,
    marginTop: spacing.xs
  },
  hitSlop: {
    bottom: 8,
    left: 8,
    right: 8,
    top: 8
  }
});
