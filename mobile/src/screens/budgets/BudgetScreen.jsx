import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { budgetsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatPercent, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function numberFrom(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getId(item) {
  return item?.id || item?._id || item?.budgetId;
}

function itemLimit(item) {
  return numberFrom(item?.limit, item?.amount, item?.budgetAmount);
}

function itemSpent(item) {
  return numberFrom(item?.spent, item?.used, item?.currentSpend);
}

function utilisationTone(percent, colors) {
  if (percent >= 100) return colors.danger;
  if (percent >= 75) return colors.warning;
  return colors.success;
}

function ProgressBar({ percent, color, trackColor }) {
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}> 
      <View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

function BudgetRow({ item, colors, onPress }) {
  const limit = itemLimit(item);
  const spent = itemSpent(item);
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  const tone = utilisationTone(percent, colors);
  return (
    <TouchableOpacity
      accessibilityLabel={`Edit ${item?.category || 'budget'} budget`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.rowTop}>
        <Text style={[styles.rowTitle, { color: colors.text }]}> 
          {titleCase(item?.category || item?.name || 'Budget')}
        </Text>
        <Text style={[styles.rowValue, { color: tone }]}>{formatPercent(percent)}</Text>
      </View>
      <ProgressBar percent={percent} color={tone} trackColor={colors.border} />
      <View style={styles.rowTop}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{formatMoney(spent)} spent</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>of {formatMoney(limit)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function BudgetSheet({ visible, initial, onClose, onSubmit, loading, colors }) {
  const [category, setCategory] = useState(initial?.category || initial?.name || '');
  const [limit, setLimit] = useState(String(itemLimit(initial) || ''));

  function submit() {
    const amount = Number(String(limit).replace(/,/g, ''));
    if (!category.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onSubmit({ category: category.trim(), limit: Math.round(amount * 100) / 100 });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? 'Edit budget' : 'Add budget'}>
      <View style={styles.sheetContent}>
        <Input
          label="Category"
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Budget category"
        />
        <Input
          label="Monthly limit"
          value={limit}
          onChangeText={setLimit}
          keyboardType="decimal-pad"
          accessibilityLabel="Budget monthly limit"
        />
        <Button
          title={loading ? 'Saving…' : 'Save budget'}
          onPress={submit}
          accessibilityLabel="Save budget"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Close budget form"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function BudgetScreen() {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => Promise.all([budgetsApi.list(), budgetsApi.summary()]).then(([list, summary]) => ({
      items: Array.isArray(list) ? list : list?.items || list?.budgets || [],
      summary: summary || {}
    })),
    []
  );
  const save = useMutation((body) => (
    editing ? budgetsApi.update(getId(editing), body) : budgetsApi.create(body)
  ));

  const items = data?.items || [];
  const summary = data?.summary || {};
  const totalLimit = numberFrom(summary.totalLimit, items.reduce((sum, item) => sum + itemLimit(item), 0));
  const totalSpent = numberFrom(summary.totalSpent, items.reduce((sum, item) => sum + itemSpent(item), 0));
  const percent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 1000) / 10 : 0;
  const remaining = Math.max(totalLimit - totalSpent, 0);

  function openSheet(item = null) {
    setEditing(item);
    setSheetOpen(true);
  }

  async function submit(body) {
    await save.mutate(body);
    setSheetOpen(false);
    setEditing(null);
    refetch().catch(() => {});
  }

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
          title="No budgets yet"
          description="Budgets turn category spending into guardrails before the month runs away."
          actionLabel="Add budget"
          onAction={() => openSheet()}
        />
        <BudgetSheet
          key={editing ? getId(editing) : 'new-budget'}
          visible={sheetOpen}
          initial={editing}
          onClose={() => setSheetOpen(false)}
          onSubmit={submit}
          loading={save.loading}
          colors={colors}
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
        <Card style={styles.cardGap}>
          <Text style={[styles.title, { color: colors.text }]}>This month</Text>
          <View style={styles.summaryGrid}>
            <StatTile label="Spent" value={formatMoney(totalSpent)} />
            <StatTile label="Limit" value={formatMoney(totalLimit)} />
            <StatTile label="Left" value={formatMoney(remaining)} />
          </View>
          <ProgressBar
            percent={percent}
            color={utilisationTone(percent, colors)}
            trackColor={colors.border}
          />
          <Text style={[styles.meta, { color: colors.textMuted }]}> 
            {formatPercent(percent)} of planned spending used
          </Text>
        </Card>

        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category budgets</Text>
          <TouchableOpacity
            accessibilityLabel="Add budget"
            accessibilityRole="button"
            onPress={() => openSheet()}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addText, { color: colors.onPrimary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {items.map((item) => (
          <BudgetRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() => openSheet(item)}
          />
        ))}
      </ScrollView>
      <BudgetSheet
        key={editing ? getId(editing) : 'new-budget'}
        visible={sheetOpen}
        initial={editing}
        onClose={() => setSheetOpen(false)}
        onSubmit={submit}
        loading={save.loading}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  cardGap: {
    gap: spacing.md
  },
  title: {
    ...typography.title
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  meta: {
    ...typography.caption
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  sectionTitle: {
    ...typography.heading
  },
  addButton: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addText: {
    ...typography.bodyStrong
  },
  row: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rowTitle: {
    ...typography.subheading
  },
  rowValue: {
    ...typography.bodyStrong
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
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  cancelButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    ...typography.bodyStrong
  }
});
