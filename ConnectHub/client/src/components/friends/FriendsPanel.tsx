import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, X, UserMinus, UserCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { friendService } from '../../services/friends';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';
import toast from 'react-hot-toast';

export function FriendsPanel() {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'blocked' | 'add'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const friends = useStore((s) => s.friends);
  const pendingRequests = useStore((s) => s.pendingRequests);
  const setFriends = useStore((s) => s.setFriends);
  const setPendingRequests = useStore((s) => s.setPendingRequests);
  const setSelectedDmUser = useStore((s) => s.setSelectedDmUser);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const { data } = await friendService.getFriends();
      setFriends(data.friends);
      setPendingRequests(data.pendingRequests);
    } catch {
      // Handle error
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await friendService.searchUsers(query);
      setSearchResults(data.users);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (usernameOrId: string) => {
    try {
      await friendService.sendRequest(usernameOrId);
      toast.success('Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendService.acceptRequest(requestId);
      toast.success('Friend request accepted!');
      loadFriends();
    } catch (error: any) {
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await friendService.declineRequest(requestId);
      loadFriends();
    } catch {
      toast.error('Failed to decline request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await friendService.removeFriend(friendId);
      toast.success('Friend removed');
      loadFriends();
    } catch {
      toast.error('Failed to remove friend');
    }
  };

  const tabs = [
    { key: 'online', label: 'Online' },
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'add', label: 'Add Friend' },
  ] as const;

  const filteredFriends = friends.filter((f) => {
    if (activeTab === 'online') return f.status === 'online';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-discord-800">
      <div className="h-12 px-4 flex items-center border-b border-discord-600">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search friends or add by username"
            className="w-full bg-discord-700 text-white placeholder-gray-400 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b border-discord-600">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-discord-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-discord-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'add' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Add Friend</h3>
              <p className="text-sm text-gray-400 mb-4">You can add a friend with their username or unique ID.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Enter username or unique ID"
                  className="input flex-1"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-3 bg-discord-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar} username={user.username} status={user.status} />
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-gray-400">{user.uniqueId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user.username)}
                      className="btn-primary text-sm flex items-center gap-1"
                    >
                      <UserPlus size={16} /> Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No pending friend requests</p>
            ) : (
              pendingRequests.map((req: any) => (
                <div key={req._id} className="flex items-center justify-between p-3 bg-discord-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar src={req.from?.avatar} username={req.from?.username} />
                    <div>
                      <p className="font-medium text-white">{req.from?.username}</p>
                      <p className="text-xs text-gray-400">{req.from?.uniqueId}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req._id)}
                      className="btn-primary text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req._id)}
                      className="btn-secondary text-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab !== 'add' && activeTab !== 'pending' && (
          <div className="space-y-1">
            {filteredFriends.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {activeTab === 'online' ? 'No friends online' : 'No friends yet'}
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-700 group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={friend.avatar} username={friend.username} status={friend.status} />
                    <div>
                      <p className="font-medium text-white">{friend.username}</p>
                      <p className="text-xs text-gray-400 capitalize">{friend.status}</p>
                    </div>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDmUser(friend)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-discord-600 rounded"
                      title="Message"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend._id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-discord-600 rounded"
                      title="Remove Friend"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
