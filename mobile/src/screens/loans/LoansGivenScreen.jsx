import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { loansGivenApi } from '../../api/endpoints';
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
  return item?.id || item?._id || item?.loanId;
}

function amountOf(item) {
  return numberFrom(item?.amount, item?.principal, item?.loanAmount);
}

function outstandingOf(item) {
  return numberFrom(item?.outstanding, item?.remainingAmount, item?.balance);
}

function loanStart(item) {
  return item?.lentAt || item?.loanDate || item?.createdAt || item?.date;
}

function daysOutstanding(item) {
  const start = loanStart(item);
  if (!start) return '—';
  const parsed = new Date(start);
  if (Number.isNaN(parsed.getTime())) return '—';
  const ms = Date.now() - parsed.getTime();
  return `${Math.max(0, Math.floor(ms / 86400000))} days`;
}

function LoanRow({ item, colors, onRepay }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={styles.rowTop}>
        <View style={styles.rowMain}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{item?.borrower || 'Borrower'}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}> 
            {titleCase(item?.relationship || 'Personal')} · {daysOutstanding(item)} outstanding
          </Text>
        </View>
        <Text style={[styles.rowAmount, { color: colors.text }]}>{formatMoney(amountOf(item))}</Text>
      </View>
      <View style={styles.rowTop}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>Outstanding</Text>
        <Text style={[styles.rowAmount, { color: colors.warning }]}> 
          {formatMoney(outstandingOf(item))}
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Lent {formatDate(loanStart(item))}</Text>
      <TouchableOpacity
        accessibilityLabel={`Record repayment from ${item?.borrower || 'borrower'}`}
        accessibilityRole="button"
        onPress={() => onRepay(item)}
        style={[styles.actionButton, { borderColor: colors.border }]}
      >
        <Text style={[styles.actionText, { color: colors.text }]}>Record repayment</Text>
      </TouchableOpacity>
    </View>
  );
}

function MoneySheet({ visible, title, labels, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');

  function submit() {
    const parsed = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit({
      borrower: name.trim(),
      amount: Math.round(parsed * 100) / 100,
      relationship: relationship.trim(),
      notes: notes.trim(),
      paidAt: new Date().toISOString()
    });
    setName('');
    setAmount('');
    setRelationship('');
    setNotes('');
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.sheetContent}>
        {labels.name ? (
          <Input label={labels.name} value={name} onChangeText={setName} accessibilityLabel={labels.name} />
        ) : null}
        <Input
          label={labels.amount}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel={labels.amount}
        />
        {labels.relationship ? (
          <Input
            label={labels.relationship}
            value={relationship}
            onChangeText={setRelationship}
            accessibilityLabel={labels.relationship}
          />
        ) : null}
        <Input label="Notes" value={notes} onChangeText={setNotes} accessibilityLabel="Notes" />
        <Button
          title={loading ? 'Saving…' : labels.submit}
          onPress={submit}
          accessibilityLabel={labels.submit}
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Close form"
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

export default function LoansGivenScreen() {
  const { colors } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState(null);
  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => Promise.all([loansGivenApi.list(), loansGivenApi.summary()]).then(([list, summary]) => ({
      items: Array.isArray(list) ? list : list?.items || list?.loans || [],
      summary: summary || {}
    })),
    []
  );
  const create = useMutation((body) => loansGivenApi.create(body));
  const repay = useMutation((id, body) => loansGivenApi.addRepayment(id, body));

  const items = data?.items || [];
  const summary = data?.summary || {};
  const totalLent = numberFrom(summary.totalLent, items.reduce((sum, item) => sum + amountOf(item), 0));
  const outstanding = numberFrom(
    summary.outstanding,
    items.reduce((sum, item) => sum + outstandingOf(item), 0)
  );
  const recovered = numberFrom(summary.recovered, Math.max(totalLent - outstanding, 0));

  async function addLoan(body) {
    if (!body.borrower) return;
    await create.mutate({
      borrower: body.borrower,
      amount: body.amount,
      relationship: body.relationship,
      notes: body.notes
    });
    setAddOpen(false);
    refetch().catch(() => {});
  }

  async function recordRepayment(body) {
    await repay.mutate(getId(repayLoan), { amount: body.amount, notes: body.notes, paidAt: body.paidAt });
    setRepayLoan(null);
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
          title="No informal loans recorded"
          description="Informal loans are hard to recover. Record terms, dates and repayments clearly."
          actionLabel="Add loan"
          onAction={() => setAddOpen(true)}
        />
        <MoneySheet
          visible={addOpen}
          title="Add money lent"
          labels={{
            name: 'Borrower',
            amount: 'Amount lent',
            relationship: 'Relationship',
            submit: 'Save loan'
          }}
          onClose={() => setAddOpen(false)}
          onSubmit={addLoan}
          loading={create.loading}
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
          <Text style={[styles.title, { color: colors.text }]}>Money lent</Text>
          <View style={styles.summaryGrid}>
            <StatTile label="Total lent" value={formatMoney(totalLent)} />
            <StatTile label="Outstanding" value={formatMoney(outstanding)} />
            <StatTile label="Recovered" value={formatMoney(recovered)} />
          </View>
        </Card>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Borrowers</Text>
          <TouchableOpacity
            accessibilityLabel="Add money lent"
            accessibilityRole="button"
            onPress={() => setAddOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addText, { color: colors.onPrimary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        {items.map((item) => (
          <LoanRow key={getId(item)} item={item} colors={colors} onRepay={setRepayLoan} />
        ))}
      </ScrollView>
      <MoneySheet
        visible={addOpen}
        title="Add money lent"
        labels={{
          name: 'Borrower',
          amount: 'Amount lent',
          relationship: 'Relationship',
          submit: 'Save loan'
        }}
        onClose={() => setAddOpen(false)}
        onSubmit={addLoan}
        loading={create.loading}
        colors={colors}
      />
      <MoneySheet
        visible={Boolean(repayLoan)}
        title={`Repayment from ${repayLoan?.borrower || 'borrower'}`}
        labels={{ amount: 'Repayment amount', submit: 'Record repayment' }}
        onClose={() => setRepayLoan(null)}
        onSubmit={recordRepayment}
        loading={repay.loading}
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
  rowMain: {
    flex: 1
  },
  rowTitle: {
    ...typography.subheading
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  meta: {
    ...typography.caption
  },
  actionButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionText: {
    ...typography.bodyStrong
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

