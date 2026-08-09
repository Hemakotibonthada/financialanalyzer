import React, { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { dashboardApi, transactionsApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi } from '../../hooks/useApi';
import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  Money,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { DonutChartCard, LineChartCard } from '../../components/charts';
import { dueLabel, formatCompact, formatDate, formatMoney, relativeTime } from '../../utils/format';
import { chartPalette, HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function listFrom(value, keys) {
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value)) return value;
  return [];
}

function amountOf(item, keys) {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const summary = useApi(() => dashboardApi.summary(), []);
  const recent = useApi(() => transactionsApi.list({ limit: 5 }), []);

  const data = summary.data || {};
  const recentRows = listFrom(recent.data, ['items', 'transactions', 'data', 'results']);
  const categories = listFrom(data, ['spendByCategory', 'categories', 'categorySpend']);
  const trend = listFrom(data, ['lastSixMonths', 'monthlyTrend', 'trend']);
  const bills = listFrom(data, ['upcomingBills', 'upcomingEmis', 'upcoming']);
  const stats = data.stats || data.summary || data.financialSummary || {};
  const income = amountOf(data, ['monthIncome', 'incomeThisMonth', 'income']);
  const expense = amountOf(data, ['monthExpense', 'expenseThisMonth', 'expenses', 'spendThisMonth']);
  const net = income - expense;
  const hasContent = Boolean(
    Object.keys(data).length || recentRows.length || categories.length || trend.length || bills.length
  );
  const loading = (summary.loading || recent.loading) && !hasContent;
  const error = summary.error || recent.error;

  const chartData = categories.map((item, index) => ({
    label: item.category || item.name || 'Category',
    value: amountOf(item, ['amount', 'value', 'total']),
    color: chartPalette[index % chartPalette.length]
  })).filter((item) => item.value > 0);
  const lineData = trend.map((item) => ({
    label: item.month || item.label || formatDate(item.date, 'MMM'),
    value: amountOf(item, ['net', 'expense', 'amount', 'value'])
  }));

  function go(tab, screen, params) {
    navigation.navigate(tab, { screen, params });
  }

  if (loading) {
    return (
      <Screen>
        <SkeletonList count={7} />
      </Screen>
    );
  }

  if (error && !hasContent) {
    return (
      <Screen>
        <ErrorState message={error.message} onRetry={summary.refetch} />
      </Screen>
    );
  }

  if (!hasContent) {
    return (
      <Screen>
        <EmptyState
          title="No financial activity yet"
          message="Add transactions to build your overview."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={(
          <RefreshControl
            refreshing={summary.refreshing || recent.refreshing}
            onRefresh={() => { summary.onRefresh(); recent.onRefresh(); }}
            tintColor={colors.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || user?.firstName || 'there'}</Text>
            <Text style={styles.muted}>Your money position this month</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
            accessibilityLabel="Open notifications"
            accessibilityRole="button"
          >
            <Icon name="bell-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <Card style={styles.hero}>
          <Text style={styles.heroLabel}>Net position</Text>
          <Text style={styles.heroValue}>{formatMoney(net)}</Text>
          <View style={styles.heroSplit}>
            <Text style={styles.heroText}>Income {formatMoney(income)}</Text>
            <Text style={styles.heroText}>Spend {formatMoney(expense)}</Text>
          </View>
        </Card>

        {(summary.fromCache || recent.fromCache) && (summary.cachedAt || recent.cachedAt) ? (
          <Text style={styles.cacheNote}>
            Showing data from {relativeTime(summary.cachedAt || recent.cachedAt)}
          </Text>
        ) : null}

        <View style={styles.grid}>
          <StatTile label="Balance" value={formatCompact(stats.balance || data.balance)} />
          <StatTile label="Month spend" value={formatCompact(expense || stats.monthSpend)} />
          <StatTile label="Upcoming EMIs" value={formatCompact(stats.upcomingEmis || stats.emiDue)} />
          <StatTile label="Active budgets" value={String(stats.activeBudgets || 0)} />
        </View>

        <View style={styles.actions}>
          {[
            ['Add transaction', 'plus', 'MoneyTab', 'TransactionForm'],
            ['Scan receipt', 'camera-outline', 'MoneyTab', 'TransactionForm', { scan: true }],
            ['Add EMI', 'credit-card-plus-outline', 'DebtTab', 'EMIForm'],
            ['Pay bill', 'receipt-text-check-outline', 'MoneyTab', 'Bills']
          ].map(([label, icon, tab, screen, params]) => (
            <Pressable
              key={label}
              onPress={() => go(tab, screen, params)}
              style={styles.actionButton}
              accessibilityLabel={label}
              accessibilityRole="button"
            >
              <Icon name={icon} size={22} color={colors.primary} />
              <Text style={styles.actionText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {chartData.length ? <DonutChartCard title="Spend by category" data={chartData} /> : null}
        {lineData.length ? <LineChartCard title="Last 6 months" data={lineData} /> : null}

        <SectionHeader
          title="Recent transactions"
          actionLabel="See all"
          onAction={() => go('MoneyTab', 'Transactions')}
        />
        {recentRows.length ? recentRows.slice(0, 5).map((item) => (
          <ListRow
            key={String(item.id || item._id)}
            title={item.description || item.category || 'Transaction'}
            subtitle={formatDate(item.date || item.createdAt)}
            right={<Money amount={amountOf(item, ['amount'])} signed />}
          />
        )) : <EmptyState title="No recent transactions" />}

        <SectionHeader title="Upcoming bills/EMIs" />
        {bills.length ? bills.map((item) => {
          const due = dueLabel(item.dueDate || item.date || item.nextDueDate);
          const tone = due.tone === 'danger' ? colors.danger : due.tone === 'warning'
            ? colors.warning
            : colors.textMuted;
          return (
            <Card key={String(item.id || item._id || item.title)} style={styles.billRow}>
              <View>
                <Text style={styles.billTitle}>{item.title || item.name || 'Upcoming payment'}</Text>
                <Text style={[styles.billDue, { color: tone }]}>{due.text}</Text>
              </View>
              <Text style={styles.billAmount}>
                {formatMoney(amountOf(item, ['amount', 'emiAmount']))}
              </Text>
            </Card>
          );
        }) : <EmptyState title="No upcoming bills" />}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { ...typography.title, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  iconButton: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  hero: { backgroundColor: colors.primary, gap: spacing.sm },
  heroLabel: { ...typography.caption, color: colors.onPrimary, opacity: 0.84 },
  heroValue: { ...typography.display, color: colors.onPrimary },
  heroSplit: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  heroText: { ...typography.caption, color: colors.onPrimary, opacity: 0.9 },
  cacheNote: { ...typography.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm
  },
  actionText: { ...typography.micro, color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billTitle: { ...typography.bodyStrong, color: colors.text },
  billDue: { ...typography.caption, marginTop: spacing.xs },
  billAmount: { ...typography.bodyStrong, color: colors.text }
});
