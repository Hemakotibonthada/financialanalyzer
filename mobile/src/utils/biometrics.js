import * as LocalAuthentication from 'expo-local-authentication';

function friendlyError(message) {
  return message || 'Biometric authentication is not available on this device.';
}

export async function isAvailable() {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync()
    ]);
    return Boolean(hasHardware && enrolled);
  } catch {
    return false;
  }
}

export async function getSupportedTypes() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const labels = types.map((type) => {
      if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
        return 'Face ID';
      }
      if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
        return 'Fingerprint';
      }
      if (type === LocalAuthentication.AuthenticationType.IRIS) return 'Iris';
      return 'Biometric';
    });

    return labels[0] || 'Biometric';
  } catch {
    return 'Biometric';
  }
}

export async function authenticate(promptMessage = 'Authenticate to continue') {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, error: 'This device has no biometric hardware.' };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { success: false, error: 'No biometric credentials are enrolled.' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode'
    });

    if (result.success) return { success: true };
    return { success: false, error: friendlyError(result.error) };
  } catch {
    return { success: false, error: 'Biometric authentication could not be completed.' };
  }
}

export default {
  isAvailable,
  getSupportedTypes,
  authenticate
};
