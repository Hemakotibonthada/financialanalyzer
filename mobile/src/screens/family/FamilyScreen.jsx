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

import { familyApi } from '../../api/endpoints';
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
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id;
}

function MemberCard({ member, colors, onEdit, onRemove, onAllowance }) {
  const allowance = Number(member?.allowance?.amount) || 0;
  const frequency = member?.allowance?.frequency || 'monthly';
  const lastPaid = member?.allowance?.lastPaidAt;

  return (
    <View style={[styles.memberCard, { borderColor: colors.border }]}>
      <View style={styles.memberTop}>
        <View style={styles.memberMain}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {member?.name || '—'}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {titleCase(member?.relationship || 'Member')}
            {member?.role ? ` · ${titleCase(member.role)}` : ''}
          </Text>
        </View>
        <View style={styles.memberActions}>
          <TouchableOpacity
            accessibilityLabel={`Edit ${member?.name}`}
            accessibilityRole="button"
            onPress={() => onEdit(member)}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.iconBtnText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Remove ${member?.name}`}
            accessibilityRole="button"
            onPress={() => onRemove(member)}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.iconBtnText, { color: colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      {allowance > 0 && (
        <View style={styles.allowanceRow}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Allowance: {formatMoney(allowance)} / {frequency}
          </Text>
          {lastPaid ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Last paid {formatDate(lastPaid)}
            </Text>
          ) : null}
        </View>
      )}

      <TouchableOpacity
        accessibilityLabel={`Give allowance to ${member?.name}`}
        accessibilityRole="button"
        onPress={() => onAllowance(member)}
        style={[styles.allowanceBtn, { borderColor: colors.primary }]}
      >
        <Text style={[styles.allowanceBtnText, { color: colors.primary }]}>
          Give allowance
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberSheet({ visible, title, initial, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState(initial?.name || '');
  const [relationship, setRelationship] = useState(initial?.relationship || '');
  const [role, setRole] = useState(initial?.role || '');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setRelationship(initial?.relationship || '');
      setRole(initial?.role || '');
    }
  }, [visible]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, relationship: relationship.trim(), role: role.trim() });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.sheetContent}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Member name"
        />
        <Input
          label="Relationship"
          value={relationship}
          onChangeText={setRelationship}
          accessibilityLabel="Relationship"
        />
        <Input
          label="Role (optional)"
          value={role}
          onChangeText={setRole}
          accessibilityLabel="Role"
        />
        <Button
          title={loading ? 'Saving…' : 'Save'}
          onPress={submit}
          accessibilityLabel="Save member"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
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

function AllowanceSheet({ visible, member, onClose, onSubmit, loading, colors }) {
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  function submit() {
    const parsed = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit(getId(member), { amount: parsed, frequency });
  }

  function handleClose() {
    setAmount('');
    setFrequency('monthly');
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={`Allowance for ${member?.name || 'member'}`}
    >
      <View style={styles.sheetContent}>
        <Input
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Allowance amount"
        />
        <Input
          label="Frequency (monthly / weekly / daily)"
          value={frequency}
          onChangeText={setFrequency}
          accessibilityLabel="Allowance frequency"
        />
        <Button
          title={loading ? 'Saving…' : 'Give allowance'}
          onPress={submit}
          accessibilityLabel="Give allowance"
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

export default function FamilyScreen() {
  const { colors } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [allowanceMember, setAllowanceMember] = useState(null);

  const { data: membersData, loading: mLoading, error: mError,
    refetch: mRefetch, refreshing, onRefresh } =
    useApi(() => familyApi.members(), []);

  const { data: budgetData, loading: bLoading, error: bError, refetch: bRefetch } =
    useApi(() => familyApi.budget(), []);

  const { data: spendingData, loading: sLoading, refetch: sRefetch } =
    useApi(() => familyApi.spending(), []);

  const addMut = useMutation((body) => familyApi.addMember(body));
  const updateMut = useMutation((id, body) => familyApi.updateMember(id, body));
  const removeMut = useMutation((id) => familyApi.removeMember(id));
  const allowanceMut = useMutation((id, body) => familyApi.giveAllowance(id, body));

  const members = membersData?.data || (Array.isArray(membersData) ? membersData : []);
  const budget = budgetData?.data || budgetData || {};
  const spending = spendingData?.data || spendingData || {};

  async function handleAdd(body) {
    try {
      await addMut.mutate(body);
      setAddOpen(false);
      mRefetch().catch(() => {});
      bRefetch().catch(() => {});
    } catch {
      // addMut.error surfaces
    }
  }

  async function handleEdit(body) {
    try {
      await updateMut.mutate(getId(editMember), body);
      setEditMember(null);
      mRefetch().catch(() => {});
    } catch {
      // updateMut.error surfaces
    }
  }

  function confirmRemove(member) {
    Alert.alert(
      'Remove member',
      `Remove ${member?.name || 'this member'} from your family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMut.mutate(getId(member));
              mRefetch().catch(() => {});
              bRefetch().catch(() => {});
            } catch {
              // removeMut.error surfaces
            }
          }
        }
      ]
    );
  }

  async function handleAllowance(id, body) {
    try {
      await allowanceMut.mutate(id, body);
      setAllowanceMember(null);
      mRefetch().catch(() => {});
      bRefetch().catch(() => {});
      sRefetch().catch(() => {});
    } catch {
      // allowanceMut.error surfaces
    }
  }

  const isLoading = mLoading || bLoading;

  if (isLoading) {
    return <Screen><SkeletonList count={5} /></Screen>;
  }

  if (mError || bError) {
    const retry = () => {
      mRefetch().catch(() => {});
      bRefetch().catch(() => {});
    };
    return (
      <Screen>
        <ErrorState message={(mError || bError)?.message} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Family</Text>

        {/* Budget summary */}
        <Card style={styles.cardGap}>
          <SectionHeader title="Budget overview" />
          <View style={styles.statsRow}>
            <StatTile
              label="Total allowance"
              value={formatMoney(Number(budget?.totalAllowance) || 0)}
            />
            <StatTile
              label="Members"
              value={String(Number(budget?.memberCount) || members.length)}
            />
            {spending?.totalMonthly != null && (
              <StatTile
                label="Monthly spend"
                value={formatMoney(Number(spending.totalMonthly) || 0)}
              />
            )}
          </View>
        </Card>

        {/* Mutation error banners */}
        {(addMut.error || updateMut.error || removeMut.error || allowanceMut.error) ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {(addMut.error || updateMut.error ||
              removeMut.error || allowanceMut.error)?.message}
          </Text>
        ) : null}

        {/* Members list */}
        <View style={styles.sectionHeader}>
          <SectionHeader title="Members" />
          <TouchableOpacity
            accessibilityLabel="Add family member"
            accessibilityRole="button"
            onPress={() => setAddOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addText, { color: colors.onPrimary }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {!members.length ? (
          <EmptyState
            title="No family members"
            message="Add family members to track budgets and allowances together."
            actionLabel="Add member"
            onAction={() => setAddOpen(true)}
          />
        ) : (
          members.map((m) => (
            <MemberCard
              key={getId(m)}
              member={m}
              colors={colors}
              onEdit={setEditMember}
              onRemove={confirmRemove}
              onAllowance={setAllowanceMember}
            />
          ))
        )}
      </ScrollView>

      {/* Add member sheet */}
      <MemberSheet
        visible={addOpen}
        title="Add family member"
        initial={{}}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        loading={addMut.loading}
        colors={colors}
      />

      {/* Edit member sheet */}
      <MemberSheet
        visible={Boolean(editMember)}
        title={`Edit ${editMember?.name || 'member'}`}
        initial={editMember || {}}
        onClose={() => setEditMember(null)}
        onSubmit={handleEdit}
        loading={updateMut.loading}
        colors={colors}
      />

      {/* Allowance sheet */}
      <AllowanceSheet
        visible={Boolean(allowanceMember)}
        member={allowanceMember}
        onClose={() => setAllowanceMember(null)}
        onSubmit={handleAllowance}
        loading={allowanceMut.loading}
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
  cardGap: {
    gap: spacing.md
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
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
  memberCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  memberMain: {
    flex: 1,
    gap: spacing.xs
  },
  memberName: {
    ...typography.subheading
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  iconBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBtnText: {
    ...typography.caption
  },
  allowanceRow: {
    gap: spacing.xs
  },
  allowanceBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  allowanceBtnText: {
    ...typography.bodyStrong
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
  meta: {
    ...typography.caption
  }
});
