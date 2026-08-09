import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { goalsApi } from "../../api/endpoints";
import { useApi, useMutation } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";
import {
  daysUntil,
  formatDate,
  formatMoney,
  formatPercent,
} from "../../utils/format";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  Skeleton,
  SkeletonList,
} from "../../components/ui";
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.goals)
        ? v.goals
        : Array.isArray(v?.data)
          ? v.data
          : [];
const amt = (o, ks) =>
  Number(o?.[ks.find((k) => Number.isFinite(Number(o?.[k])))] || 0);
const metrics = (g) => {
  const target = amt(g, ["target", "targetAmount", "amount"]);
  const saved = amt(g, ["saved", "savedAmount", "currentAmount"]);
  const left = Math.max(target - saved, 0);
  const days = daysUntil(g?.targetDate || g?.deadline);
  const months = days == null ? null : Math.max(days / 30.44, 0);
  const monthly = months ? left / months : left;
  const pace = amt(g, [
    "monthlyContribution",
    "currentMonthlyPace",
    "monthlySaving",
  ]);
  return {
    target,
    saved,
    progress: target ? Math.min((saved / target) * 100, 100) : 0,
    monthly,
    miss: left > 0 && months !== null && pace > 0 && pace * months < left,
  };
};
function GoalSheet({ visible, goal, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "",
    target: "",
    saved: "",
    date: "",
  });
  useEffect(() => {
    if (visible)
      setForm({
        name: goal?.name || "",
        target: String(goal?.targetAmount || goal?.target || ""),
        saved: String(goal?.savedAmount || goal?.saved || ""),
        date: goal?.targetDate || goal?.deadline || "",
      });
  }, [visible, goal]);
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <Sheet
      visible={visible}
      title={goal ? "Edit goal" : "Add goal"}
      onClose={onClose}
    >
      <View style={styles.fields}>
        <Input
          label="Goal name"
          value={form.name}
          onChangeText={(v) => set("name", v)}
        />
        <Input
          label="Target amount"
          keyboardType="decimal-pad"
          value={form.target}
          onChangeText={(v) => set("target", v)}
        />
        <Input
          label="Saved so far"
          keyboardType="decimal-pad"
          value={form.saved}
          onChangeText={(v) => set("saved", v)}
        />
        <Input
          label="Target date"
          placeholder="YYYY-MM-DD"
          value={form.date}
          onChangeText={(v) => set("date", v)}
        />
        <Button
          accessibilityLabel="Save financial goal"
          disabled={!form.name.trim() || Number(form.target) <= 0}
          loading={loading}
          onPress={() =>
            onSubmit(goal, {
              name: form.name.trim(),
              targetAmount: Number(form.target || 0),
              savedAmount: Number(form.saved || 0),
              targetDate: form.date || null,
            })
          }
          title="Save goal"
        />
      </View>
    </Sheet>
  );
}
function ContributeSheet({ goal, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState("");
  useEffect(() => setAmount(""), [goal]);
  return (
    <Sheet visible={Boolean(goal)} title="Contribute" onClose={onClose}>
      <View style={styles.fields}>
        <Text style={styles.heading}>{goal?.name || "Goal"}</Text>
        <Input
          label="Contribution amount"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Button
          accessibilityLabel="Save goal contribution"
          disabled={Number(amount) <= 0}
          loading={loading}
          onPress={() => onSubmit(goal, { amount: Number(amount) })}
          title="Add contribution"
        />
      </View>
    </Sheet>
  );
}
export default function GoalsScreen() {
  const { colors } = useTheme();
  const state = useApi(() => goalsApi.list(), []);
  const save = useMutation((g, b) =>
    g?.id || g?._id ? goalsApi.update(g.id || g._id, b) : goalsApi.create(b),
  );
  const cont = useMutation((g, b) => goalsApi.contribute(g.id || g._id, b));
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);
  const [cgoal, setCgoal] = useState(null);
  const goals = useMemo(() => arr(state.data), [state.data]);
  const error = state.error || save.error || cont.error;
  const empty = !goals.length;
  const ref = () => state.refetch().catch(() => {});
  const saveGoal = async (g, b) => {
    await save.mutate(g, b);
    setOpen(false);
    ref();
  };
  const contribute = async (g, b) => {
    await cont.mutate(g, b);
    setCgoal(null);
    ref();
  };
  if (state.loading)
    return (
      <Screen title="Goals" scroll>
        <Skeleton height={118} radius={radii.lg} style={styles.block} />
        <SkeletonList count={4} />
      </Screen>
    );
  if (error && empty)
    return (
      <Screen title="Goals">
        <ErrorState message={error.message} onRetry={state.refetch} />
      </Screen>
    );
  if (empty)
    return (
      <Screen
        title="Goals"
        refreshing={state.refreshing}
        onRefresh={state.onRefresh}
      >
        <EmptyState
          title="No goals yet"
          description="Create a goal to see progress and monthly funding needs."
          actionLabel="Add goal"
          onAction={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        <GoalSheet
          visible={open}
          goal={edit}
          onClose={() => setOpen(false)}
          onSubmit={saveGoal}
          loading={save.loading}
        />
      </Screen>
    );
  return (
    <Screen
      title="Goals"
      scroll
      refreshing={state.refreshing}
      onRefresh={state.onRefresh}
    >
      {error ? (
        <ErrorState message={error.message} onRetry={state.refetch} />
      ) : null}
      <View style={styles.right}>
        <Button
          accessibilityLabel="Add financial goal"
          onPress={() => {
            setEdit(null);
            setOpen(true);
          }}
          title="Add goal"
          variant="secondary"
        />
      </View>
      <View style={styles.list}>
        {goals.map((g, i) => {
          const m = metrics(g);
          return (
            <Card key={g?.id || g?._id || i}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Text style={[styles.heading, { color: colors.text }]}>
                    {g?.name || "Unnamed goal"}
                  </Text>
                  <Text style={[styles.cap, { color: colors.textMuted }]}>
                    Target {formatMoney(m.target)} by{" "}
                    {formatDate(g?.targetDate || g?.deadline)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.heading,
                    { color: m.miss ? colors.warning : colors.success },
                  ]}
                >
                  {formatPercent(m.progress)}
                </Text>
              </View>
              <View
                style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: m.miss ? colors.warning : colors.success,
                      width: `${m.progress}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.between}>
                <Text style={[styles.strong, { color: colors.text }]}>
                  Saved {formatMoney(m.saved)}
                </Text>
                <Text style={[styles.strong, { color: colors.text }]}>
                  Need {formatMoney(m.monthly)} / month
                </Text>
              </View>
              {m.miss ? (
                <Text style={[styles.warn, { color: colors.warning }]}>
                  At the current pace, this goal will miss its target date.
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  accessibilityLabel={`Contribute to ${g?.name || "goal"}`}
                  onPress={() => setCgoal(g)}
                  title="Contribute"
                  variant="secondary"
                />
                <Button
                  accessibilityLabel={`Edit ${g?.name || "goal"}`}
                  onPress={() => {
                    setEdit(g);
                    setOpen(true);
                  }}
                  title="Edit"
                  variant="ghost"
                />
              </View>
            </Card>
          );
        })}
      </View>
      <GoalSheet
        visible={open}
        goal={edit}
        onClose={() => setOpen(false)}
        onSubmit={saveGoal}
        loading={save.loading}
      />
      <ContributeSheet
        goal={cgoal}
        onClose={() => setCgoal(null)}
        onSubmit={contribute}
        loading={cont.loading}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  fields: { gap: spacing.md },
  right: { alignItems: "flex-end", marginBottom: spacing.lg },
  list: { gap: spacing.md },
  between: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  flex: { flex: 1 },
  heading: { ...typography.subheading },
  cap: { ...typography.caption, marginTop: spacing.xs },
  track: {
    borderRadius: radii.pill,
    height: 12,
    marginVertical: spacing.md,
    overflow: "hidden",
  },
  fill: { borderRadius: radii.pill, height: "100%" },
  strong: { ...typography.bodyStrong },
  warn: { ...typography.caption, fontWeight: "700", marginTop: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
});
