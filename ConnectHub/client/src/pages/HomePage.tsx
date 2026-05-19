import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useSocket } from '../hooks/useSocket';
import { authService } from '../services/auth';
import { serverService } from '../services/servers';
import { friendService } from '../services/friends';
import { connectSocket } from '../services/socket';
import { ServerList } from '../components/navigation/ServerList';
import { ChannelList } from '../components/navigation/ChannelList';
import { ChatArea } from '../components/chat/ChatArea';
import { FriendsPanel } from '../components/friends/FriendsPanel';
import { UserPanel } from '../components/navigation/UserPanel';
import { VoicePanel } from '../components/voice/VoicePanel';
import { SettingsPanel } from '../components/settings/SettingsPanel';

export function HomePage() {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const activeServer = useStore((s) => s.activeServer);
  const activeChannel = useStore((s) => s.activeChannel);
  const selectedDmUser = useStore((s) => s.selectedDmUser);
  const setUser = useStore((s) => s.setUser);
  const setServers = useStore((s) => s.setServers);
  const setFriends = useStore((s) => s.setFriends);
  const showSettings = useStore((s) => s.showSettings);
  useSocket();

  useEffect(() => {
    if (token) {
      connectSocket(token);
      loadInitialData();
    }
  }, [token]);

  const loadInitialData = async () => {
    try {
      const [userRes, serverRes, friendRes] = await Promise.all([
        authService.getMe(),
        serverService.getServers(),
        friendService.getFriends(),
      ]);
      setUser(userRes.data.user);
      setServers(serverRes.data.servers);
      setFriends(friendRes.data.friends);
    } catch (error) {
      console.error('Failed to load initial data');
    }
  };

  const showDm = !activeServer && !selectedDmUser;
  const showChannel = activeServer && activeChannel;
  const showFriends = showDm || !activeServer;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <ServerList />

        <div className="flex-1 flex min-w-0">
          {activeServer ? (
            <>
              <ChannelList />
              {activeChannel ? (
                <div className="flex-1 flex flex-col min-w-0">
                  {activeChannel.type === 'voice' ? (
                    <div className="flex-1 flex items-center justify-center bg-discord-800">
                      <VoicePanel />
                    </div>
                  ) : (
                    <ChatArea />
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-discord-800">
                  <p className="text-gray-400">Select a channel to start chatting</p>
                </div>
              )}
            </>
          ) : (
            <FriendsPanel />
          )}
        </div>
      </div>

      <UserPanel />
      {showSettings && <SettingsPanel />}
    </div>
  );
}
