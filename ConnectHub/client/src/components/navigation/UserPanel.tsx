import React, { useState } from 'react';
import { Mic, MicOff, Headphones, VolumeX, Settings, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Avatar } from '../common/Avatar';
import { authService } from '../../services/auth';
import { disconnectSocket } from '../../services/socket';
import toast from 'react-hot-toast';

export function UserPanel() {
  const user = useStore((s) => s.user);
  const isMuted = useStore((s) => s.isMuted);
  const isDeafened = useStore((s) => s.isDeafened);
  const setMuted = useStore((s) => s.setMuted);
  const setDeafened = useStore((s) => s.setDeafened);
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const setShowSettings = useStore((s) => s.setShowSettings);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue with logout
    }
    disconnectSocket();
    setUser(null);
    setToken(null);
    toast.success('Logged out');
  };

  if (!user) return null;

  return (
    <div className="h-[52px] bg-discord-700 flex items-center justify-between px-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar src={user.avatar} username={user.username} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.username}</p>
          <p className="text-[10px] text-gray-400">{user.uniqueId}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setMuted(!isMuted)}
          className={`p-1.5 rounded ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-gray-400 hover:text-white hover:bg-discord-600'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={() => setDeafened(!isDeafened)}
          className={`p-1.5 rounded ${isDeafened ? 'text-red-400 bg-red-500/10' : 'text-gray-400 hover:text-white hover:bg-discord-600'}`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX size={18} /> : <Headphones size={18} />}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-discord-600"
          title="User Settings"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-discord-600"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
