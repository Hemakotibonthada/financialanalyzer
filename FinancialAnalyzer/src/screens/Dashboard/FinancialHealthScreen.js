import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { financialHealthAPI } from '../../services/api';
import { colors, spacing, typography, shadows, borderRadius } from '../../styles/theme';

const screenWidth = Dimensions.get('window').width;

export default function FinancialHealthScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashResponse, insightsResponse] = await Promise.all([
        financialHealthAPI.getDashboard(),
        financialHealthAPI.getInsights(),
      ]);

      setDashboardData(dashResponse.data);
      setInsights(insightsResponse.data);
    } catch (error) {
      console.error('Error fetching financial health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Financial Health</Text>
        <Text style={styles.subtitle}>Your financial overview at a glance</Text>
      </View>

      {/* Health Score Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Health Score</Text>
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.scoreText,
            { color: getScoreColor(dashboardData?.healthScore || 0) }
          ]}>
            {dashboardData?.healthScore || 0}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
        <Text style={styles.scoreDescription}>
          {getScoreDescription(dashboardData?.healthScore || 0)}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={styles.summaryValue}>
            ₹{formatNumber(dashboardData?.totalIncome || 0)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            ₹{formatNumber(dashboardData?.totalExpenses || 0)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Active EMIs</Text>
          <Text style={styles.summaryValue}>
            {dashboardData?.activeEMIs || 0}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Savings Rate</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {dashboardData?.savingsRate || 0}%
          </Text>
        </View>
      </View>

      {/* Expense Breakdown Chart */}
      {dashboardData?.expenseBreakdown?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expense Breakdown</Text>
          <PieChart
            data={dashboardData.expenseBreakdown.map((item, index) => ({
              name: item.category,
              amount: item.amount,
              color: getPieColor(index),
              legendFontColor: colors.text,
              legendFontSize: 12,
            }))}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Financial Insights */}
      {insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights & Tips</Text>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <View style={[
                styles.insightBadge,
                { backgroundColor: getInsightColor(insight.type) }
              ]}>
                <Text style={styles.insightBadgeText}>
                  {insight.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CompanyExpenses')}
        >
          <Text style={styles.actionButtonText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EMI')}
        >
          <Text style={styles.actionButtonText}>Track EMI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Lender')}
        >
          <Text style={styles.actionButtonText}>Manage Loans</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getScoreColor = (score) => {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
};

const getScoreDescription = (score) => {
  if (score >= 80) return 'Excellent! Your finances are in great shape.';
  if (score >= 60) return 'Good, but there\'s room for improvement.';
  return 'Needs attention. Consider reviewing your spending.';
};

const getPieColor = (index) => {
  const pieColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.info,
    colors.warning,
    colors.error,
  ];
  return pieColors[index % pieColors.length];
};

const getInsightColor = (type) => {
  switch (type) {
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    case 'info': return colors.info;
    default: return colors.textSecondary;
  }
};

const formatNumber = (num) => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  card: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  scoreText: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreLabel: {
    ...typography.h3,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  scoreDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.surface,
    margin: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h4,
    color: colors.text,
  },
  insightItem: {
    marginBottom: spacing.md,
  },
  insightBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  insightBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  insightText: {
    ...typography.body2,
    color: colors.text,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
