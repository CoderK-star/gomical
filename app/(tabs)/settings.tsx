import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenContainer, SectionHeader } from '@/src/components/common';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useCalendar } from '@/src/hooks/useCalendar';
import { useTheme, type ThemeMode } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { requestPermissions } from '@/src/services/notificationService';

function SettingRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: tokenColors.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={tokenColors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null)}
    </Container>
  );
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const settings = useSettingsStore();
  const { municipality } = useCalendar();
  const router = useRouter();

  const currentArea = municipality.areas.find((a) => a.areaId === settings.selectedAreaId);

  const themeLabels: Record<ThemeMode, string> = {
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム設定',
  };

  function cycleTheme() {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
    settings.update({ theme: next });
  }

  function cycleNotificationTime() {
    const next = settings.notificationTime === 'evening' ? 'morning' : 'evening';
    settings.update({ notificationTime: next });
  }

  async function handleNotificationToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          '通知の許可が必要です',
          '設定アプリから通知を許可してください。',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    settings.update({ notificationEnabled: enabled });
  }

  function handleChangeLocation() {
    settings.update({ onboardingComplete: false });
    router.replace('/onboarding');
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <SectionHeader title="収集設定" />

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="business-outline"
            title="自治体"
            subtitle={`${municipality.prefecture}${municipality.municipalityName}`}
            onPress={handleChangeLocation}
          />
          <SettingRow
            icon="location-outline"
            title="地区"
            subtitle={currentArea ? `${currentArea.areaName}（${currentArea.districts.slice(0, 2).join('、')}...）` : '未選択'}
            onPress={handleChangeLocation}
          />
        </View>

        <SectionHeader title="地区を選択" style={{ marginTop: spacing.lg }} />
        <ScrollView
          horizontal={false}
          style={[styles.areaPicker, { backgroundColor: colors.surface }]}
        >
          {municipality.areas.map((area) => {
            const isSelected = area.areaId === settings.selectedAreaId;
            return (
              <TouchableOpacity
                key={area.areaId}
                style={[
                  styles.areaItem,
                  { borderBottomColor: colors.border },
                  isSelected && { backgroundColor: tokenColors.primary + '10' },
                ]}
                onPress={() => settings.update({ selectedAreaId: area.areaId, onboardingComplete: true })}
              >
                <View style={styles.areaInfo}>
                  <Text style={[styles.areaName, { color: colors.text }, isSelected && { color: tokenColors.primary }]}>
                    {area.areaName}
                  </Text>
                  <Text style={[styles.areaDistricts, { color: colors.textSecondary }]} numberOfLines={1}>
                    {area.districts.join('、')}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={tokenColors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeader title="通知" style={{ marginTop: spacing.xl }} />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="notifications-outline"
            title="通知"
            subtitle={settings.notificationEnabled ? 'オン' : 'オフ'}
            right={
              <Switch
                value={settings.notificationEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ true: tokenColors.primary }}
              />
            }
          />
          {settings.notificationEnabled && (
            <SettingRow
              icon="time-outline"
              title="通知タイミング"
              subtitle={settings.notificationTime === 'evening' ? '前日の夜（20時）' : '当日の朝（7時）'}
              onPress={cycleNotificationTime}
            />
          )}
        </View>

        <SectionHeader title="表示" style={{ marginTop: spacing.xl }} />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="color-palette-outline"
            title="テーマ"
            subtitle={themeLabels[mode]}
            onPress={cycleTheme}
          />
        </View>

        <SectionHeader title="アプリ情報" style={{ marginTop: spacing.xl }} />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="information-circle-outline"
            title="バージョン"
            subtitle="1.0.0"
          />
          <SettingRow
            icon="document-text-outline"
            title="プライバシーポリシー"
            onPress={() => {}}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="利用規約"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingTop: spacing.lg,
  },
  section: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  areaPicker: {
    maxHeight: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  areaDistricts: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
