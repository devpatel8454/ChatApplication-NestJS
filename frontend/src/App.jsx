import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { socketService } from './services/socket.service';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';

const API_URL = 'http://localhost:3000';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const AVAILABLE_SERVERS = [
    'http://192.168.29.185:3000',
    'http://192.168.29.185:3001',
    'http://192.168.29.185:3002'
  ];

  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem('serverUrl');
    if (saved && AVAILABLE_SERVERS.includes(saved)) return saved;
    // Randomly pick a server for load balancing
    return AVAILABLE_SERVERS[Math.floor(Math.random() * AVAILABLE_SERVERS.length)];
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (token) {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser) {
        setUser(savedUser);
        initSocket(token, serverUrl);
      }
    }
  }, []);

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && user) {
      setMessages([]); // Clear current messages while loading
      socketService.emit('message:history', { receiverId: selectedUser.id })
        .then((history) => {
          setMessages(history);
        })
        .catch(err => console.error('Failed to fetch history', err));
    }
  }, [selectedUser, user]);

  const initSocket = (token, url) => {
    const socket = socketService.connect(token, url);

    socket.on('connect', () => {
      socketService.emit('user:init').then((users) => {
        setOnlineUsers(users);
      });
    });

    socket.on('user:online', (userData) => {
      setOnlineUsers((prev) => {
        if (prev.find(u => u.id === userData.id)) return prev;
        return [...prev, userData];
      });
    });

    socket.on('user:offline', (userId) => {
      setOnlineUsers((prev) => prev.filter(u => u.id !== userId));
    });

    socket.on('message:new', (msg) => {
      const currentSelected = selectedUserRef.current;
      const currentUser = JSON.parse(localStorage.getItem('user'));

      // Only add message if it belongs to the current conversation
      if (currentSelected && (
        (msg.senderId === currentSelected.id && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && msg.receiverId === currentSelected.id)
      )) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const endpoint = isRegistering ? 'register' : 'login';
      const res = await axios.post(`${serverUrl}/auth/${endpoint}`, { username, password });

      if (isRegistering) {
        setIsRegistering(false);
        alert('Account created! Please sign in.');
        setIsLoading(false);
        return;
      }

      const { access_token, user: userData } = res.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('serverUrl', serverUrl);
      initSocket(access_token, serverUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    socketService.disconnect();
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    socketService.emit('message:send', {
      receiverId: selectedUser.id,
      content: newMessage,
    }).then((msg) => {
      // Message is handled by the socket listener
    });
    setNewMessage('');
  };

  if (!user) {
    return (
      <div className="h-full w-full flex-center p-6 relative">
        <div className="bg-mesh"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass p-10 w-full max-w-md relative"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="avatar mb-4" style={{ width: 64, height: 64, borderRadius: 20 }}>
              <Lucide.Zap size={32} />
            </div>
            <h1 className="heading text-gradient" style={{ fontSize: '32px' }}>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-dim mt-2 text-sm">
              {isRegistering ? 'Join the secure Nexus network' : 'Securely sign in to your workspace'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 glass-bright"
                style={{ borderRadius: 12, borderLeft: '4px solid var(--error)', color: 'var(--error)', fontSize: '13px', fontWeight: 600 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="flex justify-center mb-2">
              <span className="text-xs glass-bright px-3 py-1" style={{ borderRadius: 20, color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}>
                <Lucide.Server size={10} style={{ marginRight: 4, display: 'inline' }} />
                Assigned to {serverUrl.split(':').pop()}
              </span>
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="off"
              />
              <Lucide.User className="icon" size={20} />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lucide.Lock className="icon" size={20} />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full py-4 mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex-center gap-2">
                  <div className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  {isRegistering ? <Lucide.UserPlus size={18} /> : <Lucide.LogIn size={18} />}
                  <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="btn btn-ghost w-full"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex overflow-hidden relative">
      <div className="bg-mesh"></div>

      {/* Sidebar */}
      <div className="sidebar flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="avatar" style={{ width: 36, height: 36, borderRadius: 10 }}>
                <Lucide.Zap size={20} />
              </div>
              <span className="heading" style={{ fontSize: '20px' }}>Nexus</span>
            </div>
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
                <Lucide.Settings size={16} />
              </button>
              <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
                <Lucide.Bell size={16} />
              </button>
            </div>
          </div>

          <div className="glass-bright p-4 flex items-center gap-3" style={{ borderRadius: 16 }}>
            <div className="relative">
              <div className="avatar" style={{ width: 40, height: 40 }}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="status-online absolute" style={{ bottom: -2, right: -2 }}></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user.username}</p>
              <p className="text-xs text-dim">Online</p>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, color: 'var(--error)' }}>
              <Lucide.LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex items-center justify-between px-2 mb-4 mt-2">
            <span className="text-xs text-dim">Direct Messages</span>
            <Lucide.Plus size={14} className="text-dim" style={{ cursor: 'pointer' }} />
          </div>

          <div className="flex flex-col gap-1">
            {onlineUsers.filter(u => u.id !== user.id).map((u) => (
              <motion.div
                key={u.id}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedUser(u)}
                className={`user-item flex items-center gap-3 ${selectedUser?.id === u.id ? 'active' : ''}`}
              >
                <div className="relative">
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: '14px' }}>
                    {(u.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="status-online absolute" style={{ bottom: -1, right: -1 }}></div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate">{u.username || 'User ' + u.id.slice(0, 4)}</p>
                  <p className="text-xs text-dim" style={{ textTransform: 'none', letterSpacing: 'normal' }}>Active now</p>
                </div>
              </motion.div>
            ))}

            {onlineUsers.filter(u => u.id !== user.id).length === 0 && (
              <div className="p-6 text-center">
                <p className="text-xs text-dim">No users online</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col chat-area">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(2, 4, 10, 0.5)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="avatar" style={{ width: 44, height: 44 }}>
                    {(selectedUser.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="status-online absolute" style={{ bottom: 0, right: 0 }}></div>
                </div>
                <div>
                  <h3 className="heading" style={{ fontSize: '18px' }}>{selectedUser.username || 'User ' + selectedUser.id.slice(0, 4)}</h3>
                  <p className="text-xs text-dim" style={{ color: 'var(--success-light)', textTransform: 'none', letterSpacing: 'normal' }}>Secure connection active</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-icon"><Lucide.Phone size={18} /></button>
                <button className="btn btn-ghost btn-icon"><Lucide.Video size={18} /></button>
                <button className="btn btn-ghost btn-icon"><Lucide.Info size={18} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`message-container ${msg.senderId === user.id ? 'sent' : ''}`}>
                      <div className="avatar avatar-sm">
                        {msg.senderId === user.id ? user.username[0].toUpperCase() : (selectedUser.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className={`message-bubble ${msg.senderId === user.id ? 'message-sent' : 'message-received'}`}>
                        {msg.content}
                      </div>
                    </div>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6">
              <form onSubmit={sendMessage} className="glass-bright p-2 flex items-center gap-2" style={{ borderRadius: 24, padding: '8px 12px', maxWidth: '900px', margin: '0 auto' }}>
                <button type="button" className="btn btn-ghost btn-icon" style={{ border: 'none', width: 44, height: 44 }}>
                  <Lucide.PlusCircle size={22} />
                </button>
                <input
                  type="text"
                  placeholder={`Message ${selectedUser.username || 'User'}`}
                  className="flex-1"
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', padding: '12px', fontSize: '15px' }}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <div className="flex items-center gap-1">
                  <button type="button" className="btn btn-ghost btn-icon" style={{ border: 'none', width: 40, height: 40 }}>
                    <Lucide.Smile size={20} />
                  </button>
                  <button type="submit" className="btn btn-primary btn-icon" style={{ borderRadius: 16, width: 44, height: 44 }}>
                    <Lucide.Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex-center flex-col p-10">
            <motion.div
              animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="avatar mb-8"
              style={{ width: 120, height: 120, borderRadius: 40, fontSize: '48px' }}
            >
              <Lucide.MessageSquare size={56} />
            </motion.div>
            <h2 className="heading text-gradient mb-4" style={{ fontSize: '48px' }}>Nexus Workspace</h2>
            <p className="text-dim text-center max-w-sm leading-relaxed" style={{ fontSize: '16px' }}>
              Connect with your team securely. Select a conversation to begin your encrypted communication.
            </p>
            <div className="flex gap-10 mt-16 opacity-20">
              <Lucide.Shield size={28} />
              <Lucide.Zap size={28} />
              <Lucide.Lock size={28} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
