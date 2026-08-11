import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { insuranceApi } from '../../api/endpoints';
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
  if (value == null || value === '' || value === '—') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function PremiumRow({ item, colors }) {
  const date = item?.paidDate || item?.dueDate;
  const status = item?.status || '—';
  const isOk = status === 'paid';
  return (
    <View style={[styles.historyRow, { borderTopColor: colors.border }]}>
      <View style={styles.historyLeft}>
        <Text style={[styles.body, { color: colors.text }]}>
          {formatMoney(item?.amount)}
        </Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {formatDate(date)}
          {item?.paymentMethod ? `  ·  ${item.paymentMethod}` : ''}
        </Text>
      </View>
      <Text style={[styles.caption, {
        color: isOk ? colors.success : colors.warning,
      }]}>
        {titleCase(status)}
      </Text>
    </View>
  );
}

function ClaimRow({ item, colors, onUpdate }) {
  const status = item?.status || '—';
  const isSettled = status === 'settled' || status === 'approved';
  return (
    <View style={[styles.historyRow, { borderTopColor: colors.border }]}>
      <View style={styles.historyLeft}>
        <Text style={[styles.body, { color: colors.text }]}>
          {formatMoney(item?.claimAmount)}
        </Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {formatDate(item?.incidentDate)}
        </Text>
        {item?.description
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              {item.description}
            </Text>
          : null}
        {item?.settlementAmount != null
          ? <Text style={[styles.caption, { color: colors.success }]}>
              Settled: {formatMoney(item.settlementAmount)}
            </Text>
          : null}
      </View>
      <View style={styles.claimRight}>
        <Text style={[styles.caption, {
          color: isSettled ? colors.success : colors.warning,
        }]}>
          {titleCase(status)}
        </Text>
        <TouchableOpacity
          accessibilityLabel={`Update claim status`}
          accessibilityRole="button"
          onPress={() => onUpdate(item)}
        >
          <Text style={[styles.caption, { color: colors.primary }]}>
            Update
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddPremiumSheet({ visible, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  function submit() {
    const amt = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) return;
    onSubmit({
      amount: amt,
      paymentDate: paymentDate.trim() || undefined,
      paymentMethod: paymentMethod.trim() || undefined,
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Record premium payment">
      <View style={styles.sheetContent}>
        <Input
          label="Amount paid (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Premium amount paid"
        />
        <Input
          label="Payment date (YYYY-MM-DD)"
          value={paymentDate}
          onChangeText={setPaymentDate}
          accessibilityLabel="Premium payment date"
        />
        <Input
          label="Payment method"
          value={paymentMethod}
          onChangeText={setPaymentMethod}
          accessibilityLabel="Payment method"
        />
        <Button
          title={loading ? 'Saving…' : 'Record payment'}
          onPress={submit}
          accessibilityLabel="Record premium payment"
        />
      </View>
    </Sheet>
  );
}

function FileClaimSheet({ visible, onClose, onSubmit, loading }) {
  const [incidentDate, setIncidentDate] = useState('');
  const [description, setDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState('');

  function submit() {
    const amt = Number(String(claimAmount).replace(/,/g, ''));
    if (!description.trim()) return;
    onSubmit({
      incidentDate: incidentDate.trim() || undefined,
      description: description.trim(),
      claimAmount: Number.isFinite(amt) && amt > 0 ? amt : undefined,
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="File a claim">
      <View style={styles.sheetContent}>
        <Input
          label="Incident date (YYYY-MM-DD)"
          value={incidentDate}
          onChangeText={setIncidentDate}
          accessibilityLabel="Incident date"
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Claim description"
        />
        <Input
          label="Claim amount (₹)"
          value={claimAmount}
          onChangeText={setClaimAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Claim amount"
        />
        <Button
          title={loading ? 'Filing…' : 'File claim'}
          onPress={submit}
          accessibilityLabel="File insurance claim"
        />
      </View>
    </Sheet>
  );
}

function UpdateClaimSheet({ visible, onClose, onSubmit, loading }) {
  const [status, setStatus] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [notes, setNotes] = useState('');

  function submit() {
    if (!status.trim()) return;
    const amt = Number(String(settlementAmount).replace(/,/g, ''));
    onSubmit({
      status: status.trim(),
      settlementAmount: Number.isFinite(amt) && amt > 0 ? amt : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Update claim">
      <View style={styles.sheetContent}>
        <Input
          label="Status (pending, approved, settled, rejected)"
          value={status}
          onChangeText={setStatus}
          accessibilityLabel="Claim status"
        />
        <Input
          label="Settlement amount (₹)"
          value={settlementAmount}
          onChangeText={setSettlementAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Settlement amount"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Claim notes"
        />
        <Button
          title={loading ? 'Saving…' : 'Update claim'}
          onPress={submit}
          accessibilityLabel="Update claim status"
        />
      </View>
    </Sheet>
  );
}

export default function InsuranceDetailScreen({ route }) {
  const id = route?.params?.id;
  const { colors } = useTheme();

  const [activeSheet, setActiveSheet] = useState(null);
  const [activeClaim, setActiveClaim] = useState(null);
  const [riskResult, setRiskResult] = useState(null);

  const { data: policy, loading, error, refetch } = useApi(
    () => insuranceApi.detail(id),
    [id]
  );
  const { data: returnsData, loading: returnsLoading } = useApi(
    () => insuranceApi.returns(id),
    [id]
  );

  const addPremiumMutation = useMutation((body) =>
    insuranceApi.addPremium(id, body)
  );
  const fileClaimMutation = useMutation((body) =>
    insuranceApi.fileClaim(id, body)
  );
  const updateClaimMutation = useMutation((body) =>
    insuranceApi.updateClaim(id, activeClaim?._id || activeClaim?.id, body)
  );
  const riskMutation = useMutation(() =>
    insuranceApi.riskAssessment(id, {})
  );

  async function handleAddPremium(body) {
    try {
      await addPremiumMutation.mutate(body);
      setActiveSheet(null);
      refetch().catch(() => {});
    } catch {
      /* error surfaced below */
    }
  }

  async function handleFileClaim(body) {
    try {
      await fileClaimMutation.mutate(body);
      setActiveSheet(null);
      refetch().catch(() => {});
    } catch {
      /* error surfaced below */
    }
  }

  async function handleUpdateClaim(body) {
    try {
      await updateClaimMutation.mutate(body);
      setActiveSheet(null);
      setActiveClaim(null);
      refetch().catch(() => {});
    } catch {
      /* error surfaced below */
    }
  }

  async function handleRiskAssessment() {
    try {
      const result = await riskMutation.mutate();
      setRiskResult(result);
    } catch {
      /* error surfaced below */
    }
  }

  if (loading) return <Screen scroll><SkeletonList count={6} /></Screen>;
  if (error) return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  if (!policy) return <Screen><EmptyState title="Policy not found" /></Screen>;

  const premiumHistory = Array.isArray(policy?.premiumHistory)
    ? policy.premiumHistory : [];
  const claims = Array.isArray(policy?.claims) ? policy.claims : [];
  const details = policy?.policyDetails || {};
  const riskAssessment = riskResult || policy?.riskAssessment;

  const mutationError =
    addPremiumMutation.error ||
    fileClaimMutation.error ||
    updateClaimMutation.error ||
    riskMutation.error;

  return (
    <Screen scroll>
      <Card style={styles.block}>
        <Text style={[styles.display, { color: colors.text }]}>
          {titleCase(policy?.type || 'Insurance')}
        </Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {policy?.provider?.name || '—'}
          {policy?.provider?.policyNumber
            ? `  ·  ${policy.provider.policyNumber}` : ''}
        </Text>
        <InfoRow
          label="Status"
          value={titleCase(policy?.status)}
          colors={colors}
        />
        <InfoRow
          label="Sum insured"
          value={details?.sumInsured != null
            ? formatMoney(details.sumInsured) : null}
          colors={colors}
        />
        <InfoRow
          label="Annual premium"
          value={details?.premiumAmount != null
            ? formatMoney(details.premiumAmount) : null}
          colors={colors}
        />
        <InfoRow
          label="Premium frequency"
          value={titleCase(details?.premiumFrequency)}
          colors={colors}
        />
        <InfoRow
          label="Next due"
          value={details?.nextDueDate
            ? formatDate(details.nextDueDate) : null}
          colors={colors}
        />
        <InfoRow
          label="Start date"
          value={policy?.startDate ? formatDate(policy.startDate) : null}
          colors={colors}
        />
        <InfoRow
          label="End date"
          value={policy?.endDate ? formatDate(policy.endDate) : null}
          colors={colors}
        />
      </Card>

      {!returnsLoading && returnsData && Object.keys(returnsData).length > 0
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>Returns</Text>
            {Object.entries(returnsData).map(([k, v]) =>
              v != null && typeof v !== 'object'
                ? <InfoRow key={k} label={titleCase(k)} value={String(v)} colors={colors} />
                : null
            )}
          </Card>
        : null}

      <Card style={styles.block}>
        <SectionHeader
          title="Risk assessment"
          actionLabel={riskMutation.loading ? 'Running…' : 'Run assessment'}
          onAction={handleRiskAssessment}
        />
        {riskAssessment
          ? <View style={styles.riskBox}>
              {typeof riskAssessment === 'string'
                ? <Text style={[styles.body, { color: colors.text }]}>
                    {riskAssessment}
                  </Text>
                : Object.entries(riskAssessment).map(([k, v]) =>
                    v != null && typeof v !== 'object'
                      ? <InfoRow
                          key={k}
                          label={titleCase(k)}
                          value={String(v)}
                          colors={colors}
                        />
                      : null
                  )}
            </View>
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              Tap "Run assessment" to analyse risk for this policy.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title={`Premium history (${premiumHistory.length})`}
          actionLabel="Add payment"
          onAction={() => setActiveSheet('addPremium')}
        />
        {premiumHistory.length
          ? premiumHistory.map((p, i) => (
              <PremiumRow key={i} item={p} colors={colors} />
            ))
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              No premium payments recorded yet.
            </Text>}
      </Card>

      <Card style={styles.block}>
        <SectionHeader
          title={`Claims (${claims.length})`}
          actionLabel="File claim"
          onAction={() => setActiveSheet('fileClaim')}
        />
        {claims.length
          ? claims.map((c, i) => (
              <ClaimRow
                key={c._id || c.id || i}
                item={c}
                colors={colors}
                onUpdate={(claim) => {
                  setActiveClaim(claim);
                  setActiveSheet('updateClaim');
                }}
              />
            ))
          : <Text style={[styles.caption, { color: colors.textMuted }]}>
              No claims filed yet.
            </Text>}
      </Card>

      {mutationError
        ? <Text style={[styles.caption, { color: colors.danger }]}>
            {mutationError?.message}
          </Text>
        : null}

      <AddPremiumSheet
        visible={activeSheet === 'addPremium'}
        onClose={() => setActiveSheet(null)}
        onSubmit={handleAddPremium}
        loading={addPremiumMutation.loading}
      />
      <FileClaimSheet
        visible={activeSheet === 'fileClaim'}
        onClose={() => setActiveSheet(null)}
        onSubmit={handleFileClaim}
        loading={fileClaimMutation.loading}
      />
      <UpdateClaimSheet
        visible={activeSheet === 'updateClaim'}
        onClose={() => { setActiveSheet(null); setActiveClaim(null); }}
        onSubmit={handleUpdateClaim}
        loading={updateClaimMutation.loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  display: { ...typography.title },
  heading: { ...typography.heading },
  body: { ...typography.body },
  caption: { ...typography.caption },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  historyLeft: { flex: 1, gap: 2 },
  claimRight: { alignItems: 'flex-end', gap: spacing.xs },
  riskBox: { gap: spacing.xs },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
