import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { authApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  async function onSubmit() {
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setFieldError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (nextError) {
      setError(nextError?.message || 'Could not request a reset link.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !email) {
    return (
      <View style={styles.stateWrap}>
        <Skeleton height={280} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboard}
    >
      <View style={styles.content}>
        {sent ? (
          <EmptyState
            title="Check your inbox"
            message="If this email address is registered, a password reset link will be sent."
          />
        ) : (
          <Card style={styles.card}>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter your email. If it is registered, we will send a reset link.
            </Text>
            {error ? <ErrorState message={error} onRetry={onSubmit} /> : null}
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={fieldError}
              accessibilityLabel="Email address"
            />
            <Button
              title="Send reset link"
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Send reset link"
              accessibilityRole="button"
            />
          </Card>
        )}
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
          accessibilityLabel="Back to sign in"
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  stateWrap: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  card: { gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  linkText: { ...typography.bodyStrong, color: colors.primary }
});
