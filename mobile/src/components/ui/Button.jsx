import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text
} from 'react-native';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

const SIZE_STYLES = {
  sm: 'small',
  md: 'medium',
  lg: 'large'
};

function getVariant(colors, variant) {
  if (variant === 'danger') {
    return { backgroundColor: colors.danger, borderColor: colors.danger, color: colors.onPrimary };
  }
  if (variant === 'secondary') {
    return {
      backgroundColor: colors.primarySoft,
      borderColor: colors.border,
      color: colors.primary
    };
  }
  if (variant === 'ghost') {
    return { backgroundColor: 'transparent', borderColor: 'transparent', color: colors.primary };
  }
  return { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.onPrimary };
}

export default function Button({
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style
}) {
  const { colors } = useTheme();
  const variantStyle = getVariant(colors, variant);
  const sizeKey = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isDisabled = disabled || loading;
  const buttonStyle = [
    styles.base,
    styles[sizeKey],
    {
      backgroundColor: variantStyle.backgroundColor,
      borderColor: variantStyle.borderColor,
      opacity: isDisabled ? 0.55 : 1
    },
    style
  ];
  const textStyle = [styles.text, { color: variantStyle.color }];
  const label = accessibilityLabel || title || 'Button';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={buttonStyle}
    >
      {loading ? <ActivityIndicator color={variantStyle.color} /> : null}
      {!loading ? <Text style={textStyle}>{children || title}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET
  },
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md
  },
  text: {
    ...typography.bodyStrong
  }
});
