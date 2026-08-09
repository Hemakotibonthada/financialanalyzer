import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { chartPalette, spacing } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import SectionHeader from '../ui/SectionHeader';

export default function DonutChartCard({ title, data = [], emptyTitle = 'No data yet', style }) {
  const { colors } = useTheme();
  const hasData = Array.isArray(data) && data.length > 0;
  const chartData = hasData
    ? data.map((item, index) => ({
      ...item,
      color: item.color || chartPalette[index % chartPalette.length]
    }))
    : [];

  return (
    <Card style={style}>
      {title ? <SectionHeader title={title} /> : null}
      {hasData ? (
        <View style={styles.chartWrap}>
          <PieChart
            data={chartData}
            donut
            innerCircleColor={colors.surface}
            radius={92}
            innerRadius={56}
            showText
            textColor={colors.text}
          />
        </View>
      ) : (
        <EmptyState title={emptyTitle} description="There is nothing to chart right now." />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm
  }
});
