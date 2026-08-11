import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { creditCardsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatDate, dueLabel, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  ErrorState,
  Input,
  Screen,
  Sheet,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function cardLabel(item) {
  const provider = item?.cardProvider || '—';
  const digits = item?.cardLastFourDigits || '';
  return digits ? `${provider} ****${digits}` : provider;
}

function PaySheet({ visible, onClose, bill, onSubmit, loading, colors }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');

  function submit() {
    const amt = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) return;
    onSubmit({ amount: amt, paymentMethod: method.trim() || undefined });
  }

  const remaining = Number(
    bill?.remainingAmount ??
      (Number(bill?.totalAmount ?? 0) - Number(bill?.amountPaid ?? 0))
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Record payment">
      <View style={styles.sheetBody}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Outstanding: {formatMoney(Math.max(remaining, 0))}
        </Text>
        <Input
          label="Amount paid"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Payment amount"
        />
        <Input
          label="Payment method (optional)"
          value={method}
          onChangeText={setMethod}
          accessibilityLabel="Payment method"
        />
        <Button
          title={loading ? 'Recording…' : 'Record payment'}
          loading={loading}
          onPress={submit}
          accessibilityLabel="Confirm payment"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel payment"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

function EditSheet({ visible, onClose, bill, onSubmit, loading, colors }) {
  const [notes, setNotes] = useState(bill?.notes || '');
  const [dueDate, setDueDate] = useState(
    bill?.dueDate ? formatDate(bill.dueDate, 'yyyy-MM-dd') : ''
  );

  function submit() {
    onSubmit({
      notes: notes.trim() || undefined,
      dueDate: dueDate.trim() || undefined
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit bill">
      <View style={styles.sheetBody}>
        <Input
          label="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          accessibilityLabel="Due date"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Bill notes"
          multiline
        />
        <Button
          title={loading ? 'Saving…' : 'Save changes'}
          loading={loading}
          onPress={submit}
          accessibilityLabel="Save bill changes"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel edit"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function CreditCardBillDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => creditCardsApi.detail(id),
    [id]
  );

  const updateBill = useMutation((body) => creditCardsApi.update(id, body));
  const removeBill = useMutation(() => creditCardsApi.remove(id));
  const payBill = useMutation((body) => creditCardsApi.pay(id, body));

  const bill = data?.bill || data?.data || data;

  function confirmDelete() {
    Alert.alert(
      'Delete bill',
      `Delete this bill from ${cardLabel(bill)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBill.mutate();
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not delete bill.');
            }
          }
        }
      ]
    );
  }

  async function submitEdit(body) {
    try {
      await updateBill.mutate(body);
      setEditOpen(false);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update bill.');
    }
  }

  async function submitPay(body) {
    try {
      await payBill.mutate(body);
      setPayOpen(false);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Payment failed', e?.message || 'Could not record payment.');
    }
  }

  if (loading) return <Screen><SkeletonList count={6} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  const due = dueLabel(bill?.dueDate);
  const dueColor =
    due.tone === 'danger'
      ? colors.danger
      : due.tone === 'warning'
        ? colors.warning
        : colors.textMuted;
  const totalAmount = Number(bill?.totalAmount ?? 0);
  const amountPaid = Number(bill?.amountPaid ?? 0);
  const remaining = Math.max(totalAmount - amountPaid, 0);

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        <Card style={styles.heroCard}>
          <Text style={[styles.cardName, { color: colors.textMuted }]}>
            {cardLabel(bill)}
          </Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>
            {formatMoney(totalAmount)}
          </Text>
          <Text style={[styles.dueText, { color: dueColor }]}>{due.text}</Text>
          <View style={styles.statGrid}>
            <StatTile label="Paid" value={formatMoney(amountPaid)} />
            <StatTile label="Remaining" value={formatMoney(remaining)} />
            {(bill?.minimumDue ?? 0) > 0 && (
              <StatTile label="Min due" value={formatMoney(bill.minimumDue)} />
            )}
          </View>
        </Card>

        {remaining > 0 && (
          <Button
            title="Record payment"
            onPress={() => setPayOpen(true)}
            accessibilityLabel="Record a payment for this bill"
          />
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Bill details
          </Text>
          {[
            ['Statement date', formatDate(bill?.statementDate)],
            ['Due date', formatDate(bill?.dueDate)],
            ['Status', titleCase(bill?.paymentStatus || '')],
            ['Interest charged', formatMoney(bill?.interestCharged ?? 0)],
            ['Fees & charges', formatMoney(bill?.feesAndCharges ?? 0)],
            ['Rewards earned', formatMoney(bill?.rewardsEarned ?? 0)]
          ].map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {label}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {value}
              </Text>
            </View>
          ))}
          {bill?.notes ? (
            <Text style={[styles.notes, { color: colors.textMuted }]}>
              {bill.notes}
            </Text>
          ) : null}
        </Card>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityLabel="Edit bill"
            accessibilityRole="button"
            onPress={() => setEditOpen(true)}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Delete bill"
            accessibilityRole="button"
            onPress={confirmDelete}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.dangerSoft, borderColor: colors.danger }
            ]}
          >
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PaySheet
        key={payOpen ? 'pay-open' : 'pay-closed'}
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        bill={bill}
        onSubmit={submitPay}
        loading={payBill.loading}
        colors={colors}
      />
      <EditSheet
        key={editOpen ? 'edit-open' : 'edit-closed'}
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        bill={bill}
        onSubmit={submitEdit}
        loading={updateBill.loading}
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
  heroCard: {
    gap: spacing.md
  },
  cardName: {
    ...typography.caption
  },
  heroAmount: {
    ...typography.display
  },
  dueText: {
    ...typography.bodyStrong
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  sectionTitle: {
    ...typography.subheading,
    marginBottom: spacing.md
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md
  },
  detailLabel: {
    ...typography.caption
  },
  detailValue: {
    ...typography.caption,
    fontWeight: '600'
  },
  notes: {
    ...typography.caption,
    marginTop: spacing.md
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  actionBtn: {
    flex: 1,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionText: {
    ...typography.bodyStrong
  },
  meta: {
    ...typography.caption
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.md
  },
  cancelBtn: {
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
