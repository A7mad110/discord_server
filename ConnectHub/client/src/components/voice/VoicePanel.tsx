import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Monitor, PhoneOff, MonitorOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../services/socket';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VoicePanel() {
  const activeChannel = useStore((s) => s.activeChannel);
  const currentUser = useStore((s) => s.user);
  const [isInVoice, setIsInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStreams, setScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const userIdRef = useRef<string>('');

  useEffect(() => {
    if (currentUser) userIdRef.current = currentUser._id;
  }, [currentUser]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
  };

  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    audiosRef.current.forEach((audio) => { audio.muted = newDeafened; });
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !newDeafened; });
  };

  const getPC = (targetId: string, stream: MediaStream) => {
    let pc = pcsRef.current.get(targetId);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);
    pcsRef.current.set(targetId, pc);

    stream.getTracks().forEach((t) => pc?.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('voice:signal', {
          to: targetId,
          signal: { type: 'ice-candidate', candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.track.kind === 'audio') {
        let audio = audiosRef.current.get(targetId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audiosRef.current.set(targetId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      } else if (e.track.kind === 'video') {
        setScreenStreams((prev) => {
          const next = new Map(prev);
          next.set(targetId, e.streams[0]);
          return next;
        });
      }
    };

    return pc;
  };

  const callUser = async (targetId: string) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const pc = getPC(targetId, stream);
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket()?.emit('voice:signal', {
        to: targetId,
        signal: { type: 'offer', sdp: offer.sdp },
      });

      const pending = pendingRef.current.get(targetId) || [];
      pending.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
      pendingRef.current.delete(targetId);
    } catch {}
  };

  const handleSignal = async (data: { from: string; signal: any }) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (data.signal.type === 'offer') {
      const pc = getPC(data.from, stream);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket()?.emit('voice:signal', {
          to: data.from,
          signal: { type: 'answer', sdp: answer.sdp },
        });
        const pending = pendingRef.current.get(data.from) || [];
        pending.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
        pendingRef.current.delete(data.from);
      } catch {}
    } else if (data.signal.type === 'answer') {
      const pc = pcsRef.current.get(data.from);
      if (pc && !pc.currentRemoteDescription) {
        try { await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.signal.sdp })); } catch {}
      }
    } else if (data.signal.type === 'ice-candidate') {
      const pc = pcsRef.current.get(data.from);
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate)); } catch {}
      } else {
        const existing = pendingRef.current.get(data.from) || [];
        existing.push(data.signal.candidate);
        pendingRef.current.set(data.from, existing);
      }
    }
  };

  const handleJoin = async () => {
    if (!activeChannel) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      getSocket()?.emit('voice:join', { channelId: activeChannel._id });
      setIsInVoice(true);
    } catch {
      alert('Please allow microphone access.');
    }
  };

  const handleLeave = () => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    audiosRef.current.forEach((a) => { a.pause(); a.srcObject = null; });
    audiosRef.current.clear();
    videosRef.current.forEach((v) => { v.pause(); v.srcObject = null; });
    videosRef.current.clear();
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (screenShareRef.current) { screenShareRef.current.getTracks().forEach((t) => t.stop()); screenShareRef.current = null; }
    getSocket()?.emit('voice:leave', { channelId: activeChannel?._id });
    setIsInVoice(false);
    setIsScreenSharing(false);
    setVoiceUsers([]);
    setScreenStreams(new Map());
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenShareRef.current?.getTracks().forEach((t) => t.stop());
      screenShareRef.current = null;
      setIsScreenSharing(false);
      getSocket()?.emit('screen:stop', { channelId: activeChannel?._id });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenShareRef.current = s;
      setIsScreenSharing(true);
      getSocket()?.emit('screen:start', { channelId: activeChannel?._id });

      pcsRef.current.forEach((pc) => {
        s.getVideoTracks().forEach((t) => {
          const sender = pc.getSenders().find((snd) => snd.track?.kind === 'video');
          if (sender) sender.replaceTrack(t).catch(() => {});
          else pc.addTrack(t, s);
        });
      });

      s.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        screenShareRef.current = null;
      };
    } catch {}
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onRoomUsers = (data: { users: any[] }) => {
      data.users.forEach((u) => {
        if (u.userId === userIdRef.current) return;
        setVoiceUsers((prev) => {
          if (prev.find((v) => v.userId === u.userId)) return prev;
          setTimeout(() => callUser(u.userId), 300);
          return [...prev, u];
        });
      });
    };

    const onUserJoined = (data: { userId: string; username: string }) => {
      if (data.userId === userIdRef.current) return;
      setVoiceUsers((prev) => {
        if (prev.find((v) => v.userId === data.userId)) return prev;
        setTimeout(() => callUser(data.userId), 300);
        return [...prev, data];
      });
    };

    const onUserLeft = (data: { userId: string }) => {
      setVoiceUsers((prev) => prev.filter((v) => v.userId !== data.userId));
      const pc = pcsRef.current.get(data.userId);
      if (pc) { pc.close(); pcsRef.current.delete(data.userId); }
      const audio = audiosRef.current.get(data.userId);
      if (audio) { audio.pause(); audio.srcObject = null; audiosRef.current.delete(data.userId); }
      setScreenStreams((prev) => { const next = new Map(prev); next.delete(data.userId); return next; });
    };

    const screenStarted = (data: { userId: string; username: string }) => {
      toast(`${data.username} started screen sharing`);
    };

    const screenStopped = (data: { userId: string }) => {
      setScreenStreams((prev) => { const next = new Map(prev); next.delete(data.userId); return next; });
    };

    socket.on('voice:room-users', onRoomUsers);
    socket.on('voice:user-joined', onUserJoined);
    socket.on('voice:user-left', onUserLeft);
    socket.on('voice:signal', (data: any) => handleSignal(data));
    socket.on('screen:started', screenStarted);
    socket.on('screen:stopped', screenStopped);

    return () => {
      socket.off('voice:room-users', onRoomUsers);
      socket.off('voice:user-joined', onUserJoined);
      socket.off('voice:user-left', onUserLeft);
      socket.off('voice:signal');
      socket.off('screen:started', screenStarted);
      socket.off('screen:stopped', screenStopped);
    };
  }, []);

  if (!activeChannel || activeChannel.type !== 'voice') return null;

  if (!isInVoice) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
        <div className="w-24 h-24 rounded-full bg-discord-700 flex items-center justify-center mb-6">
          <Volume2 size={48} className="text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{activeChannel.name}</h2>
        <p className="text-gray-400 mb-8">Click below to join the voice channel</p>
        <button onClick={handleJoin} className="btn-primary text-lg px-8 py-3 flex items-center gap-3">
          <Volume2 size={24} /> Join Voice
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full px-4 py-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-green-400">Connected</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-6">{activeChannel.name}</h2>

      {/* Screen shares */}
      {screenStreams.size > 0 && (
        <div className="flex flex-wrap gap-4 mb-6 justify-center w-full max-w-2xl">
          {Array.from(screenStreams.entries()).map(([uid, stream]) => (
            <div key={uid} className="relative">
              <video autoPlay playsInline ref={(el) => { if (el) el.srcObject = stream; }}
                className="w-80 h-48 rounded-lg bg-black object-contain border-2 border-brand-500" />
              <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">
                Screen share
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
        {voiceUsers.map((vu) => (
          <div key={vu.userId} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-discord-700 flex items-center justify-center border-2 border-green-500">
              <span className="text-white font-bold text-lg">{vu.username?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm text-gray-300">{vu.username}</span>
            <span className="text-xs text-green-400">Voice</span>
          </div>
        ))}
        {voiceUsers.length === 0 && (
          <p className="text-gray-400">No one else is here yet. Share the invite!</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={toggleMute}
          className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button onClick={toggleDeafen}
          className={`p-4 rounded-xl transition-all ${isDeafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}>
          {isDeafened ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <button onClick={handleScreenShare}
          className={`p-4 rounded-xl transition-all ${isScreenSharing ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
        <button onClick={handleLeave}
          className="p-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Leave Voice Channel">
          <PhoneOff size={24} />
        </button>
      </div>
      {isScreenSharing && <p className="mt-3 text-sm text-green-400">Sharing your screen</p>}
    </div>
  );
}

function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-discord-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
