import React, { useState } from 'react';
import {
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
  SectionHeader,
} from '../../components/ui';
import { LineChartCard } from '../../components/charts';
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

/**
 * Convert projections payload (unknown shape) to [{ label, value }] for
 * LineChartCard. No values are invented — if the array is empty, the chart
 * shows its own empty state.
 */
function toChartSeries(proj) {
  if (!proj) return [];
  const arr = Array.isArray(proj)
    ? proj
    : proj?.projections || proj?.yearlyData || proj?.data || [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p, i) => ({
      label: p?.year != null ? String(p.year) : String(i + 1),
      value: Number(p?.corpus || p?.value || p?.amount || 0),
    }))
    .filter((p) => Number.isFinite(p.value));
}

function InvestmentRow({ item, colors, onRemove, removing }) {
  const name = item?.name || item?.type || 'Investment';
  const amount = item?.amount;
  const currentValue = item?.currentValue;
  const expectedReturn = item?.expectedReturn;
  return (
    <View style={[styles.investRow, { borderTopColor: colors.border }]}>
      <View style={styles.investLeft}>
        <Text style={[styles.bodyStrong, { color: colors.text }]}>
          {titleCase(name)}
        </Text>
        {amount != null
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Invested: {formatMoney(amount)}
            </Text>
          : null}
        {currentValue != null
          ? <Text style={[styles.caption, { color: colors.text }]}>
              Current: {formatMoney(currentValue)}
            </Text>
          : null}
        {expectedReturn != null
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Expected return: {formatPercent(expectedReturn)}
            </Text>
          : null}
      </View>
      <TouchableOpacity
        accessibilityLabel={`Remove ${titleCase(name)}`}
        accessibilityRole="button"
        onPress={() => onRemove(getId(item))}
        disabled={removing}
      >
        <Text style={[styles.caption, { color: colors.danger }]}>
          {removing ? 'Removing…' : 'Remove'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AddInvestmentSheet({ visible, onClose, onSubmit, loading }) {
  const [name, setName] = useState('');
  const [investType, setInvestType] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');

  function submit() {
    const amt = Number(String(amount).replace(/,/g, ''));
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const ret = Number(expectedReturn);
    onSubmit({
      name: name.trim(),
      type: investType.trim() || undefined,
      amount: amt,
      expectedReturn: Number.isFinite(ret) && ret > 0 ? ret : undefined,
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Add investment">
      <View style={styles.sheetContent}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Investment name"
        />
        <Input
          label="Type (e.g. MF, EPF, PPF)"
          value={investType}
          onChangeText={setInvestType}
          accessibilityLabel="Investment type"
        />
        <Input
          label="Amount invested (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount invested"
        />
        <Input
          label="Expected annual return (%)"
          value={expectedReturn}
          onChangeText={setExpectedReturn}
          keyboardType="decimal-pad"
          accessibilityLabel="Expected annual return percentage"
        />
        <Button
          title={loading ? 'Adding…' : 'Add investment'}
          onPress={submit}
          accessibilityLabel="Add investment to retirement plan"
        />
      </View>
    </Sheet>
  );
}

export default function RetirementDetailScreen({ route, navigation }) {
  const id = route?.params?.id;
  const { colors } = useTheme();

  const [corpusResult, setCorpusResult] = useState(null);
  const [savingsResult, setSavingsResult] = useState(null);
  const [projResult, setProjResult] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [addInvestOpen, setAddInvestOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const { data: plan, loading, error, refetch } = useApi(
    () => retirementApi.detail(id),
    [id]
  );

  const updateMutation = useMutation((body) => retirementApi.update(id, body));
  const removeMutation = useMutation(() => retirementApi.remove(id));
  const corpusMutation = useMutation(() =>
    retirementApi.calculateCorpus(id, {})
  );
  const savingsMutation = useMutation(() =>
    retirementApi.calculateSavings(id, {})
  );
  const projMutation = useMutation(() =>
    retirementApi.projections(id, {})
  );
  const scenarioMutation = useMutation(() =>
    retirementApi.scenarios(id, {})
  );
  const riskMutation = useMutation(() =>
    retirementApi.assessRisks(id, {})
  );
  const addInvestMutation = useMutation((body) =>
    retirementApi.addInvestment(id, body)
  );
  const removeInvestMutation = useMutation((investmentId) =>
    retirementApi.removeInvestment(id, investmentId)
  );

  async function runCorpus() {
    try { setCorpusResult(await corpusMutation.mutate()); } catch { /**/ }
  }
  async function runSavings() {
    try { setSavingsResult(await savingsMutation.mutate()); } catch { /**/ }
  }
  async function runProjections() {
    try { setProjResult(await projMutation.mutate()); } catch { /**/ }
  }
  async function runScenarios() {
    try { setScenarioResult(await scenarioMutation.mutate()); } catch { /**/ }
  }
  async function runRisks() {
    try { setRiskResult(await riskMutation.mutate()); } catch { /**/ }
  }

  async function handleAddInvestment(body) {
    try {
      await addInvestMutation.mutate(body);
      setAddInvestOpen(false);
      refetch().catch(() => {});
    } catch { /**/ }
  }

  async function handleRemoveInvestment(investmentId) {
    setRemovingId(investmentId);
    try {
      await removeInvestMutation.mutate(investmentId);
      refetch().catch(() => {});
    } catch { /**/ }
    setRemovingId(null);
  }

  async function handleRemovePlan() {
    try {
      await removeMutation.mutate();
      navigation.goBack();
    } catch { /**/ }
  }

  if (loading) return <Screen scroll><SkeletonList count={6} /></Screen>;
  if (error) return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  if (!plan) return <Screen><EmptyState title="Plan not found" /></Screen>;

  const planName =
    plan?.name || plan?.planName || `Retirement plan (age ${plan?.retirementAge ?? '—'})`;
  const investments = Array.isArray(plan?.investments) ? plan.investments : [];
  const projSeries = toChartSeries(projResult);

  const anyError =
    corpusMutation.error || savingsMutation.error || projMutation.error ||
    scenarioMutation.error || riskMutation.error ||
    addInvestMutation.error || removeInvestMutation.error || removeMutation.error;

  return (
    <Screen scroll>
      <Card style={styles.block}>
        <View style={styles.between}>
          <Text style={[styles.title, { color: colors.text }]}>{planName}</Text>
          <TouchableOpacity
            accessibilityLabel="Delete retirement plan"
            accessibilityRole="button"
            onPress={handleRemovePlan}
            disabled={removeMutation.loading}
          >
            <Text style={[styles.caption, { color: colors.danger }]}>
              {removeMutation.loading ? 'Deleting…' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
        <InfoRow
          label="Current age"
          value={plan?.currentAge != null ? String(plan.currentAge) : null}
          colors={colors}
        />
        <InfoRow
          label="Retirement age"
          value={plan?.retirementAge != null ? String(plan.retirementAge) : null}
          colors={colors}
        />
        {plan?.progress?.percentageAchieved != null
          ? <InfoRow
              label="Progress"
              value={formatPercent(plan.progress.percentageAchieved)}
              colors={colors}
            />
          : null}
        {plan?.corpusCalculation?.currentValue != null
          ? <InfoRow
              label="Current value"
              value={formatMoney(plan.corpusCalculation.currentValue)}
              colors={colors}
            />
          : null}
        {plan?.corpusCalculation?.requiredCorpus != null
          ? <InfoRow
              label="Required corpus"
              value={formatMoney(plan.corpusCalculation.requiredCorpus)}
              colors={colors}
            />
          : null}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Required corpus"
          actionLabel={corpusMutation.loading ? 'Calculating…' : 'Calculate corpus'}
          onAction={runCorpus}
        />
        {corpusResult
          ? Object.entries(corpusResult).map(([k, v]) =>
              v != null && typeof v !== 'object'
                ? <InfoRow key={k} label={titleCase(k)} value={formatMoney(v)} colors={colors} />
                : null
            )
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Calculate corpus" to compute the retirement corpus needed.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Monthly savings required"
          actionLabel={savingsMutation.loading ? 'Calculating…' : 'Calculate savings'}
          onAction={runSavings}
        />
        {savingsResult
          ? Object.entries(savingsResult).map(([k, v]) =>
              v != null && typeof v !== 'object'
                ? <InfoRow key={k} label={titleCase(k)} value={formatMoney(v)} colors={colors} />
                : null
            )
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Calculate savings" to find out how much to save monthly.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Projections"
          actionLabel={projMutation.loading ? 'Generating…' : 'Generate projections'}
          onAction={runProjections}
        />
        {projResult
          ? projSeries.length > 0
            ? <LineChartCard
                title=""
                data={projSeries}
                emptyTitle="No projection series returned"
              />
            : <Text style={[styles.caption, { color: colors.textMuted }]}>
                Projections returned — no chartable series found.
              </Text>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Generate projections" to see your corpus growth over time.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Scenario analysis"
          actionLabel={scenarioMutation.loading ? 'Running…' : 'Run scenarios'}
          onAction={runScenarios}
        />
        {scenarioResult
          ? Array.isArray(scenarioResult)
            ? scenarioResult.map((sc, i) => (
                <View key={i} style={styles.scenarioItem}>
                  {sc?.name || sc?.scenario
                    ? <Text style={[styles.bodyStrong, { color: colors.text }]}>
                        {sc.name || sc.scenario}
                      </Text>
                    : null}
                  {sc?.corpus != null
                    ? <Text style={[styles.caption, { color: colors.text }]}>
                        Corpus: {formatMoney(sc.corpus)}
                      </Text>
                    : null}
                  {sc?.description
                    ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                        {sc.description}
                      </Text>
                    : null}
                </View>
              ))
            : <Text style={[styles.body, { color: colors.text }]}>
                {JSON.stringify(scenarioResult, null, 2).slice(0, 400)}
              </Text>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Run scenarios" to model optimistic, realistic, and pessimistic outcomes.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title="Risk assessment"
          actionLabel={riskMutation.loading ? 'Assessing…' : 'Assess risks'}
          onAction={runRisks}
        />
        {riskResult
          ? <>
              {riskResult?.riskLevel
                ? <Text style={[styles.subheading, {
                    color: riskResult.riskLevel === 'low'
                      ? colors.success
                      : riskResult.riskLevel === 'medium'
                        ? colors.warning
                        : colors.danger,
                  }]}>
                    Risk level: {titleCase(riskResult.riskLevel)}
                  </Text>
                : null}
              {Array.isArray(riskResult?.risks)
                ? riskResult.risks.map((r, i) => (
                    <View key={i} style={styles.riskItem}>
                      {r?.type
                        ? <Text style={[styles.bodyStrong, { color: colors.text }]}>
                            {titleCase(r.type)}
                          </Text>
                        : null}
                      {r?.description
                        ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                            {r.description}
                          </Text>
                        : null}
                    </View>
                  ))
                : null}
            </>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Assess risks" to identify longevity, inflation, and market risks.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title={`Investments (${investments.length})`}
          actionLabel="Add"
          onAction={() => setAddInvestOpen(true)}
        />
        {investments.length
          ? investments.map((inv) => (
              <InvestmentRow
                key={getId(inv)}
                item={inv}
                colors={colors}
                onRemove={handleRemoveInvestment}
                removing={removingId === getId(inv)}
              />
            ))
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              No investments added yet.
            </Text>}
      </Card>

      {anyError
        ? <Text style={[styles.caption, { color: colors.danger }]}>
            {anyError?.message}
          </Text>
        : null}

      <AddInvestmentSheet
        visible={addInvestOpen}
        onClose={() => setAddInvestOpen(false)}
        onSubmit={handleAddInvestment}
        loading={addInvestMutation.loading}
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
  subheading: { ...typography.subheading },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  investRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  investLeft: { flex: 1, gap: 2 },
  scenarioItem: { gap: 2, paddingVertical: spacing.xs },
  riskItem: { gap: 2, paddingVertical: spacing.xs },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
