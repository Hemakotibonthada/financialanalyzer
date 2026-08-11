import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { notificationsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Button,
  ErrorState,
  Input,
  Screen,
  SectionHeader,
  SkeletonList,
} from '../../components/ui';
import { titleCase } from '../../utils/format';
import { radii, spacing, typography } from '../../theme/tokens';

export default function NotificationPreferencesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const prefsApi = useApi(() => notificationsApi.preferences(), []);
  const updateMut = useMutation(
    (body) => notificationsApi.updatePreferences(body),
  );

  const [localPrefs, setLocalPrefs] = useState(null);
  const [saved, setSaved] = useState(false);

  // Populate local state once the API responds (first time only).
  useEffect(() => {
    if (prefsApi.data && !localPrefs) {
      setLocalPrefs(prefsApi.data);
    }
  }, [prefsApi.data, localPrefs]);

  const handleToggle = useCallback((section, key, value) => {
    setSaved(false);
    setLocalPrefs((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const handleText = useCallback((section, key, value) => {
    setSaved(false);
    setLocalPrefs((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaved(false);
    try {
      await updateMut.mutate(localPrefs);
      setSaved(true);
    } catch {
      /* error surfaced from updateMut.error below */
    }
  }, [updateMut, localPrefs]);

  if (prefsApi.loading && !localPrefs) {
    return (
      <Screen>
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (prefsApi.error && !localPrefs) {
    return (
      <Screen>
        <ErrorState
          message={prefsApi.error.message}
          onRetry={prefsApi.refetch}
        />
      </Screen>
    );
  }

  const prefs = localPrefs || {};

  return (
    <Screen scroll>
      <View style={styles.content}>
        {Object.entries(prefs).map(([section, sectionVal]) => {
          if (!sectionVal || typeof sectionVal !== 'object') return null;
          const entries = Object.entries(sectionVal);
          if (!entries.length) return null;
          return (
            <View key={section} style={styles.section}>
              <SectionHeader title={titleCase(section)} />
              {entries.map(([key, value]) => {
                const label = titleCase(key);
                if (typeof value === 'boolean') {
                  return (
                    <View key={key} style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>
                        {label}
                      </Text>
                      <Switch
                        value={value}
                        onValueChange={(v) => handleToggle(section, key, v)}
                        thumbColor={value ? colors.primary : colors.textFaint}
                        trackColor={{
                          false: colors.border,
                          true: colors.primarySoft,
                        }}
                        accessibilityLabel={`${label} for ${titleCase(section)}`}
                        accessibilityRole="switch"
                      />
                    </View>
                  );
                }
                if (typeof value === 'string') {
                  return (
                    <Input
                      key={key}
                      label={label}
                      value={value}
                      onChangeText={(v) => handleText(section, key, v)}
                      style={styles.inputField}
                    />
                  );
                }
                return null;
              })}
            </View>
          );
        })}

        {updateMut.error ? (
          <Text style={[styles.feedback, { color: colors.danger }]}>
            {updateMut.error.message}
          </Text>
        ) : null}

        {saved && !updateMut.error ? (
          <Text style={[styles.feedback, { color: colors.success }]}>
            Preferences saved.
          </Text>
        ) : null}

        <Button
          title={updateMut.loading ? 'Saving…' : 'Save preferences'}
          onPress={handleSave}
          disabled={updateMut.loading || !localPrefs}
          accessibilityLabel="Save notification preferences"
          style={styles.saveBtn}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    content: { gap: spacing.xl, paddingBottom: 48 },
    section: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowLabel: { ...typography.body, flex: 1 },
    inputField: { marginTop: spacing.xs },
    feedback: {
      ...typography.caption,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    saveBtn: { marginTop: spacing.md },
  });
