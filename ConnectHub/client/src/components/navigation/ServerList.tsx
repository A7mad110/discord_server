import React, { useState } from 'react';
import { Plus, Compass } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { serverService } from '../../services/servers';
import { Modal } from '../common/Modal';
import toast from 'react-hot-toast';

export function ServerList() {
  const servers = useStore((s) => s.servers);
  const activeServer = useStore((s) => s.activeServer);
  const setActiveServer = useStore((s) => s.setActiveServer);
  const setSelectedDmUser = useStore((s) => s.setSelectedDmUser);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [serverName, setServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateServer = async () => {
    if (!serverName) return;
    setLoading(true);
    try {
      const { data } = await serverService.createServer({ name: serverName });
      const serverRes = await serverService.getServer(data.server._id);
      useStore.getState().addServer(serverRes.data.server);
      setActiveServer(serverRes.data.server);
      toast.success('Server created!');
      setShowCreate(false);
      setServerName('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinServer = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      await serverService.joinServer(inviteCode);
      toast.success('Joined server!');
      setShowJoin(false);
      setInviteCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join server');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectServer = async (server: any) => {
    try {
      const { data } = await serverService.getServer(server._id);
      setActiveServer(data.server);
      setSelectedDmUser(null);
    } catch {
      setActiveServer(server);
      setSelectedDmUser(null);
    }
  };

  return (
    <>
      <div className="w-[72px] bg-discord-900 flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0">
        <button
          onClick={() => { setActiveServer(null); setSelectedDmUser(null); }}
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
            onClick={() => handleSelectServer(server)}
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
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 rounded-2xl hover:rounded-xl bg-discord-600 hover:bg-green-600 
            flex items-center justify-center transition-all duration-200 flex-shrink-0 text-green-500 hover:text-white"
          title="Create Server"
        >
          <Plus size={24} />
        </button>

        <button
          onClick={() => setShowJoin(true)}
          className="w-12 h-12 rounded-2xl hover:rounded-xl bg-discord-600 hover:bg-brand-500 
            flex items-center justify-center transition-all duration-200 flex-shrink-0 text-green-500 hover:text-white"
          title="Join Server"
        >
          <Compass size={22} />
        </button>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Server">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
            <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)}
              className="input" placeholder="My Server" maxLength={100} required />
          </div>
          <button onClick={handleCreateServer} disabled={loading || !serverName} className="btn-primary w-full">
            {loading ? 'Creating...' : 'Create Server'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join Server">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Invite Code</label>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
              className="input" placeholder="Enter invite code" required />
          </div>
          <button onClick={handleJoinServer} disabled={loading || !inviteCode} className="btn-primary w-full">
            {loading ? 'Joining...' : 'Join Server'}
          </button>
        </div>
      </Modal>
    </>
  );
}
