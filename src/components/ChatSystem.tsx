import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Users, Settings, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ChatRoom {
  id: string;
  name: string;
  room_type: 'admin' | 'producer' | 'mixed';
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender: {
    first_name: string;
    last_name: string;
    email: string;
  };
  message: string;
  created_at: string;
  is_system_message: boolean;
}

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string, type: 'admin' | 'producer' | 'mixed') => Promise<void>;
}

function CreateRoomDialog({ isOpen, onClose, onCreateRoom }: CreateRoomDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'admin' | 'producer' | 'mixed'>('mixed');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onCreateRoom(name, type);
      setName('');
      onClose();
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Create Chat Room</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'admin' | 'producer' | 'mixed')}
              className="w-full"
              required
            >
              <option value="mixed">Mixed (All Users)</option>
              <option value="admin">Admin Only</option>
              <option value="producer">Producers Only</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ChatSystem() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchRooms();
      subscribeToRooms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedRoom) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          created_at,
          is_system_message,
          sender:profiles!sender_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToRooms = () => {
    const subscription = supabase
      .channel('room_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms'
      }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToMessages = () => {
    if (!selectedRoom) return;

    const subscription = supabase
      .channel(`room_${selectedRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${selectedRoom.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleCreateRoom = async (name: string, type: 'admin' | 'producer' | 'mixed') => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          room_type: type,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setRooms([data, ...rooms]);
        setSelectedRoom(data);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: user?.id,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Chat</h1>
          <button
            onClick={() => setShowCreateRoom(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Room
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Chat Rooms</h2>
            <div className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full p-3 rounded-lg transition-colors ${
                    selectedRoom?.id === room.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="truncate">{room.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            {selectedRoom ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 h-[600px] flex flex-col">
                <div className="p-4 border-b border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{selectedRoom.name}</h3>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender.email === user?.email ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender.email === user?.email
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {message.is_system_message ? (
                          <p className="text-sm italic text-gray-400">{message.message}</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium mb-1">
                              {message.sender.first_name} {message.sender.last_name}
                            </p>
                            <p>{message.message}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-500/20">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Select a chat room to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateRoomDialog
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}