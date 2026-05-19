import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, MicOff, Monitor, PhoneOff, MonitorOff, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../services/socket';

export function VoicePanel() {
  const activeChannel = useStore((s) => s.activeChannel);
  const user = useStore((s) => s.user);
  const isMuted = useStore((s) => s.isMuted);
  const setMuted = useStore((s) => s.setMuted);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const handleJoinVoice = async () => {
    if (!activeChannel || !user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const socket = getSocket();
      if (socket) socket.emit('voice:join', { channelId: activeChannel._id });
      setIsInVoice(true);
    } catch (error) {
      alert('Failed to access microphone. Make sure you allow microphone access.');
    }
  };

  const handleLeaveVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const socket = getSocket();
    if (socket && activeChannel) {
      socket.emit('voice:leave', { channelId: activeChannel._id });
    }
    setIsInVoice(false);
    setIsScreenSharing(false);
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      const socket = getSocket();
      if (socket && activeChannel) socket.emit('screen:stop', { channelId: activeChannel._id });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      const socket = getSocket();
      if (socket && activeChannel) socket.emit('screen:start', { channelId: activeChannel._id });
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        screenStreamRef.current = null;
      };
    } catch {}
  };

  if (!activeChannel || activeChannel.type !== 'voice') return null;

  if (!isInVoice) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
        <div className="w-24 h-24 rounded-full bg-discord-700 flex items-center justify-center mb-6">
          <Volume2 size={48} className="text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{activeChannel.name}</h2>
        <p className="text-gray-400 mb-8">Click below to join the voice channel</p>
        <button onClick={handleJoinVoice} className="btn-primary text-lg px-8 py-3 flex items-center gap-3">
          <Volume2 size={24} />
          Join Voice
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
        <Volume2 size={48} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-1">{activeChannel.name}</h2>
      <p className="text-sm text-green-400 mb-8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Connected - Voice active
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMuted(!isMuted)}
          className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button
          onClick={handleScreenShare}
          className={`p-4 rounded-xl transition-all ${isScreenSharing ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
        <button
          onClick={handleLeaveVoice}
          className="p-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Leave Voice Channel"
        >
          <PhoneOff size={24} />
        </button>
      </div>
      {isScreenSharing && (
        <p className="mt-4 text-sm text-green-400">Screen sharing active</p>
      )}
    </div>
  );
}
