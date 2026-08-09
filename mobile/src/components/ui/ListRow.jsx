import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function ListRow({
  icon,
  avatar,
  title,
  subtitle,
  right,
  chevron = false,
  onPress,
  accessibilityLabel,
  style
}) {
  const { colors } = useTheme();
  const rowStyle = [styles.row, { borderBottomColor: colors.border }, style];
  const titleStyle = [styles.title, { color: colors.text }];
  const subtitleStyle = [styles.subtitle, { color: colors.textMuted }];
  const rightStyle = [styles.rightText, { color: colors.textMuted }];
  const chevronStyle = [styles.chevron, { color: colors.textFaint }];
  const content = (
    <>
      {avatar || icon ? <View style={styles.leading}>{avatar || icon}</View> : null}
      <View style={styles.middle}>
        <Text numberOfLines={1} style={titleStyle}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={subtitleStyle}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={rightStyle}>{right}</Text> : null}
      {chevron ? <Text style={chevronStyle}>›</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        onPress={onPress}
        style={rowStyle}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: HIT_TARGET,
    paddingVertical: spacing.md
  },
  leading: {
    marginRight: spacing.md
  },
  middle: {
    flex: 1
  },
  title: {
    ...typography.bodyStrong
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs
  },
  rightText: {
    ...typography.bodyStrong,
    marginLeft: spacing.md
  },
  chevron: {
    fontSize: 28,
    marginLeft: spacing.sm
  }
});
