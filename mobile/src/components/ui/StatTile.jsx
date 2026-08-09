import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function StatTile({ label, value, delta, trend = 'neutral', style }) {
  const { colors } = useTheme();
  const tileStyle = [styles.tile, { backgroundColor: colors.surfaceAlt }, style];
  const labelStyle = [styles.label, { color: colors.textMuted }];
  const valueStyle = [styles.value, { color: colors.text }];
  const trendColor = trend === 'down' ? colors.danger : colors.success;
  const deltaStyle = [styles.delta, { color: trend === 'neutral' ? colors.textMuted : trendColor }];

  return (
    <View style={tileStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
      {delta ? <Text style={deltaStyle}>{delta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.lg,
    padding: spacing.lg
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs
  },
  value: {
    ...typography.title
  },
  delta: {
    ...typography.caption,
    marginTop: spacing.xs
  }
});
