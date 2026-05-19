import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { messageService } from '../../services/messages';
import { getSocket } from '../../services/socket';
import { Message } from '../../types';
import toast from 'react-hot-toast';

interface MessageInputProps {
  replyTo: Message | null;
  onClearReply: () => void;
}

export function MessageInput({ replyTo, onClearReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeChannel = useStore((s) => s.activeChannel);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChannel]);

  const handleTyping = () => {
    if (!activeChannel) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing:start', { channelId: activeChannel._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { channelId: activeChannel._id });
    }, 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeChannel || (!content.trim() && attachments.length === 0)) return;

    try {
      const { data } = await messageService.sendMessage(activeChannel._id, {
        content: content.trim(),
        replyTo: replyTo?._id,
      });

      const socket = getSocket();
      if (socket) {
        socket.emit('message:send', {
          channelId: activeChannel._id,
          content: content.trim(),
          replyTo: replyTo?._id,
        });
      }

      setContent('');
      setAttachments([]);
      onClearReply();
      inputRef.current?.focus();
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  return (
    <div className="px-4 pb-4">
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-2 bg-discord-700 rounded-t-lg border-b border-discord-600">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-brand-400">Replying to</span>
            <span className="text-white font-medium">{replyTo.author.username}</span>
          </div>
          <button onClick={onClearReply} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex items-end gap-2 bg-discord-700 px-3 py-2 ${
          replyTo ? 'rounded-b-lg' : 'rounded-lg'
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-white p-1"
        >
          <Paperclip size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${activeChannel?.name || 'general'}`}
          className="flex-1 bg-transparent text-white placeholder-gray-400 resize-none outline-none max-h-[144px] py-1 text-sm"
          rows={1}
        />

        <button
          type="submit"
          disabled={!content.trim() && attachments.length === 0}
          className="text-gray-400 hover:text-white p-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </form>

      {attachments.length > 0 && (
        <div className="flex gap-2 mt-2">
          {attachments.map((file, i) => (
            <div key={i} className="px-2 py-1 bg-discord-700 rounded text-xs text-gray-400 flex items-center gap-1">
              {file.name}
              <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
