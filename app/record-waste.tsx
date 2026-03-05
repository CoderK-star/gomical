import React from 'react';
import { useRouter } from 'expo-router';
import { RecordingModal } from '@/src/components/waste/RecordingModal';

export default function RecordWasteScreen() {
  const router = useRouter();

  return <RecordingModal onDismiss={() => router.back()} />;
}
