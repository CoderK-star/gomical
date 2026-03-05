import { useMemo } from 'react';
import type { CalendarDay, GarbageType } from '@/src/types/models';
import type { MascotMood } from './MascotCharacter';

interface MascotState {
  mood: MascotMood;
  message: string;
}

export function useMascotState(todayData: CalendarDay | null, hasArea: boolean): MascotState {
  return useMemo(() => {
    if (!hasArea) {
      return {
        mood: 'thinking' as MascotMood,
        message: '地区を設定すると、ごみの日をお知らせするよ！',
      };
    }

    if (!todayData) {
      return {
        mood: 'neutral' as MascotMood,
        message: 'こんにちは！',
      };
    }

    const types = todayData.garbageTypes;
    const hour = new Date().getHours();

    if (todayData.notes.length > 0) {
      return {
        mood: 'sleeping' as MascotMood,
        message: todayData.notes[0],
      };
    }

    if (types.length === 0) {
      if (hour < 12) {
        return { mood: 'neutral', message: '今日はごみの収集はないよ。のんびりしよう！' };
      }
      return { mood: 'sleeping', message: '今日はお休みの日だね〜' };
    }

    const names = types.map((t) => t.shortName).join('と');

    if (types.length >= 2) {
      return {
        mood: 'excited',
        message: `今日は${names}の日！忘れずに出してね！`,
      };
    }

    if (hour < 8) {
      return {
        mood: 'excited',
        message: `おはよう！今日は${names}の日だよ。朝のうちに出そう！`,
      };
    }

    if (hour < 12) {
      return {
        mood: 'happy',
        message: `今日は${names}の日。もう出した？`,
      };
    }

    return {
      mood: 'happy',
      message: `今日は${names}の日だったよ。お疲れさま！`,
    };
  }, [todayData, hasArea]);
}
