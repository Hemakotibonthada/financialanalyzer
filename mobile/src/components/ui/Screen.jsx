import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function Screen({
  children,
  title,
  scroll = false,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style
}) {
  const { colors } = useTheme();
  const containerStyle = [styles.container, { backgroundColor: colors.background }, style];
  const titleStyle = [styles.title, { color: colors.text }];
  const contentStyle = [styles.content, contentContainerStyle];
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  ) : null;

  return (
    <SafeAreaView style={containerStyle} edges={['top', 'left', 'right']}>
      {title ? (
        <View style={styles.header}>
          <Text style={titleStyle}>{title}</Text>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  title: {
    ...typography.title
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg
  }
});
