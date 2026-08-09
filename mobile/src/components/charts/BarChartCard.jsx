import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { chartPalette, spacing } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import SectionHeader from '../ui/SectionHeader';

export default function BarChartCard({ title, data = [], emptyTitle = 'No data yet', style }) {
  const { colors } = useTheme();
  const hasData = Array.isArray(data) && data.length > 0;
  const chartData = hasData
    ? data.map((item, index) => ({
      ...item,
      frontColor: item.frontColor || chartPalette[index % chartPalette.length]
    }))
    : [];

  return (
    <Card style={style}>
      {title ? <SectionHeader title={title} /> : null}
      {hasData ? (
        <View style={styles.chartWrap}>
          <BarChart
            data={chartData}
            barBorderRadius={6}
            hideRules={false}
            rulesColor={colors.chartGrid}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
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
    marginLeft: -spacing.sm
  },
  axisText: {
    fontSize: 10
  }
});
