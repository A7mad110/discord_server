import React from 'react';
import { Plus, Compass } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { serverService } from '../../services/servers';
import toast from 'react-hot-toast';

export function ServerList() {
  const servers = useStore((s) => s.servers);
  const activeServer = useStore((s) => s.activeServer);
  const setActiveServer = useStore((s) => s.setActiveServer);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const setSelectedDmUser = useStore((s) => s.setSelectedDmUser);

  const handleCreateServer = async () => {
    const name = prompt('Server name:');
    if (!name) return;
    try {
      const { data } = await serverService.createServer({ name });
      useStore.getState().addServer(data.server);
      setActiveServer(data.server);
      toast.success('Server created!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create server');
    }
  };

  const handleJoinServer = async () => {
    const code = prompt('Invite code:');
    if (!code) return;
    try {
      await serverService.joinServer(code);
      toast.success('Joined server!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join server');
    }
  };

  return (
    <div className="w-[72px] bg-discord-900 flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0">
      <button
        onClick={() => {
          setActiveServer(null);
          setSelectedDmUser(null);
        }}
        className={`w-12 h-12 rounded-2xl bg-brand-500 hover:rounded-xl hover:bg-brand-600 
          flex items-center justify-center transition-all duration-200 flex-shrink-0
          ${!activeServer ? 'rounded-xl' : ''}`}
        title="Direct Messages"
      >
        <img src="/favicon.svg" alt="Home" className="w-6 h-6" />
      </button>

      <div className="w-8 h-[2px] bg-discord-600 rounded-full" />

      {servers.map((server) => (
        <button
          key={server._id}
          onClick={() => {
            setActiveServer(server);
            setSelectedDmUser(null);
          }}
          className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 
            overflow-hidden flex-shrink-0 relative group
            ${activeServer?._id === server._id ? 'rounded-xl' : ''}`}
          title={server.name}
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-discord-600 hover:bg-brand-500 flex items-center justify-center text-white font-semibold text-lg">
              {server.name[0].toUpperCase()}
            </div>
          )}
        </button>
      ))}

      <button
        onClick={handleCreateServer}
        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-discord-600 hover:bg-green-600 
          flex items-center justify-center transition-all duration-200 flex-shrink-0 text-green-500 hover:text-white"
        title="Create Server"
      >
        <Plus size={24} />
      </button>

      <button
        onClick={handleJoinServer}
        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-discord-600 hover:bg-brand-500 
          flex items-center justify-center transition-all duration-200 flex-shrink-0 text-green-500 hover:text-white"
        title="Join Server"
      >
        <Compass size={22} />
      </button>
    </div>
  );
}
