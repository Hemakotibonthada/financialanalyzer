import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  const { colors } = useTheme();
  const titleStyle = [styles.title, { color: colors.text }];
  const actionStyle = [styles.action, { color: colors.primary }];

  return (
    <View style={[styles.header, style]}>
      <Text style={titleStyle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={styles.actionButton}
        >
          <Text style={actionStyle}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  title: {
    ...typography.heading
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: HIT_TARGET,
    paddingHorizontal: spacing.sm
  },
  action: {
    ...typography.bodyStrong
  }
});
