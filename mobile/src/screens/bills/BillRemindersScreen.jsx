import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { billsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { cancelReminder, scheduleReminder } from '../../utils/notifications';
import { daysUntil, dueLabel, formatMoney, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  SkeletonList
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
  return item?.id || item?._id || item?.billId;
}

function getDueDate(item) {
  return item?.dueDate || item?.due_date || item?.nextDueDate;
}

function billAmount(item) {
  return numberFrom(item?.amount, item?.billAmount, item?.expectedAmount);
}

function billStatus(item) {
  return String(item?.status || '').toLowerCase();
}

function groupBills(items) {
  const groups = {
    overdue: [],
    week: [],
    upcoming: [],
    paid: []
  };
  items.forEach((item) => {
    if (billStatus(item) === 'paid' || item?.isPaid) {
      groups.paid.push(item);
      return;
    }
    const days = daysUntil(getDueDate(item));
    if (days !== null && days < 0) groups.overdue.push(item);
    else if (days !== null && days <= 7) groups.week.push(item);
    else groups.upcoming.push(item);
  });
  return groups;
}

function AddBillSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');

  function submit() {
    const parsed = Number(String(amount).replace(/,/g, ''));
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0 || !dueDate.trim()) return;
    onSubmit({
      name: name.trim(),
      amount: Math.round(parsed * 100) / 100,
      dueDate: dueDate.trim(),
      category: category.trim()
    });
    setName('');
    setAmount('');
    setDueDate('');
    setCategory('');
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Add bill">
      <View style={styles.sheetContent}>
        <Input label="Bill name" value={name} onChangeText={setName} accessibilityLabel="Bill name" />
        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Bill amount"
        />
        <Input
          label="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          accessibilityLabel="Bill due date"
        />
        <Input
          label="Category"
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Bill category"
        />
        <Button
          title={loading ? 'Saving…' : 'Save bill'}
          onPress={submit}
          accessibilityLabel="Save bill"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Close bill form"
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

function BillRow({ item, colors, reminderId, onToggleReminder, onMarkPaid }) {
  const due = dueLabel(getDueDate(item));
  const dueColor = due.tone === 'danger'
    ? colors.danger
    : due.tone === 'warning'
      ? colors.warning
      : colors.textMuted;

  return (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={styles.rowTop}>
        <View style={styles.rowMain}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{item?.name || 'Bill'}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}> 
            {titleCase(item?.category || 'Uncategorised')}
          </Text>
        </View>
        <Text style={[styles.rowAmount, { color: colors.text }]}>{formatMoney(billAmount(item))}</Text>
      </View>
      <View style={styles.rowTop}>
        <Text style={[styles.metaStrong, { color: dueColor }]}>{due.text}</Text>
        <Switch
          accessibilityLabel={`Toggle reminder for ${item?.name || 'bill'}`}
          accessibilityRole="switch"
          value={Boolean(reminderId)}
          onValueChange={(enabled) => onToggleReminder(item, enabled)}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={reminderId ? colors.primary : colors.textFaint}
        />
      </View>
      {billStatus(item) === 'paid' || item?.isPaid ? null : (
        <TouchableOpacity
          accessibilityLabel={`Mark ${item?.name || 'bill'} paid`}
          accessibilityRole="button"
          onPress={() => onMarkPaid(item)}
          style={[styles.markButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.markText, { color: colors.text }]}>Mark paid</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BillRemindersScreen() {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reminders, setReminders] = useState({});
  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => billsApi.list(),
    []
  );
  const create = useMutation((body) => billsApi.create(body));
  const markPaid = useMutation((id) => billsApi.markPaid(id, { paidAt: new Date().toISOString() }));

  const items = Array.isArray(data) ? data : data?.items || data?.bills || [];
  const grouped = groupBills(items);

  async function addBill(body) {
    await create.mutate(body);
    setSheetOpen(false);
    refetch().catch(() => {});
  }

  async function onMarkPaid(item) {
    const id = getId(item);
    await cancelReminder(reminders[id]);
    setReminders((current) => ({ ...current, [id]: null }));
    await markPaid.mutate(id);
    refetch().catch(() => {});
  }

  async function toggleReminder(item, enabled) {
    const id = getId(item);
    if (!enabled) {
      await cancelReminder(reminders[id]);
      setReminders((current) => ({ ...current, [id]: null }));
      return;
    }
    const date = getDueDate(item);
    if (!date) return;
    const target = new Date(date);
    target.setDate(target.getDate() - 1);
    const notificationId = await scheduleReminder({
      id: `bill-${id}`,
      title: 'Bill due tomorrow',
      body: `${item?.name || 'A bill'} is due soon.`,
      date: target
    });
    setReminders((current) => ({ ...current, [id]: notificationId }));
  }

  function renderGroup(title, groupItems) {
    if (!groupItems.length) return null;
    return (
      <Card key={title} style={styles.cardGap}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {groupItems.map((item) => (
          <BillRow
            key={getId(item)}
            item={item}
            colors={colors}
            reminderId={reminders[getId(item)]}
            onToggleReminder={toggleReminder}
            onMarkPaid={onMarkPaid}
          />
        ))}
      </Card>
    );
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
          title="No bills tracked"
          description="Add recurring obligations and enable reminders only when you need them."
          actionLabel="Add bill"
          onAction={() => setSheetOpen(true)}
        />
        <AddBillSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSubmit={addBill}
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Bills & reminders</Text>
          <TouchableOpacity
            accessibilityLabel="Add bill"
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addText, { color: colors.onPrimary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        {renderGroup('Overdue', grouped.overdue)}
        {renderGroup('Due this week', grouped.week)}
        {renderGroup('Upcoming', grouped.upcoming)}
        {renderGroup('Paid', grouped.paid)}
      </ScrollView>
      <AddBillSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={addBill}
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
    paddingBottom: spacing.xxxl
  },
  title: {
    ...typography.title
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg
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
  cardGap: {
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.heading
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
    alignItems: 'center',
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
  metaStrong: {
    ...typography.caption,
    fontWeight: '700'
  },
  markButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  markText: {
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

