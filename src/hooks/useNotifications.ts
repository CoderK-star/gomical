import { useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import {
  setupNotificationChannel,
  requestPermissions,
  scheduleNotifications,
  cancelAllScheduled,
} from '../services/notificationService';

export function useNotifications() {
  const {
    selectedAreaId,
    notificationEnabled,
    notificationTime,
    notificationEveningHour,
    notificationMorningHour,
  } = useSettingsStore();

  const prevSettingsRef = useRef<string>('');

  const reschedule = useCallback(async () => {
    if (!notificationEnabled || !selectedAreaId) {
      await cancelAllScheduled();
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      // Permission denied - disable in settings
      useSettingsStore.getState().update({ notificationEnabled: false });
      return;
    }

    await setupNotificationChannel();
    await scheduleNotifications(
      selectedAreaId,
      notificationTime,
      notificationEveningHour,
      notificationMorningHour
    );
  }, [selectedAreaId, notificationEnabled, notificationTime, notificationEveningHour, notificationMorningHour]);

  // Reschedule when settings change
  useEffect(() => {
    const key = `${selectedAreaId}_${notificationEnabled}_${notificationTime}_${notificationEveningHour}_${notificationMorningHour}`;
    if (key === prevSettingsRef.current) return;
    prevSettingsRef.current = key;

    reschedule();
  }, [reschedule]);

  // Reschedule when app returns to foreground
  useEffect(() => {
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active' && notificationEnabled && selectedAreaId) {
        reschedule();
      }
    }

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [reschedule, notificationEnabled, selectedAreaId]);

  return { reschedule };
}
