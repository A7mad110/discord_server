import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';

export function useSocket() {
  const token = useStore((s) => s.token);
  const addMessage = useStore((s) => s.addMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const removeMessage = useStore((s) => s.removeMessage);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('message:new', (message) => {
      addMessage(message);
    });

    socket.on('message:updated', (data) => {
      updateMessage(data._id, data);
    });

    socket.on('message:deleted', (data) => {
      removeMessage(data._id);
    });

    socket.on('presence:update', (data) => {
      const user = useStore.getState().user;
      if (user && user._id !== data.userId) {
        // Update friend's status in friends list
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('presence:update');
    };
  }, [token, addMessage, updateMessage, removeMessage]);

  return { getSocket };
}
