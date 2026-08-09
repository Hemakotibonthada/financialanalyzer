import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

export default function EmptyState({ icon, title, description, actionLabel, onAction, style }) {
  const { colors } = useTheme();
  const titleStyle = [styles.title, { color: colors.text }];
  const descriptionStyle = [styles.description, { color: colors.textMuted }];

  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={titleStyle}>{title}</Text>
      {description ? <Text style={descriptionStyle}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          accessibilityLabel={actionLabel}
          onPress={onAction}
          size="sm"
          title={actionLabel}
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
  icon: {
    marginBottom: spacing.md
  },
  title: {
    ...typography.heading,
    textAlign: 'center'
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center'
  }
});
