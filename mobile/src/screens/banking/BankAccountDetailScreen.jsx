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
import { formatMoney, formatDate, titleCase } from '../../utils/format';
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
import { LineChartCard } from '../../components/charts';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function EditSheet({ visible, onClose, account, onSubmit, loading, colors }) {
  const [bankName, setBankName] = useState(account?.bankName || account?.bank || '');
  const [accountType, setAccountType] = useState(account?.accountType || '');
  const [balance, setBalance] = useState(
    String(account?.currentBalance ?? account?.balance ?? '')
  );

  function submit() {
    const amt = Number(String(balance).replace(/,/g, ''));
    if (!bankName.trim()) return;
    onSubmit({
      bankName: bankName.trim(),
      accountType: accountType.trim() || undefined,
      currentBalance: Number.isFinite(amt) ? amt : undefined
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit account">
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <Input
          label="Bank name"
          value={bankName}
          onChangeText={setBankName}
          accessibilityLabel="Bank name"
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
          title={loading ? 'Saving…' : 'Save changes'}
          loading={loading}
          onPress={submit}
          accessibilityLabel="Save account changes"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel edit"
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

export default function BankAccountDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [editOpen, setEditOpen] = useState(false);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () =>
      Promise.all([bankAccountsApi.detail(id), bankAccountsApi.analytics()])
        .then(([detail, analytics]) => ({ detail, analytics })),
    [id]
  );

  const updateAcc = useMutation((body) => bankAccountsApi.update(id, body));
  const removeAcc = useMutation(() => bankAccountsApi.remove(id));

  const account =
    data?.detail?.account || data?.detail?.data || data?.detail;
  const analyticsPayload =
    data?.analytics?.data || data?.analytics;

  const rawSeries =
    analyticsPayload?.trends ||
    analyticsPayload?.series ||
    analyticsPayload?.monthly ||
    [];
  const chartPoints = Array.isArray(rawSeries)
    ? rawSeries
        .filter(
          (p) => p?.value != null || p?.balance != null || p?.amount != null
        )
        .map((p) => ({
          value: Number(p.value ?? p.balance ?? p.amount ?? 0),
          ...p
        }))
    : [];

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'Delete this account permanently? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAcc.mutate();
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not delete account.');
            }
          }
        }
      ]
    );
  }

  async function submitEdit(body) {
    try {
      await updateAcc.mutate(body);
      setEditOpen(false);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update account.');
    }
  }

  if (loading) return <Screen><SkeletonList count={6} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  const balance = Number(
    account?.currentBalance ?? account?.balance ?? account?.availableBalance ?? 0
  );
  const bankName = account?.bankName || account?.bank || 'Account';
  const accountNo = String(account?.accountNumber || account?.accountNo || '');
  const accType = titleCase(account?.accountType || '');
  const ifsc = account?.ifscCode || account?.ifsc || '';

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        <Card style={styles.heroCard}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
            {bankName}
          </Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>
            {formatMoney(balance)}
          </Text>
          <View style={styles.statGrid}>
            {accountNo ? (
              <StatTile
                label="Account no."
                value={accountNo.length > 4 ? `****${accountNo.slice(-4)}` : accountNo}
              />
            ) : null}
            {accType ? <StatTile label="Type" value={accType} /> : null}
          </View>
          {ifsc ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              IFSC: {ifsc}
            </Text>
          ) : null}
          {account?.isActive === false && (
            <Text style={[styles.inactiveTag, { color: colors.warning }]}>
              Inactive account
            </Text>
          )}
        </Card>

        {chartPoints.length > 0 && (
          <LineChartCard title="Balance trend" data={chartPoints} />
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityLabel="Edit account"
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
            accessibilityLabel="Delete account"
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

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
          {[
            ['Added', formatDate(account?.createdAt)],
            ['Last updated', formatDate(account?.updatedAt)]
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
        </Card>
      </ScrollView>

      <EditSheet
        key={editOpen ? 'edit-open' : 'edit-closed'}
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        account={account}
        onSubmit={submitEdit}
        loading={updateAcc.loading}
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
  eyebrow: {
    ...typography.caption
  },
  heroAmount: {
    ...typography.display
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  meta: {
    ...typography.caption
  },
  inactiveTag: {
    ...typography.caption,
    fontWeight: '600'
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
