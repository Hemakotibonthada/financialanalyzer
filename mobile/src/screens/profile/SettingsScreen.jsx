import React, { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { profileApi } from "../../api/endpoints";
import { useApi, useMutation } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { clearCache } from "../../utils/storage";
import { HIT_TARGET, radii, spacing, typography } from "../../theme/tokens";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonList,
} from "../../components/ui";
const modes = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "System"],
];
export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const [cleared, setCleared] = useState(false);
  const state = useApi(() => profileApi.get(), []);
  const update = useMutation((b) => profileApi.update(b));
  const profile = state.data?.profile || state.data || {};
  const prefs = profile.notificationPreferences || profile.notifications || {};
  const entries = useMemo(() => Object.entries(prefs), [prefs]);
  const error = state.error || update.error;
  const api =
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.manifest?.extra?.apiUrl ||
    "Not configured";
  const toggle = async (k) => {
    await update.mutate({
      notificationPreferences: { ...prefs, [k]: !prefs[k] },
    });
    state.refetch().catch(() => {});
  };
  if (state.loading)
    return (
      <Screen title="Settings" scroll>
        <SkeletonList count={5} />
      </Screen>
    );
  if (error && !state.data)
    return (
      <Screen title="Settings">
        <ErrorState message={error.message} onRetry={state.refetch} />
      </Screen>
    );
  return (
    <Screen
      title="Settings"
      scroll
      refreshing={state.refreshing}
      onRefresh={state.onRefresh}
    >
      {error ? (
        <ErrorState message={error.message} onRetry={state.refetch} />
      ) : null}
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>Appearance</Text>
        <View style={styles.segments}>
          {modes.map(([k, l]) => (
            <Pressable
              key={k}
              accessibilityLabel={`Use ${l} appearance`}
              accessibilityRole="button"
              onPress={() => setMode(k)}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    mode === k ? colors.primary : colors.surfaceAlt,
                  borderColor: mode === k ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  { color: mode === k ? colors.onPrimary : colors.text },
                ]}
              >
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Notifications
        </Text>
        {entries.length ? (
          entries.map(([k, v]) => (
            <View key={k} style={styles.switchRow}>
              <Text style={[styles.body, { color: colors.text }]}>
                {k
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())}
              </Text>
              <Switch
                accessibilityLabel={`Toggle ${k} notifications`}
                accessibilityRole="switch"
                disabled={update.loading}
                onValueChange={() => toggle(k).catch(() => {})}
                thumbColor={v ? colors.primary : colors.textFaint}
                trackColor={{
                  false: colors.surfaceAlt,
                  true: colors.primarySoft,
                }}
                value={Boolean(v)}
              />
            </View>
          ))
        ) : (
          <EmptyState
            title="No notification preferences"
            description="The API has not provided notification settings for this profile."
          />
        )}
      </Card>
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Currency & locale
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          INR is the base currency. Money uses Indian numbering and rupee
          symbols.
        </Text>
      </Card>
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Data & storage
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Clear cached GET responses stored for offline reading.
        </Text>
        <Button
          accessibilityLabel="Clear cached app data"
          onPress={() => clearCache().then(() => setCleared(true))}
          title="Clear cache"
          variant="secondary"
          style={styles.top}
        />
        {cleared ? (
          <Text style={[styles.cap, { color: colors.success }]}>
            Cache cleared.
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>About</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Version{" "}
          {Application.nativeApplicationVersion ||
            Constants.expoConfig?.version ||
            "1.0.0"}
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          API environment: {api}
        </Text>
        <Button
          accessibilityLabel="Open Financial Analyzer website"
          onPress={() =>
            Linking.openURL("https://financialanalyzer.app").catch(() => {})
          }
          title="Website"
          variant="ghost"
          style={styles.top}
        />
        <Button
          accessibilityLabel="Open privacy policy"
          onPress={() =>
            Linking.openURL("https://financialanalyzer.app/privacy").catch(
              () => {},
            )
          }
          title="Privacy policy"
          variant="ghost"
        />
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  heading: { ...typography.subheading, marginBottom: spacing.md },
  segments: { flexDirection: "row", gap: spacing.sm },
  segment: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: HIT_TARGET,
    paddingHorizontal: spacing.sm,
  },
  segText: { ...typography.caption, fontWeight: "700" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: HIT_TARGET,
    paddingVertical: spacing.sm,
  },
  body: { ...typography.body },
  cap: { ...typography.caption, marginTop: spacing.sm },
  top: { marginTop: spacing.md },
});
