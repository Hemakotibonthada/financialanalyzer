import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { profileApi } from "../../api/endpoints";
import { useApi, useMutation } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import * as biometrics from "../../utils/biometrics";
import { HIT_TARGET, radii, spacing, typography } from "../../theme/tokens";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Skeleton,
  SkeletonList,
} from "../../components/ui";
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.sessions)
        ? v.sessions
        : Array.isArray(v?.activeSessions)
          ? v.activeSessions
          : [];
export default function SecurityScreen() {
  const { colors } = useTheme();
  const auth = useAuth();
  const state = useApi(() => profileApi.get(), []);
  const pass = useMutation((b) => profileApi.update({ password: b }));
  const signout = useMutation(() =>
    profileApi.update({ signOutAllDevices: true }),
  );
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState("Biometric");
  const [reason, setReason] = useState("Checking biometric availability...");
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [saved, setSaved] = useState(false);
  const profile = state.data?.profile || state.data || {};
  const sessions = useMemo(
    () => arr(profile.sessions || profile.activeSessions),
    [profile],
  );
  const hasSessions =
    Array.isArray(profile.sessions) || Array.isArray(profile.activeSessions);
  const error = state.error || pass.error || signout.error;
  useEffect(() => {
    let ok = true;
    Promise.all([
      biometrics.isAvailable(),
      biometrics.getSupportedTypes(),
    ]).then(([a, l]) => {
      if (!ok) return;
      setAvailable(a);
      setLabel(l);
      setReason(
        a
          ? `${l} can be used to unlock Financial Analyzer.`
          : "Biometric unlock is unavailable because hardware is absent or nothing is enrolled.",
      );
    });
    return () => {
      ok = false;
    };
  }, []);
  const toggle = async () => {
    if (!available) return;
    if (auth.biometricEnabled) await auth.disableBiometric();
    else await auth.enableBiometric();
  };
  const change = async () => {
    await pass.mutate(form);
    setSaved(true);
    setForm({ currentPassword: "", newPassword: "" });
  };
  const all = async () => {
    await signout.mutate();
    await auth.logout();
  };
  if (state.loading)
    return (
      <Screen title="Security" scroll>
        <Skeleton height={116} radius={radii.lg} style={styles.block} />
        <SkeletonList count={3} />
      </Screen>
    );
  if (error && !state.data)
    return (
      <Screen title="Security">
        <ErrorState message={error.message} onRetry={state.refetch} />
      </Screen>
    );
  return (
    <Screen
      title="Security"
      scroll
      refreshing={state.refreshing}
      onRefresh={state.onRefresh}
    >
      {error ? (
        <ErrorState message={error.message} onRetry={state.refetch} />
      ) : null}
      <Card style={styles.block}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {label} unlock
            </Text>
            <Text style={[styles.cap, { color: colors.textMuted }]}>
              {reason}
            </Text>
          </View>
          <Switch
            accessibilityLabel={`Toggle ${label} unlock`}
            accessibilityRole="switch"
            disabled={!available}
            onValueChange={toggle}
            thumbColor={
              auth.biometricEnabled ? colors.primary : colors.textFaint
            }
            trackColor={{ false: colors.surfaceAlt, true: colors.primarySoft }}
            value={Boolean(auth.biometricEnabled && available)}
          />
        </View>
      </Card>
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Change password
        </Text>
        <View style={styles.fields}>
          <Input
            label="Current password"
            secureTextEntry
            value={form.currentPassword}
            onChangeText={(v) => setForm((x) => ({ ...x, currentPassword: v }))}
          />
          <Input
            label="New password"
            secureTextEntry
            value={form.newPassword}
            onChangeText={(v) => setForm((x) => ({ ...x, newPassword: v }))}
          />
          <Button
            accessibilityLabel="Change password"
            disabled={!form.currentPassword || !form.newPassword}
            loading={pass.loading}
            onPress={change}
            title="Change password"
          />
          {saved ? (
            <Text style={[styles.cap, { color: colors.success }]}>
              Password updated.
            </Text>
          ) : null}
        </View>
      </Card>
      {hasSessions ? (
        <Card style={styles.block}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Active sessions
          </Text>
          {sessions.length ? (
            sessions.map((s, i) => (
              <View key={s?.id || i} style={styles.session}>
                <View style={styles.flex}>
                  <Text style={[styles.strong, { color: colors.text }]}>
                    {s?.device || s?.name || "Signed-in device"}
                  </Text>
                  <Text style={[styles.cap, { color: colors.textMuted }]}>
                    {s?.location || s?.ip || "Location unavailable"}
                  </Text>
                </View>
                <Text style={[styles.cap, { color: colors.textMuted }]}>
                  {s?.lastActive || s?.lastSeen || ""}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState
              title="No active sessions"
              description="The API returned an empty session list."
            />
          )}
        </Card>
      ) : null}
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>
          Account access
        </Text>
        <Text style={[styles.cap, { color: colors.textMuted }]}>
          Sign out everywhere if a device is lost or access is unsafe.
        </Text>
        <Button
          accessibilityLabel="Sign out of all devices"
          loading={signout.loading}
          onPress={all}
          title="Sign out of all devices"
          variant="danger"
          style={styles.top}
        />
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: HIT_TARGET,
  },
  flex: { flex: 1 },
  heading: { ...typography.subheading, marginBottom: spacing.xs },
  cap: { ...typography.caption, lineHeight: 18 },
  fields: { gap: spacing.md },
  session: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  strong: { ...typography.bodyStrong },
  top: { marginTop: spacing.md },
});
