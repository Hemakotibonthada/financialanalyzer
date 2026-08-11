import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';

import { splitExpensesApi } from '../../api/endpoints';
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
  SectionHeader,
  SkeletonList
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const SECTIONS = ['Balances', 'Expenses', 'Settlements', 'Members'];

function getId(item) {
  return item?.id || item?._id;
}

function BalanceRow({ balance, colors }) {
  const net = Number(balance?.netBalance) || 0;
  const isPositive = net > 0;
  const isNeutral = net === 0;
  const netColor = isNeutral
    ? colors.textMuted
    : isPositive
    ? colors.success
    : colors.danger;
  const netLabel = isNeutral
    ? 'Settled'
    : isPositive
    ? 'Gets back'
    : 'Owes';

  return (
    <View style={[styles.balanceRow, { borderColor: colors.border }]}>
      <View style={styles.balanceLeft}>
        <Text style={[styles.memberName, { color: colors.text }]}>
          {balance?.name || '—'}
        </Text>
        {balance?.email ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>{balance.email}</Text>
        ) : null}
      </View>
      <View style={styles.balanceRight}>
        <Text style={[styles.netLabel, { color: netColor }]}>{netLabel}</Text>
        <Text style={[styles.netAmount, { color: netColor }]}>
          {isNeutral ? '—' : formatMoney(Math.abs(net))}
        </Text>
      </View>
    </View>
  );
}

function SettlementRow({ settlement, colors }) {
  const from = settlement?.from?.name || '—';
  const to = settlement?.to?.name || '—';
  const amount = Number(settlement?.amount) || 0;

  return (
    <View style={[styles.settlementRow, { borderColor: colors.border }]}>
      <View style={styles.settlementMain}>
        <Text style={[styles.body, { color: colors.text }]}>
          <Text style={{ color: colors.danger }}>{from}</Text>
          <Text style={{ color: colors.textMuted }}> pays </Text>
          <Text style={{ color: colors.success }}>{to}</Text>
        </Text>
      </View>
      <Text style={[styles.settlementAmount, { color: colors.text }]}>
        {formatMoney(amount)}
      </Text>
    </View>
  );
}

function ExpenseRow({ expense, colors, onDelete }) {
  const amount = Number(expense?.amount) || 0;
  const payer = expense?.paidBy?.name || '—';
  const desc = expense?.description || 'Expense';
  const date = expense?.date || expense?.createdAt;

  return (
    <View style={[styles.expenseRow, { borderColor: colors.border }]}>
      <View style={styles.expenseMain}>
        <Text style={[styles.subheading, { color: colors.text }]}>{desc}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Paid by {payer} · {formatDate(date)}
          {expense?.category ? ` · ${titleCase(expense.category)}` : ''}
        </Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={[styles.bodyStrong, { color: colors.text }]}>
          {formatMoney(amount)}
        </Text>
        {onDelete ? (
          <TouchableOpacity
            accessibilityLabel={`Delete expense ${desc}`}
            accessibilityRole="button"
            onPress={() => onDelete(expense)}
            style={styles.deleteBtn}
          >
            <Text style={[styles.deleteTxt, { color: colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function MemberRow({ member, colors, onRemove }) {
  return (
    <View style={[styles.memberRow, { borderColor: colors.border }]}>
      <View style={styles.memberMain}>
        <Text style={[styles.subheading, { color: colors.text }]}>
          {member?.name || '—'}
        </Text>
        {member?.email ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>{member.email}</Text>
        ) : null}
      </View>
      {onRemove ? (
        <TouchableOpacity
          accessibilityLabel={`Remove member ${member?.name}`}
          accessibilityRole="button"
          onPress={() => onRemove(member)}
          style={[styles.removeBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.meta, { color: colors.danger }]}>Remove</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AddExpenseSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  function submit() {
    const trimmed = desc.trim();
    const parsed = Number(String(amount).replace(/,/g, ''));
    if (!trimmed || !Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit({ description: trimmed, amount: parsed, splitType: 'equal' });
  }

  function reset() {
    setDesc('');
    setAmount('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="Add expense">
      <View style={styles.sheetContent}>
        <Input
          label="Description"
          value={desc}
          onChangeText={setDesc}
          accessibilityLabel="Expense description"
        />
        <Input
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Expense amount"
        />
        <Button
          title={loading ? 'Adding…' : 'Add expense'}
          onPress={submit}
          accessibilityLabel="Add expense"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={handleClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

function AddMemberSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSubmit({ name: trimmedName, email: email.trim() });
  }

  function reset() {
    setName('');
    setEmail('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="Add member">
      <View style={styles.sheetContent}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Member name"
        />
        <Input
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          accessibilityLabel="Member email"
        />
        <Button
          title={loading ? 'Adding…' : 'Add member'}
          onPress={submit}
          accessibilityLabel="Add member"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={handleClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function SplitGroupDetailScreen({ route, navigation }) {
  const { id, name } = route?.params || {};
  const { colors } = useTheme();
  const [activeSection, setActiveSection] = useState('Balances');
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data: balancesData, loading: bLoading, error: bError, refetch: bRefetch } =
    useApi(() => splitExpensesApi.balances(id), [id]);

  const { data: expensesData, loading: eLoading, error: eError, refetch: eRefetch,
    refreshing, onRefresh } =
    useApi(() => splitExpensesApi.expenses(id), [id]);

  const { data: settlementsData, loading: sLoading, error: sError, refetch: sRefetch } =
    useApi(() => splitExpensesApi.settlements(id), [id]);

  const addExpense = useMutation((body) => splitExpensesApi.addExpense(id, body));
  const removeExpense = useMutation((expId) => splitExpensesApi.removeExpense(id, expId));
  const addMember = useMutation((body) => splitExpensesApi.addMember(id, body));
  const removeMember = useMutation((memberId) => splitExpensesApi.removeMember(id, memberId));

  const balances = balancesData?.balances || balancesData?.items ||
    (Array.isArray(balancesData) ? balancesData : []);
  const expenses = expensesData?.expenses || expensesData?.items ||
    (Array.isArray(expensesData) ? expensesData : []);
  const settlements = settlementsData?.settlements || settlementsData?.items ||
    (Array.isArray(settlementsData) ? settlementsData : []);

  // Derive member list from balances (each balance entry is a member)
  const members = balances.map((b) => ({
    _id: b.userId,
    name: b.name,
    email: b.email
  }));

  async function handleAddExpense(body) {
    try {
      await addExpense.mutate(body);
      setAddExpenseOpen(false);
      eRefetch().catch(() => {});
      bRefetch().catch(() => {});
      sRefetch().catch(() => {});
    } catch {
      // addExpense.error surfaces the message
    }
  }

  function confirmDeleteExpense(expense) {
    Alert.alert(
      'Remove expense',
      `Remove "${expense?.description || 'this expense'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExpense.mutate(getId(expense));
              eRefetch().catch(() => {});
              bRefetch().catch(() => {});
              sRefetch().catch(() => {});
            } catch {
              // removeExpense.error surfaces message
            }
          }
        }
      ]
    );
  }

  async function handleAddMember(body) {
    try {
      await addMember.mutate(body);
      setAddMemberOpen(false);
      bRefetch().catch(() => {});
    } catch {
      // addMember.error surfaces message
    }
  }

  function confirmRemoveMember(member) {
    Alert.alert(
      'Remove member',
      `Remove ${member?.name || 'this member'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember.mutate(member?._id || member?.userId);
              bRefetch().catch(() => {});
            } catch {
              // removeMember.error surfaces message
            }
          }
        }
      ]
    );
  }

  const isLoading = bLoading || eLoading || sLoading;

  if (isLoading) {
    return <Screen><SkeletonList count={6} /></Screen>;
  }

  const activeError = bError || eError || sError;
  if (activeError) {
    const retry = () => {
      bRefetch().catch(() => {});
      eRefetch().catch(() => {});
      sRefetch().catch(() => {});
    };
    return (
      <Screen>
        <ErrorState message={activeError?.message} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>{name || 'Group'}</Text>

        {/* Section tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec}
              accessibilityLabel={`Show ${sec}`}
              accessibilityRole="tab"
              onPress={() => setActiveSection(sec)}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeSection === sec ? colors.primary : colors.surfaceAlt,
                  borderColor: activeSection === sec ? colors.primary : colors.border
                }
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeSection === sec ? colors.onPrimary : colors.text }
                ]}
              >
                {sec}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mutation error banners */}
        {(addExpense.error || removeExpense.error ||
          addMember.error || removeMember.error) ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {(addExpense.error || removeExpense.error ||
              addMember.error || removeMember.error)?.message}
          </Text>
        ) : null}

        {/* ── Balances ── */}
        {activeSection === 'Balances' && (
          <View style={styles.section}>
            <SectionHeader title="Who owes whom" />
            {!balances.length ? (
              <EmptyState
                title="No balances yet"
                message="Add expenses to see who owes whom."
              />
            ) : (
              balances.map((b) => (
                <BalanceRow
                  key={b?.userId || getId(b)}
                  balance={b}
                  colors={colors}
                />
              ))
            )}
            {balancesData?.totalExpenses != null && (
              <Card style={styles.totalCard}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Total group expenses
                </Text>
                <Text style={[styles.bodyStrong, { color: colors.text }]}>
                  {formatMoney(balancesData.totalExpenses)}
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* ── Expenses ── */}
        {activeSection === 'Expenses' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionHeader title="Expenses" />
              <TouchableOpacity
                accessibilityLabel="Add expense"
                accessibilityRole="button"
                onPress={() => setAddExpenseOpen(true)}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.addText, { color: colors.onPrimary }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {!expenses.length ? (
              <EmptyState
                title="No expenses yet"
                message="Record a shared expense to get started."
                actionLabel="Add expense"
                onAction={() => setAddExpenseOpen(true)}
              />
            ) : (
              expenses.map((exp) => (
                <ExpenseRow
                  key={getId(exp)}
                  expense={exp}
                  colors={colors}
                  onDelete={confirmDeleteExpense}
                />
              ))
            )}
          </View>
        )}

        {/* ── Settlements ── */}
        {activeSection === 'Settlements' && (
          <View style={styles.section}>
            <SectionHeader title="Suggested settlements" />
            {!settlements.length ? (
              <EmptyState
                title="All settled"
                message="No pending settlements — everyone is square."
              />
            ) : (
              settlements.map((s, i) => (
                <SettlementRow
                  key={i}
                  settlement={s}
                  colors={colors}
                />
              ))
            )}
          </View>
        )}

        {/* ── Members ── */}
        {activeSection === 'Members' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionHeader title="Members" />
              <TouchableOpacity
                accessibilityLabel="Add member"
                accessibilityRole="button"
                onPress={() => setAddMemberOpen(true)}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.addText, { color: colors.onPrimary }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {!members.length ? (
              <EmptyState
                title="No members"
                message="Add members to split expenses with."
                actionLabel="Add member"
                onAction={() => setAddMemberOpen(true)}
              />
            ) : (
              members.map((m) => (
                <MemberRow
                  key={m?._id || m?.userId}
                  member={m}
                  colors={colors}
                  onRemove={confirmRemoveMember}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      <AddExpenseSheet
        visible={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onSubmit={handleAddExpense}
        loading={addExpense.loading}
        colors={colors}
      />

      <AddMemberSheet
        visible={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onSubmit={handleAddMember}
        loading={addMember.loading}
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
  tabRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  tab: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabText: {
    ...typography.bodyStrong
  },
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  addButton: {
    minHeight: HIT_TARGET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addText: {
    ...typography.bodyStrong
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  balanceLeft: {
    flex: 1,
    gap: spacing.xs
  },
  balanceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  memberName: {
    ...typography.subheading
  },
  netLabel: {
    ...typography.caption
  },
  netAmount: {
    ...typography.bodyStrong
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  settlementMain: {
    flex: 1
  },
  settlementAmount: {
    ...typography.bodyStrong
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  expenseMain: {
    flex: 1,
    gap: spacing.xs
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  deleteBtn: {
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteTxt: {
    ...typography.caption
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  memberMain: {
    flex: 1,
    gap: spacing.xs
  },
  removeBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  totalCard: {
    gap: spacing.xs
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center'
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
  },
  body: {
    ...typography.body
  },
  bodyStrong: {
    ...typography.bodyStrong
  },
  subheading: {
    ...typography.subheading
  },
  meta: {
    ...typography.caption
  }
});
