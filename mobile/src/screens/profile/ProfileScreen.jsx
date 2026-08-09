import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { profileApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi } from '../../hooks/useApi';
import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { formatCompact, formatDate, initials } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function snapshotOf(profile) {
  return profile?.snapshot || profile?.financialSnapshot || profile?.summary || {};
}

function isVerified(profile) {
  return Boolean(
    profile?.emailVerified ||
    profile?.isEmailVerified ||
    profile?.verifiedAt ||
    profile?.emailVerification?.verified
  );
}

function memberSince(profile) {
  return profile?.memberSince || profile?.createdAt || profile?.joinedAt || profile?.created_at;
}

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const api = useApi(() => profileApi.get(), []);
  const unreadApi = useApi(() => profileApi.unreadCount(), []);

  const profile = api.data?.profile || api.data || user || {};
  const hasProfile = Boolean(profile?.name || profile?.email || user?.email);
  const snapshot = snapshotOf(profile);
  const verified = isVerified(profile);
  const joined = memberSince(profile);
  const unreadCount = Number(
    unreadApi.data?.count ||
    unreadApi.data?.unread ||
    unreadApi.data ||
    0
  );

  const sections = [
    {
      title: 'Account',
      items: [
        {
          label: 'Settings',
          icon: 'cog-outline',
          onPress: () => navigation.navigate('Settings'),
          badge: unreadCount > 0 ? String(unreadCount) : null
        },
        {
          label: 'Security',
          icon: 'shield-lock-outline',
          onPress: () => navigation.navigate('Security')
        }
      ]
    },
    {
      title: 'Money',
      items: [
        {
          label: 'Budgets',
          icon: 'wallet-outline',
          onPress: () => navigation.navigate('MoneyTab', { screen: 'Budgets' })
        },
        {
          label: 'Goals',
          icon: 'bullseye-arrow',
          onPress: () => navigation.navigate('WealthTab', { screen: 'Goals' })
        },
        {
          label: 'Bills',
          icon: 'receipt-text-outline',
          onPress: () => navigation.navigate('MoneyTab', { screen: 'Bills' })
        }
      ]
    },
    {
      title: 'Legacy',
      items: [
        {
          label: 'Nominees',
          icon: 'account-multiple-outline',
          onPress: () => navigation.navigate('Nominees')
        }
      ]
    }
  ];

  function refreshAll() {
    api.onRefresh();
    unreadApi.onRefresh();
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again to view your finances.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout }
    ]);
  }

  function renderRight(item) {
    return (
      <View style={styles.rowRight}>
        {item.badge ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{item.badge}</Text>
          </View>
        ) : null}
        <Icon name="chevron-right" size={22} color={colors.textMuted} />
      </View>
    );
  }

  if (api.loading && !hasProfile) {
    return (
      <Screen>
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (api.error && !hasProfile) {
    return (
      <Screen>
        <ErrorState message={api.error.message} onRetry={api.refetch} />
      </Screen>
    );
  }

  if (!hasProfile) {
    return (
      <Screen>
        <EmptyState title="No profile details" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={api.refreshing || unreadApi.refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.name)}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{profile.name || 'Financial Analyzer user'}</Text>
            <Text style={styles.email}>{profile.email || user?.email}</Text>
            <View style={styles.metaRow}>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{profile.plan || 'Free'} plan</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  verified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}
              >
                <Icon
                  name={verified ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={14}
                  color={verified ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: verified ? colors.success : colors.warning }
                  ]}
                >
                  {verified ? 'Verified' : 'Email not verified'}
                </Text>
              </View>
            </View>
            {joined ? (
              <Text style={styles.memberSince}>Member since {formatDate(joined)}</Text>
            ) : null}
          </View>
        </Card>

        <View style={styles.grid}>
          <StatTile label="Net worth" value={formatCompact(snapshot.netWorth)} />
          <StatTile label="Monthly spend" value={formatCompact(snapshot.monthSpend)} />
          <StatTile
            label="Savings rate"
            value={`${Number(snapshot.savingsRate || 0).toFixed(0)}%`}
          />
          <StatTile label="Budget left" value={formatCompact(snapshot.budgetLeft)} />
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.sectionBlock}>
            <SectionHeader title={section.title} />
            <Card style={styles.menuCard}>
              {section.items.map((item) => (
                <ListRow
                  key={item.label}
                  title={item.label}
                  left={<Icon name={item.icon} size={22} color={colors.primary} />}
                  right={renderRight(item)}
                  onPress={item.onPress}
                  accessibilityLabel={`Open ${item.label}`}
                  accessibilityRole="button"
                />
              ))}
            </Card>
          </View>
        ))}

        <Pressable
          onPress={confirmSignOut}
          style={styles.signOut}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Icon name="logout" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft
  },
  avatarText: {
    ...typography.title,
    color: colors.primary
  },
  identity: {
    flex: 1,
    gap: spacing.xs
  },
  name: {
    ...typography.title,
    color: colors.text
  },
  email: {
    ...typography.caption,
    color: colors.textMuted
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  planText: {
    ...typography.micro,
    color: colors.primary,
    textTransform: 'uppercase'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  verifiedBadge: {
    backgroundColor: colors.successSoft
  },
  unverifiedBadge: {
    backgroundColor: colors.warningSoft
  },
  statusText: {
    ...typography.micro,
    textTransform: 'uppercase'
  },
  memberSince: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  sectionBlock: {
    gap: spacing.sm
  },
  menuCard: {
    gap: spacing.xs
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  notificationBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xs
  },
  notificationText: {
    ...typography.micro,
    color: colors.onPrimary
  },
  signOut: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft
  },
  signOutText: {
    ...typography.bodyStrong,
    color: colors.danger
  }
});
