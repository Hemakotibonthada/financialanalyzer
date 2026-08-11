import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { insuranceApi } from '../../api/endpoints';
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
  SkeletonList,
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id;
}

function PolicyRow({ item, colors, onPress }) {
  const type = titleCase(item?.type || 'Insurance');
  const provider = item?.provider?.name || '—';
  const policyNo = item?.provider?.policyNumber;
  const status = item?.status || '—';
  const premium = item?.policyDetails?.premiumAmount;
  const endDate = item?.endDate;
  const isActive = status === 'active';

  return (
    <TouchableOpacity
      accessibilityLabel={`Open ${type} policy from ${provider}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.between}>
        <Text style={[styles.subheading, { color: colors.text }]}>{type}</Text>
        <View style={[
          styles.chip,
          { backgroundColor: isActive ? colors.successSoft : colors.warningSoft },
        ]}>
          <Text style={[
            styles.micro,
            { color: isActive ? colors.success : colors.warning },
          ]}>
            {titleCase(status)}
          </Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {provider}{policyNo ? ` · ${policyNo}` : ''}
      </Text>
      <View style={styles.between}>
        {premium != null
          ? <Text style={[styles.body, { color: colors.text }]}>
              {formatMoney(premium)}/yr
            </Text>
          : null}
        {endDate
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Ends {formatDate(endDate)}
            </Text>
          : null}
      </View>
    </TouchableOpacity>
  );
}

function AlertBand({ items, label, accent, colors }) {
  if (!items?.length) return null;
  const tone = accent === 'danger' ? colors.danger : colors.warning;
  const bg = accent === 'danger' ? colors.dangerSoft : colors.warningSoft;
  return (
    <View style={[styles.alertBand, { backgroundColor: bg }]}>
      <Text style={[styles.alertTitle, { color: tone }]}>
        {label} ({items.length})
      </Text>
      {items.slice(0, 3).map((p) => (
        <Text key={getId(p)} style={[styles.caption, { color: colors.text }]}>
          {titleCase(p?.type || 'Policy')} — {p?.provider?.name || '—'}
          {p?.endDate ? `  ·  expires ${formatDate(p.endDate)}` : ''}
        </Text>
      ))}
      {items.length > 3
        ? <Text style={[styles.caption, { color: tone }]}>
            +{items.length - 3} more
          </Text>
        : null}
    </View>
  );
}

function PolicySheet({ visible, initial, onClose, onSubmit, onDelete, loading, colors }) {
  const [type, setType] = useState(initial?.type || '');
  const [providerName, setProviderName] = useState(initial?.provider?.name || '');
  const [policyNumber, setPolicyNumber] = useState(
    initial?.provider?.policyNumber || ''
  );
  const [sumInsured, setSumInsured] = useState(
    initial?.policyDetails?.sumInsured != null
      ? String(initial.policyDetails.sumInsured) : ''
  );
  const [premium, setPremium] = useState(
    initial?.policyDetails?.premiumAmount != null
      ? String(initial.policyDetails.premiumAmount) : ''
  );

  function submit() {
    if (!type.trim() || !providerName.trim()) return;
    const si = Number(String(sumInsured).replace(/,/g, ''));
    const pr = Number(String(premium).replace(/,/g, ''));
    onSubmit({
      type: type.trim(),
      provider: {
        name: providerName.trim(),
        policyNumber: policyNumber.trim(),
      },
      policyDetails: {
        ...(Number.isFinite(si) && si > 0 ? { sumInsured: si } : {}),
        ...(Number.isFinite(pr) && pr > 0 ? { premiumAmount: pr } : {}),
      },
    });
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit policy' : 'Add policy'}
    >
      <View style={styles.sheetContent}>
        <Input
          label="Type (life, health, motor…)"
          value={type}
          onChangeText={setType}
          accessibilityLabel="Policy type"
        />
        <Input
          label="Provider name"
          value={providerName}
          onChangeText={setProviderName}
          accessibilityLabel="Insurance provider name"
        />
        <Input
          label="Policy number"
          value={policyNumber}
          onChangeText={setPolicyNumber}
          accessibilityLabel="Policy number"
        />
        <Input
          label="Sum insured (₹)"
          value={sumInsured}
          onChangeText={setSumInsured}
          keyboardType="decimal-pad"
          accessibilityLabel="Sum insured"
        />
        <Input
          label="Annual premium (₹)"
          value={premium}
          onChangeText={setPremium}
          keyboardType="decimal-pad"
          accessibilityLabel="Annual premium"
        />
        <Button
          title={loading ? 'Saving…' : 'Save policy'}
          onPress={submit}
          accessibilityLabel="Save policy"
        />
        {initial
          ? <TouchableOpacity
              accessibilityLabel="Delete this policy"
              accessibilityRole="button"
              onPress={onDelete}
              style={[styles.dangerButton, { borderColor: colors.danger }]}
            >
              <Text style={[styles.body, { color: colors.danger }]}>
                Delete policy
              </Text>
            </TouchableOpacity>
          : null}
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.body, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function InsuranceScreen({ navigation }) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => Promise.all([
      insuranceApi.list(),
      insuranceApi.expiring(),
      insuranceApi.premiumsDue(),
      insuranceApi.coverageAnalysis(),
    ]).then(([list, expiring, premiumsDue, coverage]) => ({
      policies: Array.isArray(list)
        ? list
        : list?.policies || list?.items || [],
      expiring: Array.isArray(expiring) ? expiring : [],
      premiumsDue: Array.isArray(premiumsDue) ? premiumsDue : [],
      coverage: coverage || {},
    })),
    []
  );

  const save = useMutation((body) =>
    editing
      ? insuranceApi.update(getId(editing), body)
      : insuranceApi.create(body)
  );
  const removeMutation = useMutation((id) => insuranceApi.remove(id));

  const policies = data?.policies || [];
  const expiring = data?.expiring || [];
  const premiumsDue = data?.premiumsDue || [];
  const coverage = data?.coverage || {};
  const coverageKeys = Object.keys(coverage).filter(
    (k) => k !== 'userId' && coverage[k] != null
  );

  function openSheet(item = null) {
    setEditing(item);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
  }

  async function handleSubmit(body) {
    try {
      await save.mutate(body);
      closeSheet();
      refetch().catch(() => {});
    } catch {
      /* save.error surfaced below */
    }
  }

  async function handleDelete() {
    if (!editing) return;
    try {
      await removeMutation.mutate(getId(editing));
      closeSheet();
      refetch().catch(() => {});
    } catch {
      /* removeMutation.error surfaced below */
    }
  }

  if (loading) return <Screen><SkeletonList count={5} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  if (!policies.length && !expiring.length && !premiumsDue.length) {
    return (
      <Screen>
        <EmptyState
          title="No policies yet"
          description={
            'Add your insurance policies to track coverage, ' +
            'premiums, and claims in one place.'
          }
          actionLabel="Add policy"
          onAction={() => openSheet()}
        />
        <PolicySheet
          key="new"
          visible={sheetOpen}
          initial={null}
          onClose={closeSheet}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          loading={save.loading}
          colors={colors}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AlertBand
          items={expiring}
          label="Expiring soon — renew to stay protected"
          accent="danger"
          colors={colors}
        />
        <AlertBand
          items={premiumsDue}
          label="Premiums due — missed payment can lapse coverage"
          accent="warning"
          colors={colors}
        />

        {coverageKeys.length > 0
          ? <Card style={styles.block}>
              <Text style={[styles.heading, { color: colors.text }]}>
                Coverage analysis
              </Text>
              {coverage.totalCoverage != null
                ? <View style={[styles.between, { marginTop: spacing.sm }]}>
                    <Text style={[styles.caption, { color: colors.textMuted }]}>
                      Total coverage
                    </Text>
                    <Text style={[styles.subheading, { color: colors.text }]}>
                      {formatMoney(coverage.totalCoverage)}
                    </Text>
                  </View>
                : null}
              {Array.isArray(coverage.coverageGaps) && coverage.coverageGaps.length
                ? <>
                    <Text style={[styles.caption, {
                      color: colors.danger,
                      marginTop: spacing.sm,
                    }]}>
                      Coverage gaps
                    </Text>
                    {coverage.coverageGaps.map((g, i) => (
                      <Text key={i} style={[styles.caption, { color: colors.text }]}>
                        • {typeof g === 'string' ? g : g?.type || JSON.stringify(g)}
                      </Text>
                    ))}
                  </>
                : null}
              {Array.isArray(coverage.recommendations) && coverage.recommendations.length
                ? <>
                    <Text style={[styles.caption, {
                      color: colors.textMuted,
                      marginTop: spacing.sm,
                    }]}>
                      Recommendations
                    </Text>
                    {coverage.recommendations.map((r, i) => (
                      <Text key={i} style={[styles.caption, { color: colors.text }]}>
                        • {typeof r === 'string' ? r : r?.message || r?.text || ''}
                      </Text>
                    ))}
                  </>
                : null}
            </Card>
          : null}

        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.text }]}>
            All policies
          </Text>
          <TouchableOpacity
            accessibilityLabel="Add insurance policy"
            accessibilityRole="button"
            onPress={() => openSheet()}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.bodyStrong, { color: colors.onPrimary }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {policies.map((item) => (
          <PolicyRow
            key={getId(item)}
            item={item}
            colors={colors}
            onPress={() =>
              navigation.navigate('InsuranceDetail', { id: getId(item) })
            }
          />
        ))}

        {(save.error || removeMutation.error)
          ? <Text style={[styles.caption, { color: colors.danger }]}>
              {(save.error || removeMutation.error)?.message}
            </Text>
          : null}
      </ScrollView>

      <PolicySheet
        key={editing ? `edit-${getId(editing)}` : 'new'}
        visible={sheetOpen}
        initial={editing}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        loading={save.loading || removeMutation.loading}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  block: { gap: spacing.sm },
  alertBand: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  alertTitle: { ...typography.subheading },
  heading: { ...typography.heading },
  subheading: { ...typography.subheading },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
  micro: { ...typography.micro },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  dangerButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
