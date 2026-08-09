import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0d9488'
  }).catch(() => {});
}

export async function requestPermission() {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return Boolean(requested.granted);
  } catch {
    return false;
  }
}

export async function scheduleReminder({ id, title, body, date }) {
  const granted = await requestPermission();
  if (!granted) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        sound: true
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(date),
        channelId: CHANNEL_ID
      }
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id) {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

export default {
  requestPermission,
  scheduleReminder,
  cancelReminder,
  cancelAll
};
