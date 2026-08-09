import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export default function Sheet({ visible, title, children, onClose }) {
  const { colors } = useTheme();
  const overlayStyle = [styles.overlay, { backgroundColor: colors.overlay }];
  const sheetStyle = [styles.sheet, { backgroundColor: colors.surface }];
  const titleStyle = [styles.title, { color: colors.text }];
  const closeStyle = [styles.close, { color: colors.textMuted }];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          onPress={onClose}
          style={overlayStyle}
        />
        <View style={sheetStyle}>
          <View style={styles.header}>
            {title ? <Text style={titleStyle}>{title}</Text> : <View />}
            <Pressable
              accessibilityLabel="Close sheet"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={closeStyle}>×</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    padding: spacing.lg
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  title: {
    ...typography.heading
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  close: {
    fontSize: 28,
    lineHeight: 30
  }
});
