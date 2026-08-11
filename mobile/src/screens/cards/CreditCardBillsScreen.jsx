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
import { formatMoney, dueLabel, titleCase } from '../../utils/format';
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

function getId(item) {
  return item?.id || item?._id;
}

function cardLabel(item) {
  const provider = item?.cardProvider || '—';
  const digits = item?.cardLastFourDigits || item?.cardDigits || '';
  return digits ? `${provider} ****${digits}` : provider;
}

function PaySheet({ visible, onClose, bill, onSubmit, loading, colors }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');

  function submit() {
    const amt = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) return;
    onSubmit(getId(bill), { amount: amt, paymentMethod: method.trim() || undefined });
  }

  const remaining = Number(
    bill?.remainingAmount ??
      (Number(bill?.totalAmount ?? 0) - Number(bill?.amountPaid ?? 0))
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Record payment">
      <View style={styles.sheetBody}>
        <Text style={[styles.payMeta, { color: colors.textMuted }]}>
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

function BillRow({ item, colors, onPress, onPayPress }) {
  const due = dueLabel(item?.dueDate);
  const dueColor =
    due.tone === 'danger'
      ? colors.danger
      : due.tone === 'warning'
        ? colors.warning
        : colors.textMuted;
  const isOverdue = due.tone === 'danger';
  const totalAmount = Number(item?.totalAmount ?? 0);
  const amountPaid = Number(item?.amountPaid ?? 0);
  const remaining = Math.max(totalAmount - amountPaid, 0);

  return (
    <TouchableOpacity
      accessibilityLabel={`Open ${cardLabel(item)} bill`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: isOverdue ? colors.danger : colors.border,
          backgroundColor: isOverdue ? colors.dangerSoft : colors.surface
        }
      ]}
    >
      <View style={styles.rowTop}>
        <Text
          style={[styles.rowTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {cardLabel(item)}
        </Text>
        <Text style={[styles.rowAmount, { color: colors.text }]}>
          {formatMoney(totalAmount)}
        </Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.rowDue, { color: dueColor }]}>{due.text}</Text>
        {item?.paymentStatus ? (
          <Text style={[styles.rowStatus, { color: colors.textMuted }]}>
            {titleCase(item.paymentStatus)}
          </Text>
        ) : null}
      </View>
      {remaining > 0 && (
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            Outstanding: {formatMoney(remaining)}
          </Text>
          <TouchableOpacity
            accessibilityLabel={`Pay ${cardLabel(item)} bill`}
            accessibilityRole="button"
            onPress={onPayPress}
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.payBtnText, { color: colors.onPrimary }]}>
              Pay
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CreditCardBillsScreen({ navigation }) {
  const { colors } = useTheme();
  const [payBill, setPayBill] = useState(null);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () =>
      Promise.all([creditCardsApi.summary(), creditCardsApi.bills()])
        .then(([sumW, billsData]) => ({
          summary: sumW?.data ?? sumW,
          summaryFromCache: sumW?.fromCache ?? false,
          bills:
            billsData?.bills ||
            billsData?.items ||
            (Array.isArray(billsData) ? billsData : [])
        })),
    []
  );

  const payMutation = useMutation(({ id, body }) => creditCardsApi.pay(id, body));
  const syncMutation = useMutation(() => creditCardsApi.syncGmail());

  const bills = data?.bills || [];
  const summary = data?.summary || {};
  const isStale = Boolean(data?.summaryFromCache);

  async function doPay(id, body) {
    try {
      await payMutation.mutate({ id, body });
      setPayBill(null);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Payment failed', e?.message || 'Could not record payment.');
    }
  }

  async function doSyncGmail() {
    try {
      await syncMutation.mutate();
      refetch().catch(() => {});
      Alert.alert('Synced', 'Bills from Gmail have been imported.');
    } catch (e) {
      Alert.alert('Sync failed', e?.message || 'Could not sync from Gmail.');
    }
  }

  if (loading) return <Screen><SkeletonList count={6} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        {isStale && (
          <View style={[styles.staleBanner, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.staleText, { color: colors.warning }]}>
              Summary is from cached data
            </Text>
          </View>
        )}

        <Card style={styles.heroCard}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Credit card bills
          </Text>
          <View style={styles.statGrid}>
            <StatTile
              label="Outstanding"
              value={formatMoney(summary?.totalOutstanding ?? 0)}
            />
            <StatTile
              label="Min due"
              value={formatMoney(summary?.totalMinimumDue ?? 0)}
            />
            {(summary?.overdueCount ?? 0) > 0 && (
              <StatTile
                label="Overdue"
                value={String(summary.overdueCount)}
                trend="down"
              />
            )}
          </View>
        </Card>

        <TouchableOpacity
          accessibilityLabel="Sync credit card bills from Gmail"
          accessibilityRole="button"
          onPress={doSyncGmail}
          style={[
            styles.syncBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              opacity: syncMutation.loading ? 0.6 : 1
            }
          ]}
        >
          <Text style={[styles.syncBtnText, { color: colors.primary }]}>
            {syncMutation.loading ? 'Syncing…' : '✉  Sync from Gmail'}
          </Text>
        </TouchableOpacity>

        {!bills.length ? (
          <EmptyState
            title="No credit card bills"
            description="Sync from Gmail or add bills manually to track due dates."
          />
        ) : (
          bills.map((item) => (
            <BillRow
              key={getId(item)}
              item={item}
              colors={colors}
              onPress={() =>
                navigation.navigate('CreditCardBillDetail', { id: getId(item) })
              }
              onPayPress={() => setPayBill(item)}
            />
          ))
        )}
      </ScrollView>

      {payBill && (
        <PaySheet
          key={getId(payBill)}
          visible={Boolean(payBill)}
          onClose={() => setPayBill(null)}
          bill={payBill}
          onSubmit={doPay}
          loading={payMutation.loading}
          colors={colors}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  staleBanner: {
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center'
  },
  staleText: {
    ...typography.caption,
    fontWeight: '600'
  },
  heroCard: {
    gap: spacing.md
  },
  heroTitle: {
    ...typography.title
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  syncBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  syncBtnText: {
    ...typography.bodyStrong
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rowTitle: {
    ...typography.subheading,
    flex: 1
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  rowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rowDue: {
    ...typography.caption,
    fontWeight: '700'
  },
  rowStatus: {
    ...typography.caption
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowMeta: {
    ...typography.caption
  },
  payBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  payBtnText: {
    ...typography.bodyStrong
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.md
  },
  payMeta: {
    ...typography.caption
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
