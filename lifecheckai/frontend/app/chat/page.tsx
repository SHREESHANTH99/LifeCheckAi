"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatContainer } from '@/components/chat/ChatContainer';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const city = searchParams.get('city') || 'Delhi';

  return <ChatContainer initialCity={city} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <ChatPageContent />
    </Suspense>
  );
}
