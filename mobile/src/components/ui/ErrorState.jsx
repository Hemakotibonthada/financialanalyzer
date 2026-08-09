import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

export default function ErrorState({ message, onRetry, style }) {
  const { colors } = useTheme();
  const messageStyle = [styles.message, { color: colors.danger }];

  return (
    <View style={[styles.container, style]}>
      <Text style={messageStyle}>{message || 'Something went wrong.'}</Text>
      {onRetry ? (
        <Button
          accessibilityLabel="Retry"
          onPress={onRetry}
          size="sm"
          title="Retry"
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  message: {
    ...typography.body,
    marginBottom: spacing.md,
    textAlign: 'center'
  }
});
