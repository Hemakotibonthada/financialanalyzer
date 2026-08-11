import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { settlementApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate, formatMoney, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  StatTile,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

function InfoRow({ label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>
        {value != null && value !== '' ? value : '—'}
      </Text>
    </View>
  );
}

function RecordPaymentSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  return (
    <Sheet visible={visible} title="Record payment" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Amount paid (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Payment amount"
        />
        <Input
          label="Payment method"
          value={method}
          onChangeText={setMethod}
          accessibilityLabel="Payment method"
        />
        <Input
          label="Reference / UTR number"
          value={reference}
          onChangeText={setReference}
          accessibilityLabel="Payment reference"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Record payment"
          loading={loading}
          disabled={!amount.trim()}
          onPress={() =>
            onSubmit({
              amountInINR: Number(amount),
              method: method.trim(),
              reference: reference.trim(),
              receivedAt: new Date().toISOString(),
            })
          }
          accessibilityLabel="Confirm record payment"
        />
      </View>
    </Sheet>
  );
}

function WaiverSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  return (
    <Sheet visible={visible} title="Waive fee" onClose={onClose}>
      <View style={styles.sheetBody}>
        <View style={[styles.warnBox, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.warnText, { color: colors.warning }]}>
            Waiving the fee requires a mandatory reason and manager approval.
            This will be recorded in the audit trail.
          </Text>
        </View>
        <Input
          label="Reason for waiver (required)"
          value={reason}
          onChangeText={setReason}
          multiline
          accessibilityLabel="Waiver reason"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Request waiver"
          variant="secondary"
          loading={loading}
          disabled={!reason.trim()}
          onPress={() => onSubmit({ reason: reason.trim() })}
          accessibilityLabel="Confirm fee waiver request"
        />
      </View>
    </Sheet>
  );
}

export default function SettlementScreen({ route }) {
  const { estateCaseId } = route.params;
  const { colors } = useTheme();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);

  const stmt = useApi(
    () => settlementApi.statement(estateCaseId),
    [estateCaseId],
  );
  const compute = useMutation((body) =>
    settlementApi.compute(estateCaseId, body),
  );
  const invoice = useMutation((body) =>
    settlementApi.invoice(estateCaseId, body),
  );
  const recordPayment = useMutation((body) =>
    settlementApi.recordPayment(estateCaseId, body),
  );
  const waiver = useMutation((body) =>
    settlementApi.waiver(estateCaseId, body),
  );

  if (stmt.loading) {
    return (
      <Screen title="Settlement">
        <SkeletonList count={8} />
      </Screen>
    );
  }

  if (stmt.error) {
    return (
      <Screen title="Settlement">
        <ErrorState message={stmt.error.message} onRetry={stmt.refetch} />
      </Screen>
    );
  }

  const s = stmt.data || {};
  const basisAmount = s.basisAmountInINR ?? null;
  const grossFee = s.grossFeeInINR ?? null;
  const gstAmount = s.gstAmountInINR ?? null;
  const totalFee = s.totalPayableInINR ?? null;
  const netToFamily =
    basisAmount != null && totalFee != null
      ? basisAmount - totalFee
      : null;
  const lineItems = Array.isArray(s.lineItems) ? s.lineItems : [];
  const payments = Array.isArray(s.payments) ? s.payments : [];
  const feeStatus = s.status || null;

  const handleCompute = () => {
    Alert.alert(
      'Recompute fee',
      'This recalculates the settlement fee based on currently recovered ' +
      'assets. The fee is 1% of recovered amounts only — not of all ' +
      'discovered assets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recompute',
          onPress: async () => {
            try {
              await compute.mutate({});
              stmt.refetch();
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Compute failed.');
            }
          },
        },
      ],
    );
  };

  const handleInvoice = () => {
    Alert.alert(
      'Issue invoice',
      'This creates a formal invoice for the settlement fee. Once issued, ' +
      'the fee amount is locked. Ensure the fee has been computed first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue invoice',
          onPress: async () => {
            try {
              await invoice.mutate({});
              stmt.refetch();
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Invoice failed.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen
      title="Settlement"
      scroll
      refreshing={stmt.refreshing}
      onRefresh={stmt.onRefresh}
    >
      {stmt.fromCache && (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Showing cached data — pull down to refresh.
          </Text>
        </View>
      )}

      {basisAmount == null && totalFee == null ? (
        <EmptyState
          title="No settlement computed yet"
          description={
            'Use "Compute fee" to calculate the 1% success fee on recovered assets.'
          }
          actionLabel="Compute fee"
          onAction={handleCompute}
        />
      ) : (
        <>
          <Card style={styles.block}>
            <SectionHeader title="Fee summary" />
            <Text style={[styles.feeNote, { color: colors.textMuted }]}>
              The success fee is {s.feePercentage ?? 1}% of recovered assets
              only — not of all discovered assets.
              {s.gstPercentage != null
                ? ` GST at ${s.gstPercentage}% is added on top.`
                : ''}
            </Text>
            <View style={styles.statRow}>
              <StatTile
                label="Fee basis (recovered)"
                value={
                  basisAmount != null ? formatMoney(basisAmount) : '—'
                }
              />
              <StatTile
                label={`Fee (${s.feePercentage ?? 1}% + GST)`}
                value={totalFee != null ? formatMoney(totalFee) : '—'}
              />
              <StatTile
                label="Net to family"
                value={netToFamily != null ? formatMoney(netToFamily) : '—'}
              />
            </View>
          </Card>

          <Card style={styles.block}>
            <SectionHeader title="Fee breakdown" />
            <InfoRow
              label="Recovered assets (fee basis)"
              value={basisAmount != null ? formatMoney(basisAmount) : null}
              colors={colors}
            />
            <InfoRow
              label={`Gross fee (${s.feePercentage ?? 1}%)`}
              value={grossFee != null ? formatMoney(grossFee) : null}
              colors={colors}
            />
            <InfoRow
              label={`GST (${s.gstPercentage ?? 18}%)`}
              value={gstAmount != null ? formatMoney(gstAmount) : null}
              colors={colors}
            />
            <InfoRow
              label="Total fee payable"
              value={totalFee != null ? formatMoney(totalFee) : null}
              colors={colors}
            />
            <InfoRow
              label="Net disbursable to family"
              value={netToFamily != null ? formatMoney(netToFamily) : null}
              colors={colors}
            />
            <InfoRow
              label="Invoice number"
              value={s.invoiceNumber}
              colors={colors}
            />
            <InfoRow
              label="Fee status"
              value={titleCase(feeStatus)}
              colors={colors}
            />
            <InfoRow
              label="Amount paid"
              value={s.amountPaidInINR != null
                ? formatMoney(s.amountPaidInINR)
                : null}
              colors={colors}
            />
            <InfoRow
              label="Balance outstanding"
              value={s.balanceInINR != null
                ? formatMoney(s.balanceInINR)
                : null}
              colors={colors}
            />
            {s.waiver?.waived && (
              <View
                style={[styles.waivedBox, { backgroundColor: colors.successSoft }]}
              >
                <Text style={[styles.waivedText, { color: colors.success }]}>
                  Fee waived — {s.waiver.reason || 'no reason recorded'}
                </Text>
              </View>
            )}
            {s.minFeeApplied && (
              <Text style={[styles.feeNote, { color: colors.textMuted }]}>
                Minimum fee floor applied.
              </Text>
            )}
            {s.maxFeeApplied && (
              <Text style={[styles.feeNote, { color: colors.textMuted }]}>
                Maximum fee cap applied.
              </Text>
            )}
          </Card>

          {lineItems.length > 0 && (
            <Card style={styles.block}>
              <SectionHeader title="Per-asset fee line items" />
              {lineItems.map((item, i) => (
                <View
                  key={item?.estateAssetId || i}
                  style={[styles.lineRow, { borderTopColor: colors.border }]}
                >
                  <View style={styles.lineMain}>
                    <Text style={[styles.lineDesc, { color: colors.text }]}>
                      {item?.description || 'Asset'}
                    </Text>
                    <Text style={[styles.lineSub, { color: colors.textMuted }]}>
                      Recovered: {formatMoney(item?.recoveredInINR)}
                    </Text>
                  </View>
                  <Text style={[styles.lineAmt, { color: colors.text }]}>
                    {formatMoney(item?.feeInINR)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {payments.length > 0 && (
            <Card style={styles.block}>
              <SectionHeader title="Payments received" />
              {payments.map((p, i) => (
                <View
                  key={i}
                  style={[styles.lineRow, { borderTopColor: colors.border }]}
                >
                  <View style={styles.lineMain}>
                    <Text style={[styles.lineDesc, { color: colors.text }]}>
                      {p?.method || 'Payment'}
                    </Text>
                    <Text style={[styles.lineSub, { color: colors.textMuted }]}>
                      {formatDate(p?.receivedAt)}{' '}
                      {p?.reference ? `· ${p.reference}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.lineAmt, { color: colors.success }]}>
                    {formatMoney(p?.amountInINR)}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      <Card style={styles.block}>
        <SectionHeader title="Actions" />
        <View style={styles.actions}>
          <Button
            title="Compute fee"
            variant="secondary"
            loading={compute.loading}
            onPress={handleCompute}
            accessibilityLabel="Compute settlement fee"
          />
          {compute.error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {compute.error.message}
            </Text>
          )}
          <Button
            title="Issue invoice"
            variant="secondary"
            loading={invoice.loading}
            onPress={handleInvoice}
            accessibilityLabel="Issue settlement invoice"
          />
          {invoice.error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {invoice.error.message}
            </Text>
          )}
          <Button
            title="Record payment"
            onPress={() => setPaymentOpen(true)}
            accessibilityLabel="Record a fee payment"
          />
          <Button
            title="Request fee waiver"
            variant="ghost"
            onPress={() => setWaiverOpen(true)}
            accessibilityLabel="Request fee waiver"
          />
          {waiver.error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {waiver.error.message}
            </Text>
          )}
        </View>
      </Card>

      <RecordPaymentSheet
        visible={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        loading={recordPayment.loading}
        error={recordPayment.error}
        onSubmit={async (body) => {
          try {
            await recordPayment.mutate(body);
            setPaymentOpen(false);
            stmt.refetch();
          } catch (_) {}
        }}
      />
      <WaiverSheet
        visible={waiverOpen}
        onClose={() => setWaiverOpen(false)}
        loading={waiver.loading}
        error={waiver.error}
        onSubmit={async (body) => {
          try {
            await waiver.mutate(body);
            setWaiverOpen(false);
            stmt.refetch();
          } catch (_) {}
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerText: {
    ...typography.caption,
  },
  block: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  feeNote: {
    ...typography.caption,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    flex: 1,
  },
  value: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  lineRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  lineMain: {
    flex: 1,
    gap: spacing.xs,
  },
  lineDesc: {
    ...typography.bodyStrong,
  },
  lineSub: {
    ...typography.caption,
  },
  lineAmt: {
    ...typography.bodyStrong,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  warnBox: {
    borderRadius: 8,
    padding: spacing.md,
  },
  warnText: {
    ...typography.caption,
    lineHeight: 20,
  },
  waivedBox: {
    borderRadius: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  waivedText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
