import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { dormancyApi, estateApi, claimsApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen, ErrorState } from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function countItems(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data.length;
  if (typeof data?.total === 'number') return data.total;
  if (typeof data?.count === 'number') return data.count;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(data?.cases)) return data.cases.length;
  return null;
}

function NavCard({ title, subtitle, count, onPress, colors }) {
  return (
    <TouchableOpacity
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        </View>
        {count != null && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeTxt, { color: colors.onPrimary }]}>
              {count}
            </Text>
          </View>
        )}
        <Text style={[styles.chevron, { color: colors.textFaint }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LegacyHubScreen({ navigation }) {
  const { colors } = useTheme();
  const dormancy = useApi(() => dormancyApi.list(), []);
  const estate = useApi(() => estateApi.list(), []);
  const claims = useApi(() => claimsApi.list(), []);

  const dormancyCount = countItems(dormancy.data);
  const estateCount = countItems(estate.data);
  const claimsCount = countItems(claims.data);

  return (
    <Screen scroll title="Legacy Guard">
      <View style={styles.introBox}>
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          Legacy Guard monitors inactive accounts for welfare, and — when a
          user passes away — helps their nominated family members locate,
          claim, and settle the estate.
        </Text>
      </View>
      <View style={styles.list}>
        <NavCard
          title="Nominees"
          subtitle="Manage who receives this account's assets."
          onPress={() => navigation.navigate('Nominees')}
          colors={colors}
        />
        <NavCard
          title="Dormancy Cases"
          subtitle="Accounts flagged for inactivity welfare monitoring."
          count={dormancyCount}
          onPress={() => navigation.navigate('DormancyCases')}
          colors={colors}
        />
        <NavCard
          title="Estate Cases"
          subtitle="Active estate cases for account holders who have passed away."
          count={estateCount}
          onPress={() => navigation.navigate('EstateCases')}
          colors={colors}
        />
        <NavCard
          title="Recovery Claims"
          subtitle="Claims filed with institutions to recover estate assets."
          count={claimsCount}
          onPress={() => navigation.navigate('RecoveryClaims')}
          colors={colors}
        />
        <NavCard
          title="Nominee Portal"
          subtitle="Family member view — follow case progress and upload documents."
          onPress={() => navigation.navigate('NomineePortal')}
          colors={colors}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introBox: {
    marginBottom: spacing.xl,
  },
  intro: {
    ...typography.body,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: HIT_TARGET,
    padding: spacing.lg,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.subheading,
  },
  cardSub: {
    ...typography.caption,
  },
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeTxt: {
    ...typography.micro,
  },
  chevron: {
    fontSize: 24,
    marginLeft: spacing.xs,
  },
});
