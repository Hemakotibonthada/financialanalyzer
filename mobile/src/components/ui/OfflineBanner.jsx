import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useNetwork } from '../../contexts/NetworkContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../theme/tokens';

/**
 * Persistent banner shown while the device has no usable connection.
 *
 * Screens fall back to cached data when offline, so without this the app
 * silently shows stale figures - which in a finance product is worse than
 * showing nothing.
 */
export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Showing saved data."
      style={[
        styles.banner,
        { backgroundColor: colors.warning, paddingTop: insets.top + spacing.xs }
      ]}
    >
      <Icon name="cloud-off-outline" size={16} color="#ffffff" />
      <Text style={styles.text}>Offline — showing saved data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    color: '#ffffff'
  }
});
