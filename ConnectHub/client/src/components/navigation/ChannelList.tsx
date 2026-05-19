import React, { useState, useEffect } from 'react';
import { Hash, Volume2, Plus, ChevronDown, ChevronRight, Settings, UserPlus, Copy, Check, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { serverService } from '../../services/servers';
import { Modal } from '../common/Modal';
import toast from 'react-hot-toast';

export function ChannelList() {
  const activeServer = useStore((s) => s.activeServer);
  const activeChannel = useStore((s) => s.activeChannel);
  const setActiveChannel = useStore((s) => s.setActiveChannel);
  const user = useStore((s) => s.user);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverDesc, setServerDesc] = useState('');

  useEffect(() => {
    if (activeServer) {
      setServerName(activeServer.name);
      setServerDesc(activeServer.description || '');
    }
  }, [activeServer?._id]);

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateChannel = async () => {
    if (!activeServer || !newChannelName) return;
    try {
      await serverService.createChannel(activeServer._id, {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: newChannelType,
      });
      const { data } = await serverService.getServer(activeServer._id);
      useStore.getState().setActiveServer(data.server);
      toast.success('Channel created!');
      setShowCreateChannel(false);
      setNewChannelName('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create channel');
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeServer) return;
    try {
      const { data } = await serverService.createInvite(activeServer._id);
      setInviteCode(data.inviteCode);
    } catch (error: any) {
      toast.error('Failed to generate invite');
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateServer = async () => {
    if (!activeServer) return;
    try {
      const formData = new FormData();
      formData.append('name', serverName);
      formData.append('description', serverDesc);
      await serverService.updateServer(activeServer._id, formData);
      toast.success('Server updated!');
      setShowSettings(false);
    } catch (error: any) {
      toast.error('Failed to update server');
    }
  };

  const handleDeleteServer = async () => {
    if (!activeServer || !confirm('Delete this server permanently?')) return;
    try {
      await serverService.deleteServer(activeServer._id);
      useStore.getState().removeServer(activeServer._id);
      useStore.getState().setActiveServer(null);
      toast.success('Server deleted');
      setShowSettings(false);
    } catch {
      toast.error('Failed to delete server');
    }
  };

  const channels = activeServer?.channels || [];
  const categories = activeServer?.categories || [];
  const uncategorizedChannels = channels.filter((c) => !c.category);

  const renderChannel = (channel: any) => (
    <button
      key={channel._id}
      onClick={() => setActiveChannel(channel)}
      className={`channel-item w-full ${activeChannel?._id === channel._id ? 'channel-item-active' : ''}`}
    >
      {channel.type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
      <span className="truncate">{channel.name}</span>
    </button>
  );

  return (
    <div className="w-60 bg-discord-800 flex flex-col flex-shrink-0">
      <div className="h-12 px-4 flex items-center justify-between border-b border-discord-600 shadow-sm">
        <h3 className="font-semibold text-white truncate">{activeServer?.name || 'ConnectHub'}</h3>
        {activeServer && (
          <div className="flex items-center gap-1">
            <button onClick={() => setShowInvite(true)} className="text-gray-400 hover:text-white p-1" title="Invite People">
              <UserPlus size={18} />
            </button>
            <button onClick={() => setShowCreateChannel(true)} className="text-gray-400 hover:text-white p-1" title="Create Channel">
              <Plus size={18} />
            </button>
            <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-1" title="Server Settings">
              <Settings size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 py-1">Channels</div>
        {categories.map((cat) => (
          <div key={cat.name}>
            <button onClick={() => toggleCategory(cat.name)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide w-full px-1 py-1 hover:text-gray-200"
            >
              {collapsedCategories.has(cat.name) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {cat.name}
            </button>
            {!collapsedCategories.has(cat.name) && (
              <div className="ml-1">{channels.filter((c) => c.category === cat.name).map(renderChannel)}</div>
            )}
          </div>
        ))}
        {uncategorizedChannels.map(renderChannel)}
      </div>

      <Modal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} title="Create Channel">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Channel Type</label>
            <div className="flex gap-2">
              <button onClick={() => setNewChannelType('text')}
                className={`flex-1 p-2 rounded-lg border text-sm ${newChannelType === 'text' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-discord-500 text-gray-400'}`}>
                <Hash size={16} className="inline mr-1" /> Text
              </button>
              <button onClick={() => setNewChannelType('voice')}
                className={`flex-1 p-2 rounded-lg border text-sm ${newChannelType === 'voice' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-discord-500 text-gray-400'}`}>
                <Volume2 size={16} className="inline mr-1" /> Voice
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Channel Name</label>
            <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
              className="input" placeholder="new-channel" />
          </div>
          <button onClick={handleCreateChannel} className="btn-primary w-full">Create Channel</button>
        </div>
      </Modal>

      <Modal isOpen={showInvite} onClose={() => { setShowInvite(false); setInviteCode(''); }} title="Invite People">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Generate an invite code to share with your friends.</p>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <input type="text" value={inviteCode} readOnly className="input flex-1 text-center font-mono text-lg" />
              <button onClick={handleCopyInvite} className="btn-primary p-3">
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateInvite} className="btn-primary w-full">
              Generate Invite Code
            </button>
          )}
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Server Settings" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
            <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea value={serverDesc} onChange={(e) => setServerDesc(e.target.value)} className="input" rows={3} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdateServer} className="btn-primary flex-1">Save Changes</button>
            <button onClick={handleDeleteServer} className="btn-danger flex items-center gap-2">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
