import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

function toneColors(colors, tone, selected) {
  if (tone === 'danger') return { bg: colors.dangerSoft, fg: colors.danger };
  if (tone === 'success') return { bg: colors.successSoft, fg: colors.success };
  if (tone === 'warning') return { bg: colors.warningSoft, fg: colors.warning };
  if (selected) return { bg: colors.primary, fg: colors.onPrimary };
  return { bg: colors.surfaceAlt, fg: colors.textMuted };
}

export default function Chip({ label, selected = false, tone = 'neutral', onPress, style }) {
  const { colors } = useTheme();
  const palette = toneColors(colors, tone, selected);
  const chipStyle = [styles.chip, { backgroundColor: palette.bg }, style];
  const textStyle = [styles.text, { color: palette.fg }];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={chipStyle}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: HIT_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  text: {
    ...typography.caption,
    fontWeight: '700'
  }
});
