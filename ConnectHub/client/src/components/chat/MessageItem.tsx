import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Reply } from 'lucide-react';
import { Message } from '../../types';
import { Avatar } from '../common/Avatar';
import { useStore } from '../../store/useStore';
import { messageService } from '../../services/messages';
import toast from 'react-hot-toast';

interface MessageItemProps {
  message: Message;
  onReply: (message: Message) => void;
}

export function MessageItem({ message, onReply }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const user = useStore((s) => s.user);
  const isOwn = user?._id === message.author._id;

  const handleEdit = async () => {
    try {
      await messageService.editMessage(message._id, editContent);
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to edit message');
    }
  };

  const handleDelete = async () => {
    try {
      await messageService.deleteMessage(message._id);
    } catch (error: any) {
      toast.error('Failed to delete message');
    }
  };

  if (message.isDeleted) {
    return (
      <div className="px-4 py-1 text-sm text-gray-500 italic">
        [deleted]
      </div>
    );
  }

  return (
    <div className="group px-4 py-1 hover:bg-discord-800/50">
      {message.replyTo && (
        <div className="ml-14 mb-1 pl-2 border-l-2 border-discord-500 text-xs text-gray-400">
          Replying to {message.replyTo.author?.username}
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar
          src={message.author.avatar}
          username={message.author.username}
          size="md"
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-sm text-white hover:underline cursor-pointer">
              {message.author.username}
            </span>
            <span className="text-xs text-gray-400">
              {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
            {message.isEdited && (
              <span className="text-xs text-gray-500">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="input text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                <span>Enter to save</span>
                <span>Esc to cancel</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-200 mt-0.5 break-words">{message.content}</p>
          )}

          {message.attachments?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-400 hover:text-brand-300 underline"
                >
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="hidden group-hover:flex items-center gap-1 bg-discord-700 rounded-lg border border-discord-500 p-0.5">
          <button
            onClick={() => onReply(message)}
            className="p-1.5 text-gray-400 hover:text-white rounded"
            title="Reply"
          >
            <Reply size={14} />
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded"
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-400 rounded"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
