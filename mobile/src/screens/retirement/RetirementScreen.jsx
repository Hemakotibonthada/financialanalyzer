import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { retirementApi } from '../../api/endpoints';
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
  StatTile,
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id;
}

function PlanRow({ item, colors, onPress }) {
  const name = item?.name || item?.planName || `Plan ${item?.retirementAge ?? ''}`;
  const progress = item?.progress?.percentageAchieved;
  const currentValue = item?.corpusCalculation?.currentValue;
  const required = item?.corpusCalculation?.requiredCorpus;

  return (
    <TouchableOpacity
      accessibilityLabel={`Open retirement plan: ${name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <Text style={[styles.subheading, { color: colors.text }]}>{name}</Text>
      <View style={styles.between}>
        {currentValue != null
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Current: {formatMoney(currentValue)}
            </Text>
          : null}
        {required != null
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Target: {formatMoney(required)}
            </Text>
          : null}
      </View>
      {progress != null
        ? <Text style={[styles.caption, {
            color: progress >= 100 ? colors.success : colors.primary,
          }]}>
            {formatPercent(progress)} achieved
          </Text>
        : null}
    </TouchableOpacity>
  );
}

function CreatePlanSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState('');
  const [currentAge, setCurrentAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');

  function submit() {
    const ca = Number(currentAge);
    const ra = Number(retirementAge);
    if (!Number.isFinite(ca) || !Number.isFinite(ra) || ca <= 0 || ra <= ca) {
      return;
    }
    const me = Number(String(monthlyExpenses).replace(/,/g, ''));
    onSubmit({
      ...(name.trim() ? { name: name.trim() } : {}),
      currentAge: ca,
      retirementAge: ra,
      ...(Number.isFinite(me) && me > 0 ? { monthlyExpenses: me } : {}),
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="New retirement plan">
      <View style={styles.sheetContent}>
        <Input
          label="Plan name (optional)"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Retirement plan name"
        />
        <Input
          label="Current age"
          value={currentAge}
          onChangeText={setCurrentAge}
          keyboardType="number-pad"
          accessibilityLabel="Current age"
        />
        <Input
          label="Retirement age"
          value={retirementAge}
          onChangeText={setRetirementAge}
          keyboardType="number-pad"
          accessibilityLabel="Planned retirement age"
        />
        <Input
          label="Monthly expenses today (₹)"
          value={monthlyExpenses}
          onChangeText={setMonthlyExpenses}
          keyboardType="decimal-pad"
          accessibilityLabel="Monthly expenses"
        />
        <Button
          title={loading ? 'Creating…' : 'Create plan'}
          onPress={submit}
          accessibilityLabel="Create retirement plan"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.body, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function RetirementScreen({ navigation }) {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    data,
    loading,
    error,
    refetch,
    refreshing,
    onRefresh,
    fromCache,
  } = useApi(
    () => Promise.all([
      retirementApi.summary(),
      retirementApi.list(),
    ]).then(([summaryResult, listResult]) => {
      const summaryData =
        summaryResult?.data ?? summaryResult ?? {};
      const plans = Array.isArray(listResult)
        ? listResult
        : listResult?.plans || listResult?.items || [];
      return { summary: summaryData, plans };
    }),
    []
  );

  const create = useMutation((body) => retirementApi.create(body));

  const summary = data?.summary || {};
  const plans = data?.plans || [];

  async function handleCreate(body) {
    try {
      await create.mutate(body);
      setSheetOpen(false);
      refetch().catch(() => {});
    } catch {
      /* create.error surfaced below */
    }
  }

  if (loading) return <Screen><SkeletonList count={4} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!plans.length) {
    return (
      <Screen>
        <EmptyState
          title="No retirement plans yet"
          description="Create a plan to project your corpus, track savings, and model scenarios."
          actionLabel="New plan"
          onAction={() => setSheetOpen(true)}
        />
        <CreatePlanSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSubmit={handleCreate}
          loading={create.loading}
          colors={colors}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {fromCache
          ? <Text style={[styles.caption, { color: colors.warning }]}>
              Showing saved data — pull to refresh
            </Text>
          : null}

        <Card style={styles.block}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Retirement overview
          </Text>
          <View style={styles.statGrid}>
            {summary.totalPlans != null
              ? <StatTile
                  label="Plans"
                  value={String(summary.totalPlans)}
                />
              : null}
            {summary.totalCurrentValue != null
              ? <StatTile
                  label="Current value"
                  value={formatMoney(summary.totalCurrentValue)}
                />
              : null}
            {summary.totalRequiredCorpus != null
              ? <StatTile
                  label="Required corpus"
                  value={formatMoney(summary.totalRequiredCorpus)}
                />
              : null}
          </View>
          {summary.averageProgress != null
            ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                Average progress: {formatPercent(summary.averageProgress)}
              </Text>
            : null}
          {summary.yearsToRetirement != null
            ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                Years to earliest retirement: {summary.yearsToRetirement}
              </Text>
            : null}
        </Card>

        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Plans
          </Text>
          <TouchableOpacity
            accessibilityLabel="Add retirement plan"
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.bodyStrong, { color: colors.onPrimary }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {plans.map((item) => (
          <PlanRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() =>
              navigation.navigate('RetirementDetail', { id: getId(item) })
            }
          />
        ))}

        {create.error
          ? <Text style={[styles.caption, { color: colors.danger }]}>
              {create.error?.message}
            </Text>
          : null}
      </ScrollView>

      <CreatePlanSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
        loading={create.loading}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  block: { gap: spacing.md },
  heading: { ...typography.heading },
  subheading: { ...typography.subheading },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cancelButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
