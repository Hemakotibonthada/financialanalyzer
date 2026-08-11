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

import { bankAccountsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, titleCase } from '../../utils/format';
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

function accountLabel(item) {
  const bank = item?.bankName || item?.bank || 'Account';
  const last4 = String(item?.accountNumber || item?.accountNo || '').slice(-4);
  return last4 ? `${bank} ****${last4}` : bank;
}

function AccountRow({ item, colors, onPress, onLongPress }) {
  const balance = Number(item?.currentBalance ?? item?.balance ?? 0);
  return (
    <TouchableOpacity
      accessibilityLabel={`Open ${accountLabel(item)}`}
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Text
            style={[styles.rowTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {accountLabel(item)}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            {titleCase(item?.accountType || 'Account')}
          </Text>
        </View>
        <Text style={[styles.rowAmount, { color: colors.text }]}>
          {formatMoney(balance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddAccountSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [balance, setBalance] = useState('');

  function submit() {
    const amt = Number(String(balance).replace(/,/g, ''));
    if (!bankName.trim() || !accountNumber.trim()) return;
    onSubmit({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountType: accountType.trim() || 'savings',
      currentBalance: Number.isFinite(amt) ? amt : 0
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Add account">
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <Input
          label="Bank name"
          value={bankName}
          onChangeText={setBankName}
          accessibilityLabel="Bank name"
        />
        <Input
          label="Account number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
          accessibilityLabel="Account number"
        />
        <Input
          label="Account type"
          value={accountType}
          onChangeText={setAccountType}
          accessibilityLabel="Account type"
        />
        <Input
          label="Current balance"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          accessibilityLabel="Current balance"
        />
        <Button
          title={loading ? 'Saving…' : 'Add account'}
          loading={loading}
          onPress={submit}
          accessibilityLabel="Save new account"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel add account"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Sheet>
  );
}

function TransferSheet({ visible, onClose, accounts, onSubmit, loading, colors }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  function submit() {
    const amt = Number(String(amount).replace(/,/g, ''));
    if (!fromId || !toId) {
      setErr('Select both a source and destination account.');
      return;
    }
    if (fromId === toId) {
      setErr('Source and destination must be different accounts.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Enter a valid amount greater than zero.');
      return;
    }
    setErr('');
    onSubmit({ fromAccountId: fromId, toAccountId: toId, amount: amt });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Transfer funds">
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
          From account
        </Text>
        {accounts.map((acc) => {
          const id = getId(acc);
          const selected = fromId === id;
          return (
            <TouchableOpacity
              key={id}
              accessibilityLabel={`Select ${accountLabel(acc)} as source`}
              accessibilityRole="radio"
              onPress={() => setFromId(id)}
              style={[
                styles.pickerRow,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface
                }
              ]}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {accountLabel(acc)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <Text
          style={[styles.pickerLabel, { color: colors.textMuted, marginTop: spacing.md }]}
        >
          To account
        </Text>
        {accounts.map((acc) => {
          const id = getId(acc);
          const selected = toId === id;
          return (
            <TouchableOpacity
              key={id}
              accessibilityLabel={`Select ${accountLabel(acc)} as destination`}
              accessibilityRole="radio"
              onPress={() => setToId(id)}
              style={[
                styles.pickerRow,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface
                }
              ]}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {accountLabel(acc)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Transfer amount"
        />
        {err ? (
          <Text style={[styles.errText, { color: colors.danger }]}>{err}</Text>
        ) : null}
        <Button
          title={loading ? 'Transferring…' : 'Transfer'}
          loading={loading}
          onPress={submit}
          accessibilityLabel="Confirm transfer"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel transfer"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Sheet>
  );
}

export default function BankAccountsScreen({ navigation }) {
  const { colors } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () =>
      Promise.all([bankAccountsApi.totalBalance(), bankAccountsApi.list()])
        .then(([balW, listD]) => ({
          balance: balW?.data ?? balW,
          balanceFromCache: balW?.fromCache ?? false,
          accounts: Array.isArray(listD)
            ? listD
            : listD?.accounts || listD?.items || []
        })),
    []
  );

  const createAcc = useMutation((body) => bankAccountsApi.create(body));
  const removeAcc = useMutation((id) => bankAccountsApi.remove(id));
  const doTransfer = useMutation((body) => bankAccountsApi.transfer(body));

  const accounts = data?.accounts || [];
  const balPayload = data?.balance;
  const totalBalance = Number(
    balPayload?.totalBalance ?? balPayload?.total ?? balPayload?.balance ?? 0
  );
  const isStale = Boolean(data?.balanceFromCache);

  function onLongPress(item) {
    Alert.alert(
      'Remove account',
      `Remove ${accountLabel(item)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAcc.mutate(getId(item));
              refetch().catch(() => {});
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not remove account.');
            }
          }
        }
      ]
    );
  }

  async function submitAdd(body) {
    try {
      await createAcc.mutate(body);
      setAddOpen(false);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not add account.');
    }
  }

  async function submitTransfer(body) {
    try {
      await doTransfer.mutate(body);
      setTransferOpen(false);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Transfer failed', e?.message || 'Transfer could not be completed.');
    }
  }

  if (loading) return <Screen><SkeletonList count={5} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!accounts.length) {
    return (
      <Screen>
        <EmptyState
          title="No bank accounts"
          description="Add your accounts to track balances and transfers in one place."
          actionLabel="Add account"
          onAction={() => setAddOpen(true)}
        />
        <AddAccountSheet
          key="add-empty"
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={submitAdd}
          loading={createAcc.loading}
          colors={colors}
        />
      </Screen>
    );
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
              Balance shown from cached data
            </Text>
          </View>
        )}

        <Card style={styles.heroCard}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Total balance</Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>
            {formatMoney(totalBalance)}
          </Text>
          <View style={styles.statRow}>
            <StatTile label="Accounts" value={String(accounts.length)} />
          </View>
        </Card>

        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityLabel="Transfer between accounts"
            accessibilityRole="button"
            onPress={() => setTransferOpen(true)}
            style={[
              styles.actionBtn,
              { borderColor: colors.border, backgroundColor: colors.surfaceAlt }
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              ⇌  Transfer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Add bank account"
            accessibilityRole="button"
            onPress={() => setAddOpen(true)}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
              + Add account
            </Text>
          </TouchableOpacity>
        </View>

        {accounts.map((item) => (
          <AccountRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() =>
              navigation.navigate('BankAccountDetail', { id: getId(item) })
            }
            onLongPress={() => onLongPress(item)}
          />
        ))}

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Long-press an account to remove it
        </Text>
      </ScrollView>

      <AddAccountSheet
        key={addOpen ? 'add-open' : 'add-closed'}
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={submitAdd}
        loading={createAcc.loading}
        colors={colors}
      />
      <TransferSheet
        visible={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        onSubmit={submitTransfer}
        loading={doTransfer.loading}
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
  eyebrow: {
    ...typography.caption
  },
  heroAmount: {
    ...typography.display
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  actionBtn: {
    flex: 1,
    minHeight: HIT_TARGET,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  actionBtnText: {
    ...typography.bodyStrong
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: HIT_TARGET
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rowLeft: {
    flex: 1
  },
  rowTitle: {
    ...typography.subheading
  },
  rowMeta: {
    ...typography.caption,
    marginTop: spacing.xs
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  hint: {
    ...typography.caption,
    textAlign: 'center'
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.md
  },
  pickerLabel: {
    ...typography.caption,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  pickerRow: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    minHeight: HIT_TARGET,
    justifyContent: 'center'
  },
  pickerText: {
    ...typography.body
  },
  errText: {
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
