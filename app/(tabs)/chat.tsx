import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/src/components/common';
import { useCalendar } from '@/src/hooks/useCalendar';
import { useTheme } from '@/src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, colors as tokenColors } from '@/src/theme/tokens';
import { sendChatMessage, type ChatMessage } from '@/src/services/difyService';
import { t } from '@/src/i18n';

let messageIdCounter = 0;
function nextId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { municipality, hasArea } = useCalendar();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: t('chat.greeting') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendChatMessage(
        text,
        conversationId,
        municipality?.municipalityName ?? '',
      );
      setConversationId(result.conversationId);
      const botMsg: ChatMessage = { id: nextId(), role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: t('chat.errorMessage'),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, municipality]);

  if (!hasArea) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('chat.noArea')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubbleRow,
          isUser ? styles.userRow : styles.botRow,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: tokenColors.primary + '20' }]}>
            <Ionicons name="chatbubble-ellipses" size={16} color={tokenColors.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: tokenColors.primary }]
              : [styles.botBubble, { backgroundColor: colors.surfaceSecondary }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#FFFFFF' : colors.text },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={[styles.typingRow]}>
          <View style={[styles.avatar, { backgroundColor: tokenColors.primary + '20' }]}>
            <Ionicons name="chatbubble-ellipses" size={16} color={tokenColors.primary} />
          </View>
          <View style={[styles.typingBubble, { backgroundColor: colors.surfaceSecondary }]}>
            <ActivityIndicator size="small" color={tokenColors.primary} />
            <Text style={[styles.typingText, { color: colors.textTertiary }]}>…</Text>
          </View>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: input.trim() && !loading ? tokenColors.primary : colors.surfaceSecondary },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Ionicons
            name="send"
            size={18}
            color={input.trim() && !loading ? '#FFFFFF' : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: borderRadius.sm,
  },
  botBubble: {
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  typingText: {
    fontSize: fontSize.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
