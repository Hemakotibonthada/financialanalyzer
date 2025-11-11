import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  Title,
  Avatar,
  List,
  Divider,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';
import { theme, shadows } from '../../theme';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await profileService.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await logout();
            setLoading(false);
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <Surface style={[styles.headerCard, shadows.medium]}>
        <View style={styles.profileHeader}>
          <Avatar.Text
            size={80}
            label={user?.name?.substring(0, 2).toUpperCase() || 'U'}
            style={styles.avatar}
          />
          <Title style={styles.userName}>{user?.name || 'User'}</Title>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
      </Surface>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <Surface style={[styles.menuCard, shadows.small]}>
          <List.Item
            title="Personal Information"
            left={() => <Icon name="account-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Financial Profile"
            left={() => <Icon name="finance" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Change Password"
            left={() => <Icon name="lock-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
        </Surface>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SETTINGS</Text>
        <Surface style={[styles.menuCard, shadows.small]}>
          <List.Item
            title="Notifications"
            description="Enable push notifications"
            left={() => <Icon name="bell-outline" size={24} color={theme.colors.primary} />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Biometric Authentication"
            description="Use fingerprint or face ID"
            left={() => <Icon name="fingerprint" size={24} color={theme.colors.primary} />}
            right={() => (
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Currency"
            description="INR - Indian Rupee"
            left={() => <Icon name="currency-inr" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Language"
            description="English"
            left={() => <Icon name="translate" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
        </Surface>
      </View>

      {/* Data & Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
        <Surface style={[styles.menuCard, shadows.small]}>
          <List.Item
            title="Export Data"
            left={() => <Icon name="download-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Privacy Policy"
            left={() => <Icon name="shield-check-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Terms & Conditions"
            left={() => <Icon name="file-document-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
        </Surface>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <Surface style={[styles.menuCard, shadows.small]}>
          <List.Item
            title="Help Center"
            left={() => <Icon name="help-circle-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Contact Us"
            left={() => <Icon name="email-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="About"
            description="Version 1.0.0"
            left={() => <Icon name="information-outline" size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.placeholder} />}
            onPress={() => {}}
          />
        </Surface>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Icon name="logout" size={24} color={theme.colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    margin: 20,
    padding: 32,
    borderRadius: theme.roundness * 2,
    backgroundColor: theme.colors.surface,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.placeholder,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.placeholder,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.error + '10',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginLeft: 8,
  },
});

export default ProfileScreen;
