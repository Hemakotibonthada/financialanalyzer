import React from 'react';
import { StyleSheet, View } from 'react-native';
import { elevation, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function Card({ children, style, padded = true }) {
  const { colors } = useTheme();
  const cardStyle = [
    styles.card,
    elevation.low,
    { backgroundColor: colors.surface, borderColor: colors.border },
    padded && styles.padded,
    style
  ];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth
  },
  padded: {
    padding: spacing.lg
  }
});
