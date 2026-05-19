import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, MicOff, Monitor, PhoneOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../services/socket';

export function VoicePanel() {
  const activeChannel = useStore((s) => s.activeChannel);
  const user = useStore((s) => s.user);
  const isMuted = useStore((s) => s.isMuted);
  const [isInVoice, setIsInVoice] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const handleJoinVoice = async () => {
    if (!activeChannel || activeChannel.type !== 'voice' || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const socket = getSocket();
      if (socket) {
        socket.emit('voice:join', { channelId: activeChannel._id });
      }

      setIsInVoice(true);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
    }
  };

  const handleLeaveVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    const socket = getSocket();
    if (socket && activeChannel) {
      socket.emit('voice:leave', { channelId: activeChannel._id });
    }

    setIsInVoice(false);
  };

  const handleScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const socket = getSocket();
      if (socket && activeChannel) {
        socket.emit('screen:start', { channelId: activeChannel._id });
      }

      stream.getVideoTracks()[0].onended = () => {
        if (socket && activeChannel) {
          socket.emit('screen:stop', { channelId: activeChannel._id });
        }
      };
    } catch (error) {
      console.error('Screen share failed:', error);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('voice:user-joined', ({ userId, username }: any) => {
      console.log(`${username} joined voice`);
    });

    socket.on('voice:user-left', ({ userId }: any) => {
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    });

    return () => {
      socket.off('voice:user-joined');
      socket.off('voice:user-left');
    };
  }, []);

  if (!activeChannel || activeChannel.type !== 'voice') return null;

  return (
    <div className="px-4 py-2 bg-discord-700 border-t border-discord-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-brand-400" />
          <span className="text-sm text-gray-300">{activeChannel.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {isInVoice ? (
            <>
              <button
                onClick={() => useStore.getState().setMuted(!isMuted)}
                className={`p-2 rounded-lg ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-discord-600 text-gray-300 hover:text-white'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={handleScreenShare}
                className="p-2 rounded-lg bg-discord-600 text-gray-300 hover:text-white"
                title="Share Screen"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={handleLeaveVoice}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                title="Leave Voice Channel"
              >
                <PhoneOff size={16} />
              </button>
            </>
          ) : (
            <button onClick={handleJoinVoice} className="btn-primary text-sm">
              Join Voice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
