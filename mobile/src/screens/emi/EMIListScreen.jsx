import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { emiApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { dueLabel, formatMoney, formatPercent, titleCase } from '../../utils/format';
import { Card, Chip, EmptyState, ErrorState, Screen, SkeletonList, StatTile } from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const FILTERS = ['active', 'upcoming', 'completed'];

function numberFrom(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getId(item) {
  return item?.id || item?._id || item?.emiId;
}

function getDueDate(item) {
  return item?.nextDueDate || item?.next_due_date || item?.dueDate || item?.due_date;
}

function getMonthlyAmount(item) {
  return numberFrom(item?.monthlyEmi, item?.monthlyEMI, item?.emiAmount, item?.amount);
}

function statusOf(item) {
  return String(item?.status || (item?.isCompleted ? 'completed' : 'active')).toLowerCase();
}

function ratioPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function debtTone(percent, colors) {
  if (percent > 50) return { label: 'Critical', color: colors.danger };
  if (percent > 40) return { label: 'Warning', color: colors.danger };
  if (percent > 30) return { label: 'Caution', color: colors.warning };
  return { label: 'Healthy', color: colors.success };
}

function ProgressBar({ value, color }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  const { colors } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

function EMIRow({ item, onPress, colors }) {
  const paid = numberFrom(item?.paidInstallments, item?.installmentsPaid, item?.paidTenure);
  const total = numberFrom(item?.totalTenure, item?.tenureMonths, item?.tenure, 1);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;
  const due = dueLabel(getDueDate(item));
  const dueColor = due.tone === 'danger'
    ? colors.danger
    : due.tone === 'warning'
      ? colors.warning
      : colors.textMuted;

  return (
    <TouchableOpacity
      accessibilityLabel={`Open EMI for ${item?.merchant || item?.lender || 'lender'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleWrap}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {item?.merchant || item?.lender || item?.name || 'EMI'}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            {paid} of {total} installments paid
          </Text>
        </View>
        <Text style={[styles.rowAmount, { color: colors.text }]}> 
          {formatMoney(getMonthlyAmount(item))}
        </Text>
      </View>
      <ProgressBar value={progress} color={colors.primary} />
      <View style={styles.rowFooter}>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{progress}% complete</Text>
        <Text style={[styles.rowMetaStrong, { color: dueColor }]}>{due.text}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EMIListScreen({ navigation }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('active');
  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => Promise.all([emiApi.overview(), emiApi.list()]).then(([overview, list]) => ({
      overview: overview?.data || overview || {},
      items: Array.isArray(list) ? list : list?.items || list?.emis || []
    })),
    []
  );

  const items = data?.items || [];
  const overview = data?.overview || {};
  const filteredItems = useMemo(() => {
    if (filter === 'active') return items.filter((item) => statusOf(item) === 'active');
    if (filter === 'completed') return items.filter((item) => statusOf(item) === 'completed');
    return items.filter((item) => statusOf(item) !== 'completed' && getDueDate(item));
  }, [filter, items]);

  const activeCount = numberFrom(
    overview.activeCount,
    overview.activeEMIs,
    items.filter((item) => statusOf(item) === 'active').length
  );
  const monthlyBurden = numberFrom(
    overview.totalMonthlyEmi,
    overview.monthlyBurden,
    overview.totalEMI,
    items.reduce((sum, item) => sum + getMonthlyAmount(item), 0)
  );
  const outstanding = numberFrom(
    overview.totalOutstanding,
    overview.outstanding,
    items.reduce((sum, item) => sum + numberFrom(item?.outstanding, item?.remainingPrincipal), 0)
  );
  const nextDue = overview.nextDueDate || items
    .map(getDueDate)
    .filter(Boolean)
    .sort()[0];
  const dti = ratioPercent(overview.debtToIncomeRatio || overview.debtToIncome || overview.dti);
  const tone = debtTone(dti, colors);

  if (loading) {
    return <Screen><SkeletonList count={6} /></Screen>;
  }

  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!items.length) {
    return (
      <Screen>
        <EmptyState
          title="No EMIs recorded"
          description="Add every recurring loan payment here to understand your real monthly debt load."
          actionLabel="Add EMI"
          onAction={() => navigation.navigate('EMIForm')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Monthly EMI burden</Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>
            {formatMoney(monthlyBurden)}
          </Text>
          <View style={styles.statGrid}>
            <StatTile label="Outstanding" value={formatMoney(outstanding)} />
            <StatTile label="Active EMIs" value={String(activeCount)} />
            <StatTile label="Next due" value={dueLabel(nextDue).text} />
          </View>
          <View style={styles.dtiHeader}>
            <Text style={[styles.dtiText, { color: colors.text }]}>Debt-to-income</Text>
            <Text style={[styles.dtiValue, { color: tone.color }]}> 
              {formatPercent(dti)} · {tone.label}
            </Text>
          </View>
          <ProgressBar value={dti} color={tone.color} />
        </Card>

        <View style={styles.chips}>
          {FILTERS.map((item) => (
            <Chip
              key={item}
              label={titleCase(item)}
              selected={filter === item}
              onPress={() => setFilter(item)}
              accessibilityLabel={`Show ${item} EMIs`}
              accessibilityRole="button"
            />
          ))}
        </View>

        {filteredItems.length ? filteredItems.map((item) => (
          <EMIRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() => navigation.navigate('EMIDetail', { id: getId(item) })}
          />
        )) : (
          <EmptyState
            title={`No ${filter} EMIs`}
            description="Try a different filter or add another EMI."
          />
        )}
      </ScrollView>
      <TouchableOpacity
        accessibilityLabel="Add EMI"
        accessibilityRole="button"
        onPress={() => navigation.navigate('EMIForm')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>＋</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  hero: {
    gap: spacing.md
  },
  eyebrow: {
    ...typography.caption
  },
  heroAmount: {
    ...typography.display
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  dtiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  dtiText: {
    ...typography.bodyStrong
  },
  dtiValue: {
    ...typography.bodyStrong
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: HIT_TARGET
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rowTitleWrap: {
    flex: 1
  },
  rowTitle: {
    ...typography.subheading
  },
  rowMeta: {
    ...typography.caption
  },
  rowMetaStrong: {
    ...typography.caption,
    fontWeight: '700'
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden'
  },
  progressFill: {
    height: 8,
    borderRadius: radii.pill
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fabText: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700'
  }
});

