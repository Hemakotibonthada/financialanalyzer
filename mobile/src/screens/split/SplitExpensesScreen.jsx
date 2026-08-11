import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { splitExpensesApi } from '../../api/endpoints';
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

function GroupCard({ group, colors, onPress }) {
  const members = group?.members?.filter((m) => m?.isActive !== false) || [];
  const memberCount = members.length;

  return (
    <TouchableOpacity
      accessibilityLabel={`Open group ${group?.name}`}
      accessibilityRole="button"
      onPress={() => onPress(group)}
      style={[styles.groupCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <View style={styles.groupCardRow}>
        <Text style={[styles.avatar]}>{group?.avatar || '👥'}</Text>
        <View style={styles.groupCardMain}>
          <Text style={[styles.groupName, { color: colors.text }]}>
            {group?.name || 'Group'}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
            {group?.category ? ` · ${titleCase(group.category)}` : ''}
          </Text>
        </View>
        <View style={styles.groupCardRight}>
          {group?.totalExpenses != null && (
            <Text style={[styles.groupTotal, { color: colors.text }]}>
              {formatMoney(group.totalExpenses)}
            </Text>
          )}
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CreateGroupSheet({ visible, onClose, onSubmit, loading, colors }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, description: description.trim() });
  }

  function reset() {
    setName('');
    setDescription('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="New group">
      <View style={styles.sheetContent}>
        <Input
          label="Group name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Group name"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Description"
        />
        <Button
          title={loading ? 'Creating…' : 'Create group'}
          onPress={submit}
          accessibilityLabel="Create group"
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

export default function SplitExpensesScreen({ navigation }) {
  const { colors } = useTheme();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () => splitExpensesApi.groups(),
    []
  );

  const createGroup = useMutation((body) => splitExpensesApi.createGroup(body));

  const groups = data?.groups || data?.items || (Array.isArray(data) ? data : []);

  async function handleCreate(body) {
    try {
      await createGroup.mutate(body);
      setCreateOpen(false);
      refetch().catch(() => {});
    } catch (err) {
      // error surfaced via createGroup.error
    }
  }

  function openGroup(group) {
    navigation.navigate('SplitGroupDetail', { id: getId(group), name: group?.name });
  }

  if (loading) {
    return <Screen><SkeletonList count={5} /></Screen>;
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error?.message} onRetry={refetch} />
      </Screen>
    );
  }

  if (!groups.length) {
    return (
      <Screen>
        <EmptyState
          title="No split-expense groups"
          message="Create a group to track shared expenses with friends or family."
          actionLabel="Create group"
          onAction={() => setCreateOpen(true)}
        />
        <CreateGroupSheet
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          loading={createGroup.loading}
          colors={colors}
        />
      </Screen>
    );
  }

  const totalGroups = groups.length;
  const totalExpenses = groups.reduce(
    (sum, g) => sum + (Number(g?.totalExpenses) || 0),
    0
  );

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.summaryCard}>
          <Text style={[styles.title, { color: colors.text }]}>Split Expenses</Text>
          <View style={styles.statsRow}>
            <StatTile label="Groups" value={String(totalGroups)} />
            <StatTile label="Total expenses" value={formatMoney(totalExpenses)} />
          </View>
        </Card>

        {createGroup.error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {createGroup.error.message}
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your groups</Text>
          <TouchableOpacity
            accessibilityLabel="Create a new group"
            accessibilityRole="button"
            onPress={() => setCreateOpen(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addText, { color: colors.onPrimary }]}>+ New</Text>
          </TouchableOpacity>
        </View>

        {groups.map((group) => (
          <GroupCard
            key={getId(group)}
            group={group}
            colors={colors}
            onPress={openGroup}
          />
        ))}
      </ScrollView>

      <CreateGroupSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createGroup.loading}
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
  summaryCard: {
    gap: spacing.md
  },
  title: {
    ...typography.title
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    ...typography.heading
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
  groupCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg
  },
  groupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  avatar: {
    fontSize: 28
  },
  groupCardMain: {
    flex: 1,
    gap: spacing.xs
  },
  groupName: {
    ...typography.subheading
  },
  groupCardRight: {
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  groupTotal: {
    ...typography.bodyStrong
  },
  chevron: {
    fontSize: 20
  },
  meta: {
    ...typography.caption
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
  }
});
