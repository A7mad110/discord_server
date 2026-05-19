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
  const user = useStore((s) => s.user);
  const [isInVoice, setIsInVoice] = useState(false);
  const [users, setUsers] = useState<{ userId: string; username: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [screenVideo, setScreenVideo] = useState<{ userId: string } | null>(null);

  const localAudio = useRef<MediaStream | null>(null);
  const shareStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIce = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const remoteAudios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const myId = useRef('');

  useEffect(() => { if (user) myId.current = user._id; }, [user]);

  // Create or get peer connection for a target
  const ensurePC = (targetId: string, stream: MediaStream, isScreen = false) => {
    const key = isScreen ? `${targetId}:screen` : targetId;
    let pc = peers.current.get(key);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);
    peers.current.set(key, pc);

    stream.getTracks().forEach((t) => pc!.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('voice:signal', {
          to: targetId,
          signal: { type: 'ice-candidate', candidate: e.candidate.toJSON(), isScreen },
        });
      }
    };

    if (!isScreen) {
      pc.ontrack = (e) => {
        if (e.track.kind !== 'audio') return;
        let el = remoteAudios.current.get(targetId);
        if (!el) { el = new Audio(); el.autoplay = true; remoteAudios.current.set(targetId, el); }
        el.srcObject = e.streams[0];
        el.play().catch(() => {});
      };
    }

    return pc;
  };

  // Offer/Answer/Ice logic
  const negotiate = async (targetId: string, isScreen = false) => {
    const stream = isScreen ? shareStream.current : localAudio.current;
    if (!stream) return;
    const pc = ensurePC(targetId, stream, isScreen);
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket()?.emit('voice:signal', {
        to: targetId,
        signal: { type: 'offer', sdp: offer.sdp, isScreen },
      });
      const pending = pendingIce.current.get(targetId) || [];
      pending.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
      pendingIce.current.delete(targetId);
    } catch {}
  };

  const handleSignal = async (data: { from: string; signal: any }) => {
    const isScreen = data.signal.isScreen || false;
    const stream = isScreen ? shareStream.current : localAudio.current;
    if (!stream) return;
    const key = isScreen ? `${data.from}:screen` : data.from;
    let pc = peers.current.get(key);

    if (data.signal.type === 'offer') {
      pc = ensurePC(data.from, stream, isScreen);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket()?.emit('voice:signal', {
          to: data.from,
          signal: { type: 'answer', sdp: answer.sdp, isScreen },
        });
        const pending = pendingIce.current.get(data.from) || [];
        pending.forEach((c) => pc!.addIceCandidate(c).catch(() => {}));
        pendingIce.current.delete(data.from);
      } catch {}
    } else if (data.signal.type === 'answer') {
      pc = peers.current.get(key);
      if (pc && !pc.currentRemoteDescription) {
        try { await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.signal.sdp })); } catch {}
      }
    } else if (data.signal.type === 'ice-candidate') {
      pc = peers.current.get(key);
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate)); } catch {}
      } else {
        const list = pendingIce.current.get(data.from) || [];
        list.push(new RTCIceCandidate(data.signal.candidate));
        pendingIce.current.set(data.from, list);
      }
    }
  };

  // Connect to a user
  const connectTo = (uid: string) => {
    if (uid === myId.current) return;
    if (!localAudio.current) return;
    setTimeout(() => negotiate(uid, false), 200);
  };

  // Join voice
  const join = async () => {
    if (!activeChannel) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudio.current = s;
      getSocket()?.emit('voice:join', { channelId: activeChannel._id });
      setIsInVoice(true);
    } catch { alert('Please allow microphone access.'); }
  };

  // Leave voice
  const leave = () => {
    peers.current.forEach((pc) => pc.close());
    peers.current.clear();
    pendingIce.current.clear();
    remoteAudios.current.forEach((a) => { a.pause(); a.srcObject = null; });
    remoteAudios.current.clear();
    if (localAudio.current) { localAudio.current.getTracks().forEach((t) => t.stop()); localAudio.current = null; }
    if (shareStream.current) { shareStream.current.getTracks().forEach((t) => t.stop()); shareStream.current = null; }
    getSocket()?.emit('voice:leave', { channelId: activeChannel?._id });
    setIsInVoice(false);
    setUsers([]);
    setIsSharing(false);
    setScreenVideo(null);
  };

  // Mute / Deafen
  const toggleMute = () => {
    const v = !isMuted;
    setIsMuted(v);
    localAudio.current?.getAudioTracks().forEach((t) => { t.enabled = !v; });
  };
  const toggleDeafen = () => {
    const v = !isDeafened;
    setIsDeafened(v);
    remoteAudios.current.forEach((a) => { a.muted = v; });
    if (v) localAudio.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
    else localAudio.current?.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
  };

  // Screen share
  const toggleScreen = async () => {
    if (isSharing) {
      shareStream.current?.getTracks().forEach((t) => t.stop());
      shareStream.current = null;
      setIsSharing(false);
      getSocket()?.emit('screen:stop', { channelId: activeChannel?._id });
      // Clean up screen PCs
      peers.current.forEach((pc, key) => { if (key.includes(':screen')) { pc.close(); peers.current.delete(key); } });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      shareStream.current = s;
      setIsSharing(true);
      getSocket()?.emit('screen:start', { channelId: activeChannel?._id });

      // Negotiate screen share with all connected users
      users.forEach((u) => {
        if (u.userId === myId.current) return;
        setTimeout(() => negotiate(u.userId, true), 300);
      });

      s.getVideoTracks()[0].onended = () => {
        shareStream.current = null;
        setIsSharing(false);
        peers.current.forEach((pc, key) => { if (key.includes(':screen')) { pc.close(); peers.current.delete(key); } });
      };
    } catch {}
  };

  // Socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('voice:room-users', (data: { users: any[] }) => {
      data.users.forEach((u: any) => {
        if (u.userId === myId.current) return;
        setUsers((prev) => { if (prev.find((x) => x.userId === u.userId)) return prev; connectTo(u.userId); return [...prev, u]; });
      });
    });

    socket.on('voice:user-joined', (data: { userId: string; username: string }) => {
      if (data.userId === myId.current) return;
      setUsers((prev) => { if (prev.find((x) => x.userId === data.userId)) return prev; connectTo(data.userId); return [...prev, data]; });
    });

    socket.on('voice:user-left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((x) => x.userId !== data.userId));
      // Clean up audio peer
      const pc = peers.current.get(data.userId);
      if (pc) { pc.close(); peers.current.delete(data.userId); }
      // Clean up screen peer
      const spc = peers.current.get(`${data.userId}:screen`);
      if (spc) { spc.close(); peers.current.delete(`${data.userId}:screen`); }
      const el = remoteAudios.current.get(data.userId);
      if (el) { el.pause(); el.srcObject = null; remoteAudios.current.delete(data.userId); }
      setScreenVideo((prev) => prev?.userId === data.userId ? null : prev);
    });

    socket.on('voice:signal', (data: any) => handleSignal(data));

    socket.on('screen:started', (data: { userId: string; username: string }) => {
      setScreenVideo({ userId: data.userId });
    });

    socket.on('screen:stopped', (data: { userId: string }) => {
      setScreenVideo((prev) => prev?.userId === data.userId ? null : prev);
      const spc = peers.current.get(`${data.userId}:screen`);
      if (spc) { spc.close(); peers.current.delete(`${data.userId}:screen`); }
    });

    return () => {
      socket.off('voice:room-users');
      socket.off('voice:user-joined');
      socket.off('voice:user-left');
      socket.off('voice:signal');
      socket.off('screen:started');
      socket.off('screen:stopped');
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
        <p className="text-gray-400 mb-8">Click below to join</p>
        <button onClick={join} className="btn-primary text-lg px-8 py-3 flex items-center gap-3">
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

      {/* Screen share video from remote */}
      {screenVideo && (
        <div className="mb-6 w-full max-w-lg">
          <div className="bg-black rounded-lg overflow-hidden border-2 border-brand-500">
            <video autoPlay playsInline className="w-full h-48 object-contain"
              ref={(el) => {
                if (!el) return;
                const spc = peers.current.get(`${screenVideo.userId}:screen`);
                if (spc) {
                  const receiver = spc.getReceivers().find((r) => r.track?.kind === 'video');
                  if (receiver) el.srcObject = new MediaStream([receiver.track]);
                }
              }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Screen share</p>
        </div>
      )}

      {/* Users */}
      <div className="flex flex-wrap gap-6 mb-8 justify-center">
        {users.map((u) => (
          <div key={u.userId} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-discord-700 border-2 border-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{u.username?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm text-gray-300">{u.username}</span>
            <span className="text-xs text-green-400">Voice</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-gray-400">No one else here</p>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
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
        <button onClick={toggleScreen}
          className={`p-4 rounded-xl transition-all ${isSharing ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-discord-600 text-gray-300 hover:text-white hover:bg-discord-500'}`}
          title={isSharing ? 'Stop Sharing' : 'Share Screen'}>
          {isSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
        <button onClick={leave}
          className="p-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Leave">
          <PhoneOff size={24} />
        </button>
      </div>
      {isSharing && <p className="mt-3 text-sm text-green-400">Sharing your screen</p>}
    </div>
  );
}
