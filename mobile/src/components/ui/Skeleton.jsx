import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function Skeleton({ width = '100%', height = 16, radius = radii.md, style }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;
  const skeletonStyle = [
    styles.skeleton,
    { backgroundColor: colors.skeleton, borderRadius: radius, height, opacity, width },
    style
  ];

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 700, toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 700, toValue: 0.35, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={skeletonStyle} />;
}

export function SkeletonList({ count = 3 }) {
  const rows = Array.from({ length: count }, (_, index) => index);

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton height={52} radius={radii.lg} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden'
  },
  list: {
    gap: spacing.md
  },
  row: {
    width: '100%'
  }
});
