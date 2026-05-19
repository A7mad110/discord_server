import React, { useState, useEffect, useRef } from 'react';
import { Hash, Users, Pin, HelpCircle, Inbox } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { messageService } from '../../services/messages';
import { Message } from '../../types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';

export function ChatArea() {
  const activeChannel = useStore((s) => s.activeChannel);
  const activeServer = useStore((s) => s.activeServer);
  const messages = useStore((s) => s.messages);
  const setMessages = useStore((s) => s.setMessages);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChannel) {
      loadMessages();
    }
  }, [activeChannel?._id]);

  const loadMessages = async () => {
    if (!activeChannel) return;
    try {
      const { data } = await messageService.getMessages(activeChannel._id, { limit: 50 });
      setMessages(data.messages);
    } catch {
      // Handle error silently
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!activeChannel) {
    const isDm = !activeServer;
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-discord-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash size={32} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-300">
            {isDm ? 'Select a conversation' : 'Select a channel'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isDm
              ? 'Pick a friend to start messaging'
              : 'Choose a channel from the sidebar to start chatting'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-800">
      <div className="h-12 px-4 flex items-center justify-between border-b border-discord-600 shadow-sm">
        <div className="flex items-center gap-2">
          <Hash size={20} className="text-gray-400" />
          <h3 className="font-semibold text-white">{activeChannel.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-white p-1" title="Members">
            <Users size={18} />
          </button>
          <button className="text-gray-400 hover:text-white p-1" title="Pinned Messages">
            <Pin size={18} />
          </button>
          <button className="text-gray-400 hover:text-white p-1" title="Inbox">
            <Inbox size={18} />
          </button>
          <button className="text-gray-400 hover:text-white p-1" title="Help">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              onReply={setReplyTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
    </div>
  );
}
