import React, { useState, useEffect, useRef } from 'react';
import { Channel, Message, WorkspaceUser } from '../types';
import { 
  Send, 
  Smile, 
  MessageSquare, 
  Hash, 
  Globe, 
  Layers, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  UserCheck2,
  AlertCircle
} from 'lucide-react';

interface ChatViewProps {
  channel: Channel | null;
  messages: Message[];
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onSendMessage: (text: string) => void;
  onSendReply: (messageId: string, replyText: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onStartTyping: () => void;
}

export default function ChatView({
  channel,
  messages,
  users,
  currentUser,
  onSendMessage,
  onSendReply,
  onToggleReaction,
  onStartTyping
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [threadReplyText, setThreadReplyText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, channel]);

  // Keep active thread referenced logically to update with real-time socket updates
  const syncedThreadMessage = activeThreadMessage 
    ? messages.find(m => m.id === activeThreadMessage.id) || activeThreadMessage 
    : null;

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [syncedThreadMessage?.replies]);

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center" id="empty-chat-state">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
          <Hash size={30} />
        </div>
        <h3 className="font-display font-medium text-lg text-slate-100">Establish Active Comm Channel</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select or initialize a communication pipeline from the sidebar to start corresponding with team nodes.
        </p>
      </div>
    );
  }

  // Find user utility
  const getUserProfile = (userId: string): WorkspaceUser => {
    return users.find(u => u.id === userId) || {
      id: userId,
      name: 'Unknown Agent',
      role: 'Guest Node',
      color: '#64748B',
      avatar: '👤',
      online: false
    };
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (threadReplyText.trim() && syncedThreadMessage) {
      onSendReply(syncedThreadMessage.id, threadReplyText.trim());
      setThreadReplyText('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onStartTyping();
  };

  // Typing alerts calculation
  const typingUsers = users
    .filter(u => u.typingIn === channel.id && u.id !== currentUser?.id)
    .map(u => u.name);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const chatMessages = messages.filter(m => m.channelId === channel.id);

  return (
    <div className="flex-1 flex bg-slate-950/20 overflow-hidden font-sans h-full text-slate-200" id={`chatpanel-${channel.id}`}>
      {/* Primary Message Lane */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-slate-900 bg-slate-950/40">
        
        {/* Active Channel Header banner */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/40 backdrop-blur-sm shrink-0">
          <div>
            <div className="flex items-center space-x-1.5">
              <Hash size={16} className="text-blue-500" />
              <h2 className="font-display font-semibold text-sm text-white capitalize">{channel.name}</h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs sm:max-w-lg truncate font-mono">
              {channel.description || 'Enterprise project alignment feed.'}
            </p>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
              {chatMessages.length} Messages
            </span>
          </div>
        </div>

        {/* Message Feeds Container */}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-850 bg-slate-950/10 rounded-xl p-6 text-center">
              <Smile size={24} className="text-slate-500 mb-2" />
              <p className="text-xs text-slate-300 font-medium">Channel ledger is empty</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Let your team colleagues know you are online!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const sender = getUserProfile(msg.userId);
              return (
                <div key={msg.id} className="group flex items-start space-x-2.5 sm:space-x-3.5 p-1.5 sm:p-2 rounded-lg hover:bg-slate-900/20 transition duration-150" id={`chat-msg-${msg.id}`}>
                  {/* Sender Avatar */}
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg shadow-sm border shrink-0 transition"
                    style={{ backgroundColor: `${sender.color}20`, borderColor: `${sender.color}40` }}
                  >
                    {sender.avatar}
                  </div>

                  {/* Message Content Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs font-semibold text-slate-100 hover:underline cursor-pointer">{sender.name}</span>
                      <span className="text-[9px] sm:text-[10px] font-mono bg-slate-900 text-slate-400 px-1 py-0.5 rounded border border-slate-800-40">
                        {sender.role}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words font-sans">{msg.text}</p>
                    
                    {/* Reactions Pill Block */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, reactors]) => {
                          const hasReacted = currentUser && reactors.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => currentUser && onToggleReaction(msg.id, emoji)}
                              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition duration-100 ${
                                hasReacted 
                                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold' 
                                  : 'bg-slate-900/60 border border-slate-850 text-slate-400 hover:border-slate-700 hover:text-white'
                              }`}
                              title={`Reactors: ${reactors.map(rid => getUserProfile(rid).name).join(', ')}`}
                            >
                              <span>{emoji}</span>
                              <span>{reactors.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Meta Thread Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition duration-150">
                      <button 
                        onClick={() => setActiveThreadMessage(msg)}
                        className="flex items-center space-x-1.25 text-[10px] bg-slate-900/40 md:bg-transparent border border-slate-800/80 md:border-none px-2 py-1 md:p-0 rounded-md font-mono text-slate-300 hover:text-white transition"
                        title="Open sub-thread replies"
                        id={`thread-trigger-${msg.id}`}
                      >
                        <MessageSquare size={11} />
                        <span>{msg.replies && msg.replies.length > 0 ? `${msg.replies.length} Replies` : 'Reply Thread'}</span>
                      </button>

                      {/* Emojis Pickers (Standard presets for cleanliness) */}
                      <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800/80 px-1.5 py-0.5 rounded-full shadow">
                        {['👍', '🔥', '🚀', '👀', '🎉'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => currentUser && onToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition duration-100 text-[10px] px-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Real-time typing alerts */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-1.5 bg-slate-950/20 text-[10px] font-mono text-indigo-400 flex items-center space-x-1">
            <span className="flex space-x-0.5 shrink-0">
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        {/* Input Form Bar */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/70">
          {currentUser ? (
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="text"
                placeholder={`Type a message in #${channel.name}...`}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500"
                id="message-input-box"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className={`p-1.5 rounded-lg transition duration-150 ${
                  inputText.trim() 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/25' 
                    : 'text-slate-600 pointer-events-none'
                }`}
                id="message-send-btn"
              >
                <Send size={14} />
              </button>
            </form>
          ) : (
            <div className="bg-slate-900/60 p-3 rounded-lg flex items-center justify-center space-x-2 border border-dashed border-slate-800">
              <AlertCircle size={15} className="text-amber-500" />
              <span className="text-xs text-slate-400">Please choose a simulated profile in the sidebar to send messages.</span>
            </div>
          )}
        </div>
      </div>

      {/* Slack-like Threaded Sidepanel Drawer */}
      {syncedThreadMessage && (
        <>
          {/* Thread backdrop on mobile overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-25 md:hidden"
            onClick={() => setActiveThreadMessage(null)}
          />
          <div 
            className="fixed inset-y-0 right-0 z-30 w-full sm:w-96 md:relative md:z-auto md:w-80 border-l border-slate-900 flex flex-col bg-slate-900 md:bg-slate-900/20 h-full overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200" 
            id="thread-panel"
          >
          
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <MessageSquare size={14} className="text-indigo-400" />
              <h3 className="font-display font-semibold text-xs text-white">Thread Conversation</h3>
            </div>
            <button 
              onClick={() => setActiveThreadMessage(null)}
              className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
              id="close-thread-btn"
            >
              Close
            </button>
          </div>

          {/* Root Message Segment */}
          <div className="p-4 border-b border-slate-950/60 bg-slate-950/20">
            <div className="flex items-center space-x-2.5 mb-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-md select-none border border-slate-800"
                style={{ backgroundColor: `${getUserProfile(syncedThreadMessage.userId).color}15` }}
              >
                {getUserProfile(syncedThreadMessage.userId).avatar}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-100">{getUserProfile(syncedThreadMessage.userId).name}</span>
                <p className="text-[8px] font-mono text-slate-400">{formatTime(syncedThreadMessage.timestamp)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded border border-slate-850 leading-relaxed break-words font-sans">
              {syncedThreadMessage.text}
            </p>
          </div>

          {/* Thread Replies List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <p className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">REPLIES ({syncedThreadMessage.replies?.length || 0})</p>
            {!syncedThreadMessage.replies || syncedThreadMessage.replies.length === 0 ? (
              <p className="text-[10px] font-sans text-slate-500 italic">No responses posted. Be the first!</p>
            ) : (
              syncedThreadMessage.replies.map((reply) => {
                const author = getUserProfile(reply.userId);
                return (
                  <div key={reply.id} className="flex items-start space-x-2.5 p-1.5 rounded bg-slate-950/10">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs select-none border shrink-0"
                      style={{ backgroundColor: `${author.color}10`, borderColor: `${author.color}20` }}
                    >
                      {author.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-semibold text-slate-200">{author.name}</span>
                        <span className="text-[8px] font-mono text-slate-500">{formatTime(reply.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words font-sans">{reply.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Reply Form Footer */}
          <div className="p-3 border-t border-slate-900 bg-slate-950/80">
            {currentUser ? (
              <form onSubmit={handleSendReply} className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                <input
                  type="text"
                  placeholder="Post reply..."
                  value={threadReplyText}
                  onChange={(e) => setThreadReplyText(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500"
                  id="thread-input-box"
                />
                <button 
                  type="submit" 
                  disabled={!threadReplyText.trim()}
                  className={`p-1 rounded-md transition duration-150 ${
                    threadReplyText.trim() 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-900/40' 
                      : 'text-slate-600 pointer-events-none'
                  }`}
                  id="thread-reply-send-btn"
                >
                  <Send size={11} />
                </button>
              </form>
            ) : (
              <span className="text-[10px] text-slate-500">Log in simulator to post.</span>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
