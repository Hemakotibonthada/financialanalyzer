import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '../../components/ui';
import { radii, spacing, typography } from '../../theme/tokens';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function strengthFor(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return { score, label: ['Very weak', 'Weak', 'Good', 'Strong', 'Excellent'][score] };
}

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const strength = strengthFor(password);

  function validate() {
    const next = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (strength.score < 2) next.password = 'Use 8+ characters with a number or symbol.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    if (!validate()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (error) {
      setFormError(error?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !name && !email) {
    return (
      <View style={styles.stateWrap}>
        <Skeleton height={420} />
      </View>
    );
  }

  if (!register) {
    return (
      <View style={styles.stateWrap}>
        <EmptyState title="Registration unavailable" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboard}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start with a secure profile for your money data.</Text>
        <Card style={styles.card}>
          {formError ? <ErrorState message={formError} onRetry={onSubmit} /> : null}
          <Input label="Name" value={name} onChangeText={setName} error={errors.name} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />
          <View accessibilityLabel={`Password strength ${strength.label}`}>
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${Math.max(strength.score, 1) * 25}%` }]} />
            </View>
            <Text style={styles.meterLabel}>{strength.label}</Text>
          </View>
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            error={errors.confirm}
          />
          <Text style={styles.terms}>
            By registering, you agree to protect your credentials and use the app only for
            your own financial records.
          </Text>
          <Button
            title="Create account"
            onPress={onSubmit}
            loading={submitting}
            disabled={submitting}
            accessibilityLabel="Create account"
            accessibilityRole="button"
          />
          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
            accessibilityLabel="Back to sign in"
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  stateWrap: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.display, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg
  },
  card: { gap: spacing.md },
  meterTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden'
  },
  meterFill: { height: 8, borderRadius: radii.pill, backgroundColor: colors.primary },
  meterLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  terms: { ...typography.caption, color: colors.textMuted, lineHeight: 19 },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { ...typography.bodyStrong, color: colors.primary }
});
