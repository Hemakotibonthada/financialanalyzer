import React, { useState } from 'react';
import {
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
  SectionHeader,
} from '../../components/ui';
import { radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id;
}

function InfoRow({ label, value, colors }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function RegimeCard({ label, totalTax, isRecommended, colors }) {
  const borderColor = isRecommended ? colors.primary : colors.border;
  const bg = isRecommended ? colors.primarySoft : colors.surface;
  return (
    <View style={[styles.regimeCard, { borderColor, backgroundColor: bg }]}>
      {isRecommended
        ? <Text style={[styles.micro, {
            color: colors.primary,
            marginBottom: spacing.xs,
          }]}>
            RECOMMENDED
          </Text>
        : null}
      <Text style={[styles.subheading, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.display, { color: colors.text }]}>
        {formatMoney(totalTax)}
      </Text>
    </View>
  );
}

function EditRecordSheet({ visible, record, onClose, onSubmit, loading, colors }) {
  const [taxRegime, setTaxRegime] = useState(record?.taxRegime || 'new');

  function submit() {
    if (!taxRegime.trim()) return;
    onSubmit({ taxRegime: taxRegime.trim() });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit tax record">
      <View style={styles.sheetContent}>
        <InfoRow
          label="Assessment year"
          value={record?.assessmentYear}
          colors={colors}
        />
        <Input
          label="Tax regime (old / new)"
          value={taxRegime}
          onChangeText={setTaxRegime}
          accessibilityLabel="Tax regime"
        />
        <Button
          title={loading ? 'Saving…' : 'Save changes'}
          onPress={submit}
          accessibilityLabel="Save tax record"
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

export default function TaxDetailScreen({ route, navigation }) {
  const id = route?.params?.id;
  const { colors } = useTheme();

  const [editOpen, setEditOpen] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [regimeResult, setRegimeResult] = useState(null);

  const { data: record, loading, error, refetch } = useApi(
    () => taxApi.detail(id),
    [id]
  );

  const updateMutation = useMutation((body) => taxApi.update(id, body));
  const removeMutation = useMutation(() => taxApi.remove(id));
  const calcMutation = useMutation(() => taxApi.calculate(id, {}));
  const optimizeMutation = useMutation(() => taxApi.optimize(id, {}));
  const regimeMutation = useMutation(() => taxApi.compareRegimes(id, {}));

  async function handleUpdate(body) {
    try {
      await updateMutation.mutate(body);
      setEditOpen(false);
      refetch().catch(() => {});
    } catch {
      /* updateMutation.error surfaced below */
    }
  }

  async function handleRemove() {
    try {
      await removeMutation.mutate();
      navigation.goBack();
    } catch {
      /* removeMutation.error surfaced below */
    }
  }

  async function handleCalculate() {
    try {
      const result = await calcMutation.mutate();
      setCalcResult(result);
    } catch {
      /* calcMutation.error surfaced below */
    }
  }

  async function handleOptimize() {
    try {
      const result = await optimizeMutation.mutate();
      setOptimizeResult(result);
    } catch {
      /* optimizeMutation.error surfaced below */
    }
  }

  async function handleCompareRegimes() {
    try {
      const result = await regimeMutation.mutate();
      setRegimeResult(result);
    } catch {
      /* regimeMutation.error surfaced below */
    }
  }

  if (loading) return <Screen scroll><SkeletonList count={6} /></Screen>;
  if (error) return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  if (!record) return <Screen><EmptyState title="Record not found" /></Screen>;

  const income = record?.income || {};
  const deductions = record?.deductions || {};
  const taxCalc = calcResult || record?.taxCalculation;

  const anyError =
    updateMutation.error ||
    removeMutation.error ||
    calcMutation.error ||
    optimizeMutation.error ||
    regimeMutation.error;

  return (
    <Screen scroll>
      <Card style={styles.block}>
        <View style={styles.between}>
          <Text style={[styles.title, { color: colors.text }]}>
            AY {record?.assessmentYear || '—'}
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              accessibilityLabel="Edit tax record"
              accessibilityRole="button"
              onPress={() => setEditOpen(true)}
              style={[styles.ghostBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.caption, { color: colors.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Delete tax record"
              accessibilityRole="button"
              onPress={handleRemove}
              style={[styles.ghostBtn, { borderColor: colors.danger }]}
            >
              <Text style={[styles.caption, { color: colors.danger }]}>
                {removeMutation.loading ? 'Deleting…' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <InfoRow
          label="Regime"
          value={titleCase(record?.taxRegime)}
          colors={colors}
        />
        <InfoRow
          label="ITR status"
          value={titleCase(record?.itrFiling?.status)}
          colors={colors}
        />
        {record?.itrFiling?.filingDate
          ? <InfoRow
              label="Filed on"
              value={formatDate(record.itrFiling.filingDate)}
              colors={colors}
            />
          : null}
      </Card>

      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>Income</Text>
        {income.total != null
          ? <InfoRow
              label="Total income"
              value={formatMoney(income.total)}
              colors={colors}
            />
          : null}
        {Object.entries(income).map(([k, v]) =>
          k !== 'total' && v != null && typeof v !== 'object'
            ? <InfoRow key={k} label={titleCase(k)} value={formatMoney(v)} colors={colors} />
            : null
        )}
      </Card>

      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>Deductions</Text>
        {deductions.total != null
          ? <InfoRow
              label="Total deductions"
              value={formatMoney(deductions.total)}
              colors={colors}
            />
          : null}
        {Object.entries(deductions).map(([k, v]) =>
          k !== 'total' && v != null && typeof v !== 'object'
            ? <InfoRow key={k} label={titleCase(k)} value={formatMoney(v)} colors={colors} />
            : null
        )}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Tax calculation"
          actionLabel={calcMutation.loading ? 'Calculating…' : 'Calculate'}
          onAction={handleCalculate}
        />
        {taxCalc
          ? Object.entries(taxCalc).map(([k, v]) =>
              v != null && typeof v !== 'object'
                ? <InfoRow key={k} label={titleCase(k)} value={formatMoney(v)} colors={colors} />
                : null
            )
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Calculate" to compute tax for this record.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Optimisations"
          actionLabel={optimizeMutation.loading ? 'Running…' : 'Optimise'}
          onAction={handleOptimize}
        />
        {optimizeResult
          ? typeof optimizeResult === 'object'
            ? <>
                {optimizeResult.potentialSavings != null
                  ? <Text style={[styles.subheading, { color: colors.success }]}>
                      Potential savings: {formatMoney(optimizeResult.potentialSavings)}
                    </Text>
                  : null}
                {Array.isArray(optimizeResult.optimizations)
                  ? optimizeResult.optimizations.map((opt, i) => (
                      <View key={i} style={styles.optimizeItem}>
                        {opt?.title
                          ? <Text style={[styles.bodyStrong, { color: colors.text }]}>
                              {opt.title}
                            </Text>
                          : null}
                        {opt?.description
                          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                              {opt.description}
                            </Text>
                          : null}
                        {opt?.saving != null
                          ? <Text style={[styles.caption, { color: colors.success }]}>
                              Save {formatMoney(opt.saving)}
                            </Text>
                          : null}
                      </View>
                    ))
                  : null}
              </>
            : <Text style={[styles.body, { color: colors.text }]}>
                {String(optimizeResult)}
              </Text>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Optimise" for tax-saving suggestions.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Regime comparison"
          actionLabel={regimeMutation.loading ? 'Comparing…' : 'Compare regimes'}
          onAction={handleCompareRegimes}
        />
        {regimeResult
          ? <>
              <View style={styles.regimeRow}>
                <RegimeCard
                  label={titleCase(regimeResult?.currentRegime?.regime || 'Current')}
                  totalTax={regimeResult?.currentRegime?.totalTax ?? 0}
                  isRecommended={
                    regimeResult?.recommendation ===
                    regimeResult?.currentRegime?.regime
                  }
                  colors={colors}
                />
                <RegimeCard
                  label={titleCase(regimeResult?.otherRegime?.regime || 'Other')}
                  totalTax={regimeResult?.otherRegime?.totalTax ?? 0}
                  isRecommended={
                    regimeResult?.recommendation ===
                    regimeResult?.otherRegime?.regime
                  }
                  colors={colors}
                />
              </View>
              {regimeResult?.savings != null
                ? <View style={[styles.savingsBanner, {
                    backgroundColor: colors.successSoft,
                  }]}>
                    <Text style={[styles.bodyStrong, { color: colors.success }]}>
                      Switch to {titleCase(regimeResult.recommendation)} and save{' '}
                      {formatMoney(regimeResult.savings)}
                    </Text>
                  </View>
                : null}
            </>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Compare regimes" to see old vs new regime side by side.
            </Text>}
      </Card>

      {anyError
        ? <Text style={[styles.caption, { color: colors.danger }]}>
            {anyError?.message}
          </Text>
        : null}

      <EditRecordSheet
        visible={editOpen}
        record={record}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        loading={updateMutation.loading}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: { ...typography.title },
  heading: { ...typography.heading },
  subheading: { ...typography.subheading },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
  micro: { ...typography.micro },
  display: { ...typography.heading, marginTop: spacing.xs },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghostBtn: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  regimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  regimeCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  savingsBanner: {
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  optimizeItem: { gap: 2, paddingVertical: spacing.xs },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cancelButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
