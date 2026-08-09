import React, { useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { emiApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { cancelReminder, scheduleReminder } from '../../utils/notifications';
import { dueLabel, formatDate, formatMoney, formatPercent } from '../../utils/format';
import { Button, Card, EmptyState, ErrorState, Screen, SkeletonList, StatTile } from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

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

function paymentHistory(emi) {
  const history = emi?.paymentHistory || emi?.payments || emi?.installments || [];
  return Array.isArray(history) ? history : [];
}

function ProgressBar({ value, color, trackColor }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}> 
      <View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

function HistoryRow({ item, colors }) {
  const amount = numberFrom(item?.amount, item?.emiAmount, item?.paidAmount);
  const principal = numberFrom(item?.principal, item?.principalPaid);
  const interest = numberFrom(item?.interest, item?.interestPaid);
  return (
    <View style={[styles.historyRow, { borderColor: colors.border }]}> 
      <View>
        <Text style={[styles.historyTitle, { color: colors.text }]}> 
          {formatDate(item?.paidAt || item?.date || item?.dueDate)}
        </Text>
        <Text style={[styles.historyMeta, { color: colors.textMuted }]}> 
          Principal {formatMoney(principal)} · Interest {formatMoney(interest)}
        </Text>
      </View>
      <Text style={[styles.historyAmount, { color: colors.text }]}>{formatMoney(amount)}</Text>
    </View>
  );
}

export default function EMIDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const id = route?.params?.id;
  const [reminderId, setReminderId] = useState(null);
  const { data: emi, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => emiApi.detail(id),
    [id]
  );
  const markPaid = useMutation((body) => emiApi.markPaid(id, body));
  const remove = useMutation(() => emiApi.remove(id));

  const history = useMemo(() => paymentHistory(emi), [emi]);
  const paid = numberFrom(emi?.paidInstallments, emi?.installmentsPaid, emi?.paidTenure);
  const total = numberFrom(emi?.totalTenure, emi?.tenureMonths, emi?.tenure, 1);
  const remaining = Math.max(total - paid, 0);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;
  const nextDue = getDueDate(emi);
  const due = dueLabel(nextDue);
  const dueColor = due.tone === 'danger'
    ? colors.danger
    : due.tone === 'warning'
      ? colors.warning
      : colors.textMuted;

  async function onMarkPaid() {
    await markPaid.mutate({ paidAt: new Date().toISOString() });
    refetch().catch(() => {});
  }

  function confirmDelete() {
    Alert.alert('Delete EMI?', 'This removes the EMI and its local reminder.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(reminderId);
          await remove.mutate();
          navigation.goBack();
        }
      }
    ]);
  }

  async function toggleReminder(enabled) {
    if (!enabled) {
      await cancelReminder(reminderId);
      setReminderId(null);
      return;
    }

    const target = nextDue ? new Date(nextDue) : null;
    if (!target || Number.isNaN(target.getTime())) return;
    target.setDate(target.getDate() - 1);
    const notificationId = await scheduleReminder({
      id: `emi-${id}`,
      title: 'EMI due tomorrow',
      body: `${emi?.merchant || emi?.lender || 'Your EMI'} is due soon.`,
      date: target
    });
    setReminderId(notificationId);
  }

  if (loading) {
    return <Screen><SkeletonList count={6} /></Screen>;
  }

  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!emi) {
    return (
      <Screen>
        <EmptyState title="EMI not found" description="This EMI may have been deleted." />
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
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>EMI detail</Text>
          <Text style={[styles.title, { color: colors.text }]}> 
            {emi?.merchant || emi?.lender || emi?.name || 'EMI'}
          </Text>
          <Text style={[styles.amount, { color: colors.text }]}> 
            {formatMoney(numberFrom(emi?.monthlyEmi, emi?.emiAmount, emi?.amount))}
          </Text>
          <ProgressBar value={progress} color={colors.primary} trackColor={colors.border} />
          <Text style={[styles.meta, { color: colors.textMuted }]}> 
            {paid} paid · {remaining} remaining · {progress}% complete
          </Text>
        </Card>

        <View style={styles.grid}>
          <StatTile label="Principal" value={formatMoney(numberFrom(emi?.principal))} />
          <StatTile label="Rate" value={formatPercent(numberFrom(emi?.interestRate, emi?.rate))} />
          <StatTile label="Tenure" value={`${total} months`} />
          <StatTile
            label="Interest paid"
            value={formatMoney(numberFrom(emi?.interestPaidToDate, emi?.interestPaid))}
          />
        </View>

        <Card style={styles.cardGap}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Next due</Text>
              <Text style={[styles.meta, { color: dueColor }]}>{due.text}</Text>
            </View>
            <Text style={[styles.sectionValue, { color: colors.text }]}> 
              {formatDate(nextDue)}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Remind me before due date</Text>
            <Switch
              accessibilityLabel="Toggle EMI due reminder"
              accessibilityRole="switch"
              value={Boolean(reminderId)}
              onValueChange={toggleReminder}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={reminderId ? colors.primary : colors.textFaint}
            />
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title={markPaid.loading ? 'Saving…' : 'Mark paid'}
            onPress={onMarkPaid}
            accessibilityLabel="Mark EMI installment paid"
            accessibilityRole="button"
          />
          <TouchableOpacity
            accessibilityLabel="Edit EMI"
            accessibilityRole="button"
            onPress={() => navigation.navigate('EMIForm', { emi })}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Delete EMI"
            accessibilityRole="button"
            onPress={confirmDelete}
            style={[styles.secondaryButton, { borderColor: colors.danger }]}
          >
            <Text style={[styles.secondaryText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.cardGap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment history</Text>
          {history.length ? history.map((item, index) => (
            <HistoryRow key={getId(item) || index} item={item} colors={colors} />
          )) : (
            <EmptyState
              title="No payments yet"
              description="Mark installments paid to build an amortisation history."
            />
          )}
        </Card>
      </ScrollView>
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
  title: {
    ...typography.title
  },
  amount: {
    ...typography.display
  },
  meta: {
    ...typography.caption
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  cardGap: {
    gap: spacing.md
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: HIT_TARGET
  },
  sectionTitle: {
    ...typography.bodyStrong
  },
  sectionValue: {
    ...typography.bodyStrong
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.pill,
    overflow: 'hidden'
  },
  progressFill: {
    height: 10,
    borderRadius: radii.pill
  },
  actions: {
    gap: spacing.sm
  },
  secondaryButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  secondaryText: {
    ...typography.bodyStrong
  },
  historyRow: {
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  historyTitle: {
    ...typography.bodyStrong
  },
  historyMeta: {
    ...typography.caption
  },
  historyAmount: {
    ...typography.bodyStrong
  }
});


