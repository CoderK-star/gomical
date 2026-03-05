import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { spacing, fontSize, fontWeight, borderRadius } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';

export type MascotMood = 'happy' | 'neutral' | 'excited' | 'sleeping' | 'thinking';

interface MascotCharacterProps {
  mood?: MascotMood;
  message?: string;
  size?: number;
}

const MASCOT_IMAGES: Record<MascotMood, ImageSourcePropType> = {
  happy: require('@/assets/images/mascot/happy.png'),
  neutral: require('@/assets/images/mascot/neutral.png'),
  excited: require('@/assets/images/mascot/excited.png'),
  sleeping: require('@/assets/images/mascot/sleeping.png'),
  thinking: require('@/assets/images/mascot/thinking.png'),
};

const CHAR_DELAY_MS = 100;

function useTypewriter(text: string | undefined): string {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }

    indexRef.current = 0;
    setDisplayed('');

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, CHAR_DELAY_MS);

    return () => clearInterval(timer);
  }, [text]);

  return displayed;
}

export function MascotCharacter({ mood = 'neutral', message, size = 240 }: MascotCharacterProps) {
  const { colors } = useTheme();
  const displayedMessage = useTypewriter(message);

  return (
    <View style={styles.container}>
      <Image
        source={MASCOT_IMAGES[mood]}
        style={{ width: size, height: 240 }}
        resizeMode="contain"
      />

      {message && (
        <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bubbleText, { color: colors.text }]}>
            {displayedMessage}
            {displayedMessage.length < (message?.length ?? 0) && (
              <Text style={styles.cursor}>▌</Text>
            )}
          </Text>
          <View style={[styles.bubbleArrow, { borderBottomColor: colors.surface }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    maxWidth: 260,
    position: 'relative',
  },
  bubbleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    lineHeight: 20,
  },
  bubbleArrow: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  cursor: {
    opacity: 0.6,
  },
});
