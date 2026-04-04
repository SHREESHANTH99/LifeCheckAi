"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const city = searchParams.get('city') || 'Delhi';

  return <ChatContainer initialCity={city} />;
}
