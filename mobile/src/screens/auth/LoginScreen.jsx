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
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function messageFor(error) {
  return error?.message || error?.error || 'Sign in failed. Please check your details.';
}

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { login, loading, biometricEnabled, authenticateWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const disabled = submitting || loading;

  function validate() {
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    if (!validate()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      setFormError(messageFor(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function onBiometric() {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await authenticateWithBiometric();
      if (!result?.success) setFormError(result?.error || 'Biometric authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !email && !password) {
    return (
      <View style={styles.stateWrap}>
        <Skeleton height={130} />
        <Skeleton height={260} />
      </View>
    );
  }

  if (!login) {
    return (
      <View style={styles.stateWrap}>
        <EmptyState title="Sign in unavailable" message="Authentication is still loading." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboard}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.hero}>
          <Text style={styles.kicker}>Financial Analyzer</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>See where every rupee is going.</Text>
        </LinearGradient>

        <Card style={styles.card}>
          {formError ? <ErrorState message={formError} onRetry={onSubmit} /> : null}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
            accessibilityLabel="Email address"
          />
          <View style={styles.passwordWrap}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              error={errors.password}
              accessibilityLabel="Password"
            />
            <Pressable
              onPress={() => setSecure((value) => !value)}
              style={styles.eye}
              accessibilityLabel={secure ? 'Show password' : 'Hide password'}
              accessibilityRole="button"
              hitSlop={spacing.sm}
            >
              <Icon
                name={secure ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          <Button
            title="Sign in"
            onPress={onSubmit}
            loading={disabled}
            disabled={disabled}
            accessibilityLabel="Sign in"
            accessibilityRole="button"
          />
          {biometricEnabled ? (
            <Button
              title="Sign in with Face ID / Fingerprint"
              variant="secondary"
              onPress={onBiometric}
              disabled={disabled}
              accessibilityLabel="Sign in with biometrics"
              accessibilityRole="button"
            />
          ) : null}
          <View style={styles.links}>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={styles.linkButton}
              accessibilityLabel="Create account"
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>Create account</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.linkButton}
              accessibilityLabel="Forgot password"
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  stateWrap: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg
  },
  kicker: {
    ...typography.micro,
    color: colors.onPrimary,
    opacity: 0.85,
    textTransform: 'uppercase'
  },
  title: {
    ...typography.display,
    color: colors.onPrimary,
    marginTop: spacing.md
  },
  subtitle: {
    ...typography.body,
    color: colors.onPrimary,
    opacity: 0.88,
    marginTop: spacing.xs
  },
  card: {
    gap: spacing.md
  },
  passwordWrap: {
    position: 'relative'
  },
  eye: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  linkButton: {
    minHeight: HIT_TARGET,
    justifyContent: 'center'
  },
  linkText: {
    ...typography.bodyStrong,
    color: colors.primary
  }
});
