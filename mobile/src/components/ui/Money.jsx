import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney } from '../../utils/format';

const SIZE_STYLES = {
  sm: 'small',
  md: 'medium',
  lg: 'large'
};

export default function Money({ value, signed = false, precise = false, size = 'md', style }) {
  const { colors } = useTheme();
  const numeric = Number(value);
  const color = numeric > 0 ? colors.credit : colors.debit;
  const sizeKey = SIZE_STYLES[size] || SIZE_STYLES.md;
  const textStyle = [styles[sizeKey], { color }, style];

  return <Text style={textStyle}>{formatMoney(value, { signed, precise })}</Text>;
}

const styles = StyleSheet.create({
  small: {
    ...typography.caption,
    fontWeight: '700'
  },
  medium: {
    ...typography.bodyStrong
  },
  large: {
    ...typography.heading
  }
});
