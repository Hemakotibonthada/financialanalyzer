import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { achievementsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function AchievementBadge({ item, colors }) {
  const unlocked = item?.unlocked === true || item?.unlockedAt != null;
  const progress = item?.progress;
  const hasProgress =
    progress != null &&
    Number.isFinite(Number(progress?.current)) &&
    Number.isFinite(Number(progress?.target)) &&
    Number(progress?.target) > 0;

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: unlocked ? colors.success : colors.border,
          backgroundColor: unlocked ? colors.successSoft : colors.surfaceAlt,
          opacity: unlocked ? 1 : 0.6
        }
      ]}
    >
      <Text style={styles.badgeIcon}>{item?.icon || (unlocked ? '🏆' : '🔒')}</Text>
      <View style={styles.badgeBody}>
        <Text
          style={[
            styles.badgeName,
            { color: unlocked ? colors.success : colors.textMuted }
          ]}
        >
          {item?.name || item?.title || '—'}
        </Text>
        {item?.description ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.description}
          </Text>
        ) : null}
        {hasProgress && !unlocked ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {progress.current} / {progress.target}
          </Text>
        ) : null}
        {unlocked && item?.unlockedAt ? (
          <Text style={[styles.meta, { color: colors.success }]}>✓ Unlocked</Text>
        ) : null}
      </View>
    </View>
  );
}

function ChallengeRow({ challenge, colors }) {
  const progress = challenge?.progress;
  const hasProgress =
    progress != null &&
    Number.isFinite(Number(progress?.current)) &&
    Number.isFinite(Number(progress?.target)) &&
    Number(progress?.target) > 0;

  return (
    <View style={[styles.challengeRow, { borderColor: colors.border }]}>
      <Text style={styles.challengeIcon}>{challenge?.icon || '🎯'}</Text>
      <View style={styles.challengeBody}>
        <Text style={[styles.subheading, { color: colors.text }]}>
          {challenge?.title || challenge?.name || '—'}
        </Text>
        {challenge?.description ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {challenge.description}
          </Text>
        ) : null}
        {hasProgress ? (
          <Text style={[styles.meta, { color: colors.primary }]}>
            {progress.current} / {progress.target}
          </Text>
        ) : null}
        {challenge?.reward ? (
          <Text style={[styles.meta, { color: colors.warning }]}>
            Reward: {challenge.reward}
          </Text>
        ) : null}
      </View>
      {challenge?.xp != null ? (
        <Text style={[styles.xp, { color: colors.accent }]}>+{challenge.xp} XP</Text>
      ) : null}
    </View>
  );
}

function LeaderboardRow({ entry, rank, colors }) {
  return (
    <View style={[styles.leaderRow, { borderColor: colors.border }]}>
      <Text style={[styles.rank, { color: colors.textMuted }]}>#{rank}</Text>
      <View style={styles.leaderMain}>
        <Text style={[styles.subheading, { color: colors.text }]}>
          {entry?.name || entry?.username || '—'}
        </Text>
      </View>
      <Text style={[styles.bodyStrong, { color: colors.primary }]}>
        {entry?.points ?? entry?.score ?? '—'}
      </Text>
    </View>
  );
}

export default function AchievementsScreen() {
  const { colors } = useTheme();

  const { data: profileData, loading: pLoading, error: pError,
    refetch: pRefetch, refreshing, onRefresh } =
    useApi(() => achievementsApi.profile(), []);

  const { data: challengesData, loading: cLoading, refetch: cRefetch } =
    useApi(() => achievementsApi.challenges(), []);

  const { data: dailyData, loading: dLoading, refetch: dRefetch } =
    useApi(() => achievementsApi.daily(), []);

  const { data: leaderboardData, loading: lLoading, refetch: lRefetch } =
    useApi(() => achievementsApi.leaderboard(), []);

  const checkMut = useMutation(() => achievementsApi.check());

  // Profile fields - defensive because AchievementService shape is internal
  const profile = profileData?.profile || profileData?.user || profileData || {};
  const level = profile?.level ?? profileData?.level;
  const points = profile?.points ?? profile?.totalPoints ?? profileData?.points;
  const rank = profile?.rank ?? profileData?.rank;
  const streak = profile?.streak ?? profile?.currentStreak ?? profileData?.streak;

  const allAchievements =
    profile?.achievements ||
    profileData?.achievements ||
    profileData?.data?.achievements ||
    [];

  const unlocked = allAchievements.filter(
    (a) => a?.unlocked === true || a?.unlockedAt != null
  );
  const locked = allAchievements.filter(
    (a) => !(a?.unlocked === true || a?.unlockedAt != null)
  );

  const challenges =
    challengesData?.challenges ||
    challengesData?.data?.challenges ||
    (Array.isArray(challengesData) ? challengesData : []);

  const dailyQuests =
    dailyData?.quests ||
    dailyData?.daily ||
    dailyData?.data?.quests ||
    (Array.isArray(dailyData) ? dailyData : []);

  const leaderboard =
    leaderboardData?.leaderboard ||
    leaderboardData?.data?.leaderboard ||
    (Array.isArray(leaderboardData) ? leaderboardData : []);

  async function handleCheck() {
    try {
      await checkMut.mutate();
      pRefetch().catch(() => {});
      cRefetch().catch(() => {});
      dRefetch().catch(() => {});
      lRefetch().catch(() => {});
    } catch {
      // checkMut.error surfaces
    }
  }

  const isLoading = pLoading || cLoading || dLoading || lLoading;

  if (isLoading) {
    return <Screen><SkeletonList count={6} /></Screen>;
  }

  if (pError) {
    return (
      <Screen>
        <ErrorState message={pError?.message} onRetry={pRefetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>

        {/* Profile / level card */}
        <Card style={styles.cardGap}>
          <SectionHeader title="Your profile" />
          <View style={styles.statsRow}>
            {level != null && (
              <StatTile label="Level" value={String(level)} />
            )}
            {points != null && (
              <StatTile label="Points" value={String(points)} />
            )}
            {rank != null && (
              <StatTile label="Rank" value={`#${rank}`} />
            )}
            {streak != null && (
              <StatTile label="Streak" value={`${streak} days`} />
            )}
          </View>
        </Card>

        {/* Check for new achievements */}
        <View style={styles.checkRow}>
          <Button
            title={checkMut.loading ? 'Checking…' : 'Check for new achievements'}
            onPress={handleCheck}
            accessibilityLabel="Check for new achievements"
            accessibilityRole="button"
          />
        </View>

        {checkMut.error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {checkMut.error.message}
          </Text>
        ) : null}

        {/* Unlocked achievements */}
        {unlocked.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`Unlocked (${unlocked.length})`} />
            {unlocked.map((a, i) => (
              <AchievementBadge key={a?.id || a?._id || i} item={a} colors={colors} />
            ))}
          </View>
        )}

        {/* Locked achievements */}
        {locked.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`Locked (${locked.length})`} />
            {locked.map((a, i) => (
              <AchievementBadge key={a?.id || a?._id || i} item={a} colors={colors} />
            ))}
          </View>
        )}

        {allAchievements.length === 0 && (
          <EmptyState
            title="No achievements yet"
            message="Keep using the app to earn achievements and level up."
          />
        )}

        {/* Daily quests */}
        {dailyQuests.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Daily quests" />
            {dailyQuests.map((q, i) => (
              <ChallengeRow
                key={q?.id || q?._id || i}
                challenge={q}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Challenges */}
        {challenges.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Challenges" />
            {challenges.map((c, i) => (
              <ChallengeRow
                key={c?.id || c?._id || i}
                challenge={c}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Leaderboard" />
            {leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={entry?.id || entry?._id || entry?.userId || i}
                entry={entry}
                rank={i + 1}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  checkRow: {
    alignSelf: 'stretch'
  },
  section: {
    gap: spacing.md
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  badgeIcon: {
    fontSize: 28
  },
  badgeBody: {
    flex: 1,
    gap: spacing.xs
  },
  badgeName: {
    ...typography.subheading
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  challengeIcon: {
    fontSize: 24
  },
  challengeBody: {
    flex: 1,
    gap: spacing.xs
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  leaderMain: {
    flex: 1
  },
  rank: {
    ...typography.bodyStrong,
    minWidth: 32
  },
  xp: {
    ...typography.bodyStrong
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center'
  },
  subheading: {
    ...typography.subheading
  },
  bodyStrong: {
    ...typography.bodyStrong
  },
  meta: {
    ...typography.caption
  }
});
