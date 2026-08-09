import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { chartPalette, spacing } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import SectionHeader from '../ui/SectionHeader';

export default function LineChartCard({ title, data = [], emptyTitle = 'No data yet', style }) {
  const { colors } = useTheme();
  const hasData = Array.isArray(data) && data.length > 0;
  const chartData = hasData
    ? data.map((point, index) => ({
      ...point,
      color: point.color || chartPalette[index % chartPalette.length]
    }))
    : [];

  return (
    <Card style={style}>
      {title ? <SectionHeader title={title} /> : null}
      {hasData ? (
        <View style={styles.chartWrap}>
          <LineChart
            areaChart
            curved
            data={chartData}
            color={colors.primary}
            dataPointsColor={colors.primary}
            hideRules={false}
            rulesColor={colors.chartGrid}
            startFillColor={colors.primary}
            startOpacity={0.22}
            endOpacity={0.02}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
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
