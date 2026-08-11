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

import { subscriptionsApi } from '../../api/endpoints';
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
  SectionHeader,
  Sheet,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id;
}

function subLabel(item) {
  return item?.name || item?.serviceName || item?.provider || '—';
}

function subCost(item) {
  return Number(
    item?.cost ?? item?.amount ?? item?.billingAmount ?? item?.price ?? 0
  );
}

function SubscriptionSheet({ visible, onClose, initial, onSubmit, loading, colors }) {
  const [name, setName] = useState(
    initial?.name || initial?.serviceName || ''
  );
  const [category, setCategory] = useState(initial?.category || '');
  const [cost, setCost] = useState(String(subCost(initial) || ''));
  const [billingCycle, setBillingCycle] = useState(
    initial?.billingCycle || initial?.billingFrequency || ''
  );

  function submit() {
    const amt = Number(String(cost).replace(/,/g, ''));
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category: category.trim() || undefined,
      cost: Number.isFinite(amt) && amt > 0 ? amt : undefined,
      billingCycle: billingCycle.trim() || undefined
    });
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit subscription' : 'Add subscription'}
    >
      <View style={styles.sheetBody}>
        <Input
          label="Service name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Service name"
        />
        <Input
          label="Category"
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Subscription category"
        />
        <Input
          label="Cost"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          accessibilityLabel="Subscription cost"
        />
        <Input
          label="Billing cycle"
          value={billingCycle}
          onChangeText={setBillingCycle}
          accessibilityLabel="Billing cycle"
        />
        <Button
          title={
            loading
              ? 'Saving…'
              : initial
                ? 'Save changes'
                : 'Add subscription'
          }
          loading={loading}
          onPress={submit}
          accessibilityLabel={initial ? 'Save subscription changes' : 'Add subscription'}
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
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

function ProjectedCostSheet({ visible, onClose, costs, subName, colors }) {
  const payload = costs?.data || costs || {};
  return (
    <Sheet visible={visible} onClose={onClose} title={`Cost forecast: ${subName}`}>
      <View style={styles.sheetBody}>
        <View style={styles.costGrid}>
          {payload.monthly != null && (
            <StatTile label="Monthly" value={formatMoney(payload.monthly)} />
          )}
          {payload.quarterly != null && (
            <StatTile label="Quarterly" value={formatMoney(payload.quarterly)} />
          )}
          {payload.annual != null && (
            <StatTile label="Annual" value={formatMoney(payload.annual)} />
          )}
          {payload.yearly != null && (
            <StatTile label="Yearly" value={formatMoney(payload.yearly)} />
          )}
        </View>
        {!Object.keys(payload).length && (
          <Text style={[styles.emptyNote, { color: colors.textMuted }]}>
            No projected cost data available.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

function AlertSection({ title, items, colors, variant }) {
  if (!items.length) return null;
  const bgColor =
    variant === 'renewal' ? colors.warningSoft : colors.dangerSoft;
  const fgColor = variant === 'renewal' ? colors.warning : colors.danger;

  return (
    <Card style={[styles.alertCard, { backgroundColor: bgColor, borderColor: fgColor }]}>
      <Text style={[styles.alertTitle, { color: fgColor }]}>{title}</Text>
      {items.map((item) => {
        const cost = subCost(item);
        const renewDate =
          item?.dates?.renewalDate ||
          item?.renewalDate ||
          item?.nextRenewal;
        return (
          <View key={getId(item)} style={styles.alertRow}>
            <View style={styles.alertLeft}>
              <Text
                style={[styles.alertName, { color: colors.text }]}
                numberOfLines={1}
              >
                {subLabel(item)}
              </Text>
              <Text style={[styles.alertMeta, { color: colors.textMuted }]}>
                {renewDate
                  ? `Renews ${formatDate(renewDate)}`
                  : titleCase(item?.category || '')}
              </Text>
            </View>
            <Text style={[styles.alertAmount, { color: fgColor }]}>
              {formatMoney(cost)}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function SubscriptionRow({ item, colors, onPress, onEdit, onDelete }) {
  const cost = subCost(item);
  const utilScore = Number(
    item?.utilization?.score ?? item?.utilizationScore ?? 100
  );

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <TouchableOpacity
        accessibilityLabel={`Open projected cost for ${subLabel(item)}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.rowPressable}
      >
        <View style={styles.rowTop}>
          <View style={styles.rowLeft}>
            <Text
              style={[styles.rowTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {subLabel(item)}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
              {[
                titleCase(item?.billingCycle || item?.billingFrequency || ''),
                titleCase(item?.category || '')
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Text style={[styles.rowAmount, { color: colors.text }]}>
            {formatMoney(cost)}
          </Text>
        </View>
        {utilScore < 30 && (
          <Text style={[styles.unusedLabel, { color: colors.danger }]}>
            Low usage — consider cancelling
          </Text>
        )}
        <Text style={[styles.rowHint, { color: colors.textMuted }]}>
          Tap for cost forecast
        </Text>
      </TouchableOpacity>
      <View style={[styles.rowActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          accessibilityLabel={`Edit ${subLabel(item)}`}
          accessibilityRole="button"
          onPress={onEdit}
          style={styles.rowActionBtn}
        >
          <Text style={[styles.rowActionText, { color: colors.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`Delete ${subLabel(item)}`}
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.rowActionBtn}
        >
          <Text style={[styles.rowActionText, { color: colors.danger }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [projSheet, setProjSheet] = useState({
    open: false,
    costs: null,
    name: '—'
  });

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () =>
      Promise.all([
        subscriptionsApi.summary(),
        subscriptionsApi.list(),
        subscriptionsApi.renewalAlerts(),
        subscriptionsApi.unusedAlerts()
      ]).then(([sumW, listData, renewals, unused]) => ({
        summary: sumW?.data ?? sumW,
        summaryFromCache: sumW?.fromCache ?? false,
        subscriptions: Array.isArray(listData)
          ? listData
          : listData?.subscriptions || [],
        renewalAlerts: Array.isArray(renewals)
          ? renewals
          : renewals?.subscriptions || [],
        unusedAlerts: Array.isArray(unused)
          ? unused
          : unused?.subscriptions || []
      })),
    []
  );

  const createSub = useMutation((body) => subscriptionsApi.create(body));
  const updateSub = useMutation(({ id, body }) =>
    subscriptionsApi.update(id, body)
  );
  const removeSub = useMutation((id) => subscriptionsApi.remove(id));
  const loadProjected = useMutation((id) => subscriptionsApi.projectedCost(id));

  const subscriptions = data?.subscriptions || [];
  const summary = data?.summary || {};
  const renewalAlerts = data?.renewalAlerts || [];
  const unusedAlerts = data?.unusedAlerts || [];
  const isStale = Boolean(data?.summaryFromCache);

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setSheetOpen(true);
  }

  async function submitSave(body) {
    try {
      if (editing) {
        await updateSub.mutate({ id: getId(editing), body });
      } else {
        await createSub.mutate(body);
      }
      setSheetOpen(false);
      setEditing(null);
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save subscription.');
    }
  }

  function confirmDelete(item) {
    Alert.alert(
      'Delete subscription',
      `Delete ${subLabel(item)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSub.mutate(getId(item));
              refetch().catch(() => {});
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not delete subscription.');
            }
          }
        }
      ]
    );
  }

  async function openProjectedCost(item) {
    try {
      const costs = await loadProjected.mutate(getId(item));
      setProjSheet({ open: true, costs, name: subLabel(item) });
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load projected cost.');
    }
  }

  if (loading) return <Screen><SkeletonList count={6} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  const monthlyCost = Number(
    summary?.totalMonthlyCost ?? summary?.monthly ?? 0
  );
  const annualCost = Number(
    summary?.totalAnnualCost ?? summary?.annual ?? 0
  );
  const activeCount = Number(
    summary?.activeCount ?? summary?.active ?? subscriptions.length
  );

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
            Subscriptions
          </Text>
          <View style={styles.statGrid}>
            <StatTile label="Monthly" value={formatMoney(monthlyCost)} />
            <StatTile label="Annual" value={formatMoney(annualCost)} />
            <StatTile label="Active" value={String(activeCount)} />
          </View>
        </Card>

        <AlertSection
          title={`⚠  ${renewalAlerts.length} renewing soon`}
          items={renewalAlerts}
          colors={colors}
          variant="renewal"
        />

        <AlertSection
          title={`⚡  ${unusedAlerts.length} unused — you're paying for these`}
          items={unusedAlerts}
          colors={colors}
          variant="unused"
        />

        <SectionHeader
          title="All subscriptions"
          actionLabel="+ Add"
          onAction={openAdd}
        />

        {!subscriptions.length ? (
          <EmptyState
            title="No subscriptions tracked"
            description="Add your recurring subscriptions to spot wasteful spending."
            actionLabel="Add subscription"
            onAction={openAdd}
          />
        ) : (
          subscriptions.map((item) => (
            <SubscriptionRow
              key={getId(item)}
              item={item}
              colors={colors}
              onPress={() => openProjectedCost(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
            />
          ))
        )}
      </ScrollView>

      <SubscriptionSheet
        key={editing ? getId(editing) : 'new-sub'}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editing}
        onSubmit={submitSave}
        loading={createSub.loading || updateSub.loading}
        colors={colors}
      />

      <ProjectedCostSheet
        visible={projSheet.open}
        onClose={() => setProjSheet({ open: false, costs: null, name: '—' })}
        costs={projSheet.costs}
        subName={projSheet.name}
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
  heroTitle: {
    ...typography.title
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  alertCard: {
    gap: spacing.sm,
    borderWidth: 1
  },
  alertTitle: {
    ...typography.bodyStrong
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  alertLeft: {
    flex: 1
  },
  alertName: {
    ...typography.body
  },
  alertMeta: {
    ...typography.caption
  },
  alertAmount: {
    ...typography.bodyStrong
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden'
  },
  rowPressable: {
    padding: spacing.lg,
    gap: spacing.xs
  },
  rowTop: {
    flexDirection: 'row',
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
    ...typography.caption
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  unusedLabel: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  rowHint: {
    ...typography.micro,
    marginTop: spacing.xs
  },
  rowActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm
  },
  rowActionBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  rowActionText: {
    ...typography.caption,
    fontWeight: '700'
  },
  costGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  emptyNote: {
    ...typography.caption,
    textAlign: 'center'
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
