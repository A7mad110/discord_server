import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, Mic, MicOff, Monitor, PhoneOff, MonitorOff, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../services/socket';
import { Avatar } from '../common/Avatar';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VoiceUser {
  userId: string;
  username: string;
}

export function VoicePanel() {
  const activeChannel = useStore((s) => s.activeChannel);
  const user = useStore((s) => s.user);
  const [isInVoice, setIsInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'none'>('none');
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const createPeerConnection = useCallback((targetUserId: string, stream: MediaStream) => {
    if (peerConnectionsRef.current.has(targetUserId)) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(targetUserId, pc);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('voice:signal', {
          to: targetUserId,
          signal: { type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionQuality('good');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionQuality('poor');
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audioElementsRef.current.set(targetUserId, audio);
      audio.play().catch(() => {});
    };

    return pc;
  }, []);

  const handleJoinVoice = async () => {
    if (!activeChannel || !user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const socket = getSocket();
      if (!socket) return;

      socket.emit('voice:join', { channelId: activeChannel._id });
      setIsInVoice(true);
    } catch {
      alert('Please allow microphone access to use voice chat.');
    }
  };

  const handleLeaveVoice = () => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

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
    setVoiceUsers([]);
    setConnectionQuality('none');
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

  const initiateCall = useCallback(async (targetUserId: string, targetUsername: string) => {
    if (!user || !localStreamRef.current) return;
    const pc = createPeerConnection(targetUserId, localStreamRef.current);
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket?.emit('voice:signal', {
        to: targetUserId,
        signal: { type: 'offer', sdp: offer.sdp },
      });

      const pendingCandidates = pendingCandidatesRef.current.get(targetUserId) || [];
      pendingCandidates.forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });
      pendingCandidatesRef.current.delete(targetUserId);
    } catch {}
  }, [user, createPeerConnection]);

  const handleSignal = useCallback(async (data: { from: string; signal: any }) => {
    if (!user || !localStreamRef.current) return;

    if (data.signal.type === 'offer') {
      const pc = createPeerConnection(data.from, localStreamRef.current);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const socket = getSocket();
        socket?.emit('voice:signal', {
          to: data.from,
          signal: { type: 'answer', sdp: answer.sdp },
        });

        const pendingCandidates = pendingCandidatesRef.current.get(data.from) || [];
        pendingCandidates.forEach((candidate) => {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        });
        pendingCandidatesRef.current.delete(data.from);
      } catch {}
    } else if (data.signal.type === 'answer') {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc && pc.currentRemoteDescription === null) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.signal.sdp }));
        } catch {}
      }
    } else if (data.signal.type === 'ice-candidate') {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        } catch {}
      } else {
        const existing = pendingCandidatesRef.current.get(data.from) || [];
        existing.push(data.signal.candidate);
        pendingCandidatesRef.current.set(data.from, existing);
      }
    }
  }, [user, createPeerConnection]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onRoomUsers = (data: { users: VoiceUser[] }) => {
      data.users.forEach((vu) => {
        if (vu.userId === user?._id) return;
        setVoiceUsers((prev) => {
          if (prev.find((u) => u.userId === vu.userId)) return prev;
          setTimeout(() => initiateCall(vu.userId, vu.username), 500);
          return [...prev, vu];
        });
      });
    };

    const onUserJoined = (data: { userId: string; username: string }) => {
      if (data.userId === user?._id) return;
      setVoiceUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        setTimeout(() => initiateCall(data.userId, data.username), 500);
        return [...prev, data];
      });
    };

    const onUserLeft = (data: { userId: string }) => {
      setVoiceUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(data.userId); }
      const audio = audioElementsRef.current.get(data.userId);
      if (audio) { audio.pause(); audio.srcObject = null; audioElementsRef.current.delete(data.userId); }
    };

    socket.on('voice:room-users', onRoomUsers);
    socket.on('voice:user-joined', onUserJoined);
    socket.on('voice:user-left', onUserLeft);
    socket.on('voice:signal', handleSignal);

    return () => {
      socket.off('voice:room-users', onRoomUsers);
      socket.off('voice:user-joined', onUserJoined);
      socket.off('voice:user-left', onUserLeft);
      socket.off('voice:signal', handleSignal);
    };
  }, [initiateCall, handleSignal, user?._id]);

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
          <Volume2 size={24} /> Join Voice
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-3 h-3 rounded-full ${connectionQuality === 'good' ? 'bg-green-400 animate-pulse' : connectionQuality === 'poor' ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
        <span className="text-sm text-green-400">
          {connectionQuality === 'good' ? 'Connected' : connectionQuality === 'poor' ? 'Poor connection' : 'Connecting...'}
        </span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-6">{activeChannel.name}</h2>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        {voiceUsers.length === 0 && (
          <p className="text-gray-400">Waiting for others to join...</p>
        )}
        {voiceUsers.map((vu) => (
          <div key={vu.userId} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-discord-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
            </div>
            <span className="text-sm text-gray-300">{vu.username}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button onClick={handleScreenShare}
          className={`p-4 rounded-xl transition-all ${isScreenSharing ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
        <button onClick={handleLeaveVoice}
          className="p-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Leave Voice Channel">
          <PhoneOff size={24} />
        </button>
      </div>
      {isScreenSharing && <p className="mt-4 text-sm text-green-400">Screen sharing active</p>}
    </div>
  );
}
