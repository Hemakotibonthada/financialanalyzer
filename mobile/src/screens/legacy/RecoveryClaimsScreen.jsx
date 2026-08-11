import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { claimsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate, formatMoney, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const CLAIM_TYPES = [
  'insurance_death_claim',
  'loan_recovery',
  'investment_redemption',
  'deposit_closure',
  'epf_claim',
  'ppf_claim',
  'nps_claim',
  'property_transfer',
  'generic_recovery',
];

function arr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.claims)) return data.claims;
  return [];
}

function groupByType(claims) {
  const map = {};
  for (const c of claims) {
    const key = c?.claimType || 'generic_recovery';
    if (!map[key]) map[key] = [];
    map[key].push(c);
  }
  return map;
}

function CreateClaimSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [estateCaseId, setEstateCaseId] = useState('');
  const [claimType, setClaimType] = useState('');
  const [institution, setInstitution] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <Sheet visible={visible} title="Create recovery claim" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Estate case ID"
          value={estateCaseId}
          onChangeText={setEstateCaseId}
          accessibilityLabel="Estate case ID"
        />
        <Input
          label={`Claim type (${CLAIM_TYPES.join(', ')})`}
          value={claimType}
          onChangeText={setClaimType}
          accessibilityLabel="Claim type"
        />
        <Input
          label="Institution name"
          value={institution}
          onChangeText={setInstitution}
          accessibilityLabel="Institution name"
        />
        <Input
          label="Claimed amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Claimed amount"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Create claim"
          loading={loading}
          disabled={!estateCaseId.trim() || !claimType.trim()}
          onPress={() =>
            onSubmit({
              estateCaseId: estateCaseId.trim(),
              claimType: claimType.trim(),
              institution: { name: institution.trim() },
              claimedAmountInINR: amount ? Number(amount) : undefined,
            })
          }
          accessibilityLabel="Confirm create claim"
        />
      </View>
    </Sheet>
  );
}

export default function RecoveryClaimsScreen({ navigation }) {
  const { colors } = useTheme();
  const [createOpen, setCreateOpen] = useState(false);

  const list = useApi(() => claimsApi.list(), []);
  const create = useMutation((body) => claimsApi.create(body));

  const claims = arr(list.data);
  const grouped = groupByType(claims);

  if (list.loading) {
    return (
      <Screen title="Recovery Claims">
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (list.error) {
    return (
      <Screen title="Recovery Claims">
        <ErrorState message={list.error.message} onRetry={list.refetch} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Recovery Claims"
      scroll
      refreshing={list.refreshing}
      onRefresh={list.onRefresh}
    >
      {list.fromCache && (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Showing cached data — pull down to refresh.
          </Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Claims</Text>
        <Button
          title="New claim"
          variant="secondary"
          size="sm"
          onPress={() => setCreateOpen(true)}
          accessibilityLabel="Create a new recovery claim"
        />
      </View>

      {claims.length === 0 ? (
        <EmptyState
          title="No recovery claims"
          description="Create a claim to begin the recovery process for an estate asset."
          actionLabel="New claim"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        Object.keys(grouped).map((type) => (
          <View key={type} style={styles.group}>
            <SectionHeader title={titleCase(type)} />
            <Card padded={false}>
              {grouped[type].map((item, i) => (
                <ListRow
                  key={item?.id || item?._id || i}
                  title={item?.claimNumber || 'Untitled claim'}
                  subtitle={
                    titleCase(item?.status || '') +
                    (item?.institution?.name
                      ? ` · ${item.institution.name}`
                      : '')
                  }
                  right={
                    item?.claimedAmountInINR != null
                      ? formatMoney(item.claimedAmountInINR)
                      : ''
                  }
                  chevron
                  accessibilityLabel={`Open claim ${item?.claimNumber || ''}`}
                  onPress={() =>
                    navigation.navigate('RecoveryClaimDetail', {
                      id: item?.id || item?._id,
                    })
                  }
                />
              ))}
            </Card>
          </View>
        ))
      )}

      <CreateClaimSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        loading={create.loading}
        error={create.error}
        onSubmit={async (body) => {
          try {
            await create.mutate(body);
            setCreateOpen(false);
            list.refetch();
          } catch (_) {}
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerText: {
    ...typography.caption,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heading: {
    ...typography.heading,
  },
  group: {
    marginBottom: spacing.lg,
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
