import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { taxApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatDate, titleCase } from '../../utils/format';
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

/**
 * Derive the current Indian financial year label ("2024-25").
 * Indian FY runs April–March, so January–March belong to the previous year's FY.
 */
function currentIndianFY() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

function TaxRow({ item, colors, onPress }) {
  const ay = item?.assessmentYear || '—';
  const regime = titleCase(item?.taxRegime || '—');
  const totalTax = item?.taxCalculation?.totalTax;
  const status = item?.itrFiling?.status;

  return (
    <TouchableOpacity
      accessibilityLabel={`Open tax record for AY ${ay}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.between}>
        <Text style={[styles.subheading, { color: colors.text }]}>
          AY {ay}
        </Text>
        {status
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              {titleCase(status)}
            </Text>
          : null}
      </View>
      <View style={styles.between}>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {regime} regime
        </Text>
        {totalTax != null
          ? <Text style={[styles.body, { color: colors.text }]}>
              Tax: {formatMoney(totalTax)}
            </Text>
          : null}
      </View>
    </TouchableOpacity>
  );
}

function CreateTaxSheet({ visible, onClose, onSubmit, loading }) {
  const [assessmentYear, setAssessmentYear] = useState(currentIndianFY());
  const [taxRegime, setTaxRegime] = useState('new');

  function submit() {
    if (!assessmentYear.trim()) return;
    onSubmit({
      assessmentYear: assessmentYear.trim(),
      taxRegime: taxRegime.trim() || 'new',
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="New tax record">
      <View style={styles.sheetContent}>
        <Input
          label="Assessment year (e.g. 2025-26)"
          value={assessmentYear}
          onChangeText={setAssessmentYear}
          accessibilityLabel="Assessment year"
        />
        <Input
          label="Tax regime (old / new)"
          value={taxRegime}
          onChangeText={setTaxRegime}
          accessibilityLabel="Tax regime"
        />
        <Button
          title={loading ? 'Creating…' : 'Create record'}
          onPress={submit}
          accessibilityLabel="Create tax record"
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

export default function TaxScreen({ navigation }) {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const defaultAY = useMemo(() => currentIndianFY(), []);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => Promise.all([
      taxApi.list(),
      taxApi.summary(defaultAY).catch(() => null),
    ]).then(([records, summary]) => ({
      records: Array.isArray(records)
        ? records
        : records?.records || records?.items || [],
      summary: summary || null,
    })),
    []
  );

  const create = useMutation((body) => taxApi.create(body));

  const records = data?.records || [];
  const summary = data?.summary;

  async function handleCreate(body) {
    try {
      await create.mutate(body);
      setSheetOpen(false);
      refetch().catch(() => {});
    } catch {
      /* create.error surfaced below */
    }
  }

  if (loading) return <Screen><SkeletonList count={5} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!records.length) {
    return (
      <Screen>
        <EmptyState
          title="No tax records yet"
          description="Add a tax record to track income, deductions, and compare old vs new regime."
          actionLabel="New record"
          onAction={() => setSheetOpen(true)}
        />
        <CreateTaxSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSubmit={handleCreate}
          loading={create.loading}
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
        {summary
          ? <Card style={styles.block}>
              <Text style={[styles.heading, { color: colors.text }]}>
                Summary — AY {defaultAY}
              </Text>
              <View style={styles.statGrid}>
                {summary.totalIncome != null
                  ? <StatTile
                      label="Income"
                      value={formatMoney(summary.totalIncome)}
                    />
                  : null}
                {summary.totalDeductions != null
                  ? <StatTile
                      label="Deductions"
                      value={formatMoney(summary.totalDeductions)}
                    />
                  : null}
                {summary.totalTax != null
                  ? <StatTile
                      label="Tax"
                      value={formatMoney(summary.totalTax)}
                    />
                  : null}
              </View>
            </Card>
          : null}

        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Tax records
          </Text>
          <TouchableOpacity
            accessibilityLabel="Add tax record"
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.bodyStrong, { color: colors.onPrimary }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {records.map((item) => (
          <TaxRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() =>
              navigation.navigate('TaxDetail', { id: getId(item) })
            }
          />
        ))}

        {create.error
          ? <Text style={[styles.caption, { color: colors.danger }]}>
              {create.error?.message}
            </Text>
          : null}
      </ScrollView>

      <CreateTaxSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
        loading={create.loading}
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
