import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  GlobalState, 
  WorkspaceUser, 
  Channel, 
  Message, 
  Project, 
  Task, 
  WhiteboardElement, 
  CollaborativeDocument,
  CalendarEvent
} from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import BoardView from './components/BoardView';
import DocumentView from './components/DocumentView';
import WhiteboardView from './components/WhiteboardView';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import { 
  Columns, 
  Sparkles, 
  AlertCircle, 
  Activity, 
  HelpCircle, 
  Tv,
  ExternalLink,
  Github,
  Monitor,
  Menu
} from 'lucide-react';

export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<'chat' | 'board' | 'document' | 'whiteboard' | 'dashboard' | 'calendar'>('dashboard');
  
  // Real database-backed states
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [document, setDocument] = useState<CollaborativeDocument>({ text: '', version: 0 });
  const [whiteboard, setWhiteboard] = useState<WhiteboardElement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Navigation targets
  const [activeChannelId, setActiveChannelId] = useState<string | null>('ch-general');
  const [activeProjectId, setActiveProjectId] = useState<string | null>('proj-1');

  // Multi-user Multi-Persona Split Simulator States
  const [isSplitSandboxMode, setIsSplitSandboxMode] = useState(false);
  const [leftUser, setLeftUser] = useState<WorkspaceUser | null>(null);
  const [rightUser, setRightUser] = useState<WorkspaceUser | null>(null);

  // Active user when NOT in split mode (Standard single browser mode)
  const [singleUser, setSingleUser] = useState<WorkspaceUser | null>(null);

  // Mobile navigation drawer toggling states
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLeftMobileOpen, setIsLeftMobileOpen] = useState(false);
  const [isRightMobileOpen, setIsRightMobileOpen] = useState(false);

  // Socket instance client
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // 1. Establish Socket Connection & register global listeners
  useEffect(() => {
    // Connect to same origin standard socket
    const socketInstance = io(window.location.origin, {
      reconnectionDelayMax: 10000,
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket pipeline synchronized with Express cluster');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    // Receive full synced database from server upon handshake
    socketInstance.on('state:init', (db: GlobalState) => {
      setUsers(db.users);
      setChannels(db.channels);
      setMessages(db.messages);
      setProjects(db.projects);
      setTasks(db.tasks);
      setDocument(db.document);
      setWhiteboard(db.whiteboard);
      if (db.calendarEvents) {
        setCalendarEvents(db.calendarEvents);
      }

      // Default first active user
      if (db.users.length > 0) {
        setSingleUser(db.users[0]);
        setLeftUser(db.users[0]);
        setRightUser(db.users[1]);
        
        // Log user online automatically
        socketInstance.emit('user:login', { userId: db.users[0].id });
      }
    });

    // Sync team presence
    socketInstance.on('user:presence', (updatedUsers: WorkspaceUser[]) => {
      setUsers(updatedUsers);
    });

    socketInstance.on('user:typing_updated', ({ userId, channelId }: { userId: string, channelId: string | undefined }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, typingIn: channelId } : u));
    });

    // Real-time Messages Handler
    socketInstance.on('message:new', (msg: Message) => {
      setMessages(prev => {
        // Idempotency: skip if already present
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socketInstance.on('message:updated', (updatedMsg: Message) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    });

    // Kanban Board Card handlers
    socketInstance.on('task:created', (newTask: Task) => {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    });

    socketInstance.on('task:updated', (updatedTask: Task) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    socketInstance.on('task:deleted', ({ taskId }: { taskId: string }) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    });

    socketInstance.on('project:created', (newProj: Project) => {
      setProjects(prev => {
        if (prev.some(p => p.id === newProj.id)) return prev;
        return [...prev, newProj];
      });
    });

    // Document typing handler
    socketInstance.on('doc:updated', (doc: CollaborativeDocument) => {
      setDocument(doc);
    });

    // Whiteboard Element events
    socketInstance.on('whiteboard:element_added', (element: WhiteboardElement) => {
      setWhiteboard(prev => {
        if (prev.some(e => e.id === element.id)) return prev;
        return [...prev, element];
      });
    });

    socketInstance.on('whiteboard:element_updated', (updatedElement: WhiteboardElement) => {
      setWhiteboard(prev => prev.map(e => e.id === updatedElement.id ? updatedElement : e));
    });

    socketInstance.on('whiteboard:cleared', () => {
      setWhiteboard([]);
    });

    socketInstance.on('calendar:created', (evt: CalendarEvent) => {
      setCalendarEvents(prev => {
        if (prev.some(e => e.id === evt.id)) return prev;
        return [...prev, evt];
      });
    });

    socketInstance.on('calendar:deleted', ({ id }: { id: string }) => {
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
    });

    socketInstance.on('calendar:updated', (updatedEvt: CalendarEvent) => {
      setCalendarEvents(prev => prev.map(e => e.id === updatedEvt.id ? updatedEvt : e));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // 2. Client dispatch event actions on socket
  const handleSendMessage = (text: string, userId: string) => {
    if (socket && activeChannelId) {
      socket.emit('message:send', {
        channelId: activeChannelId,
        userId,
        text
      });
    }
  };

  const handleSendReply = (messageId: string, replyText: string, userId: string) => {
    if (socket) {
      socket.emit('message:reply', {
        messageId,
        userId,
        text: replyText
      });
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string, userId: string) => {
    if (socket) {
      socket.emit('message:react', {
        messageId,
        userId,
        emoji
      });
    }
  };

  const handleStartTyping = (userId: string) => {
    if (socket && activeChannelId) {
      socket.emit('user:typing', {
        userId,
        channelId: activeChannelId
      });
    }
  };

  // Agile Kanban Task Updates
  const handleCreateTask = (taskArgs: Omit<Task, 'comments'>) => {
    if (socket) {
      socket.emit('task:create', taskArgs);
    }
  };

  const handleUpdateTask = (task: Task) => {
    if (socket) {
      socket.emit('task:update', task);
    }
  };

  const handleCommentOnTask = (taskId: string, text: string, userId: string) => {
    if (socket) {
      socket.emit('task:comment', {
        taskId,
        userId,
        text
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (socket) {
      socket.emit('task:delete', { taskId });
    }
  };

  const handleAddProject = (name: string, desc: string) => {
    if (socket) {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name,
        description: desc
      };
      socket.emit('project:create', newProj);
      setActiveProjectId(newProj.id);
    }
  };

  const handleAddChannel = (name: string, desc: string) => {
    if (socket) {
      const newCh: Channel = {
        id: `ch-${Date.now()}`,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description: desc
      };
      // We can create standard channels through a project expansion.
      // For sandbox versatility, let's insert newly created channels in dbState:
      // Let's implement socket-side client append logic:
      setChannels(prev => [...prev, newCh]); 
      setActiveChannelId(newCh.id);
    }
  };

  // Shared Document Update Revision sync
  const handleUpdateDocument = (text: string, userId: string) => {
    if (socket) {
      socket.emit('doc:update', { text, userId });
    }
  };

  // Canvas Whiteboard elements updates
  const handleAddWhiteboardElement = (element: WhiteboardElement) => {
    if (socket) {
      socket.emit('whiteboard:element_added', element);
      // Optimistic local push
      setWhiteboard(prev => [...prev, element]);
    }
  };

  const handleUpdateWhiteboardElement = (element: WhiteboardElement) => {
    if (socket) {
      socket.emit('whiteboard:element_updated', element);
      // Optimistic local update
      setWhiteboard(prev => prev.map(e => e.id === element.id ? element : e));
    }
  };

  const handleClearWhiteboard = () => {
    if (socket) {
      socket.emit('whiteboard:clear');
    }
  };

  // Collaborative Event Scheduler sync
  const handleAddCalendarEvent = (event: CalendarEvent) => {
    if (socket) {
      socket.emit('calendar:create', event);
      // Optimistic local push
      setCalendarEvents(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event];
      });
    }
  };

  const handleDeleteCalendarEvent = (id: string) => {
    if (socket) {
      socket.emit('calendar:delete', { id });
      // Optimistic local update
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleUpdateCalendarEvent = (event: CalendarEvent) => {
    if (socket) {
      socket.emit('calendar:update', event);
      // Optimistic local update
      setCalendarEvents(prev => prev.map(e => e.id === event.id ? event : e));
    }
  };

  // Identity Switch logic
  const handleSwitchUser = (userId: string, isLeft: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (isSplitSandboxMode) {
      if (isLeft) {
        setLeftUser(user);
      } else {
        setRightUser(user);
      }
    } else {
      setSingleUser(user);
    }
    
    if (socket) {
      socket.emit('user:login', { userId });
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Platform Banner Header */}
      <header className="px-4 md:px-6 py-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3 min-w-0">
          {!isSplitSandboxMode && (
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition shrink-0"
              id="mobile-nav-toggle-btn"
            >
              <Menu size={15} />
            </button>
          )}
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-display font-black text-white text-xs shrink-0">
            🏢
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xs text-white tracking-wide truncate max-w-[145px] sm:max-w-none">Enterprise Collaboration Suite</h1>
            <p className="text-[10px] font-mono text-slate-400 hidden sm:block">REST Client & WebSocket SocketGateway Active</p>
          </div>
        </div>

        {/* Real-time sync signals and split tester switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
          {/* Socket cluster status light flag */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-1 sm:px-3 rounded-full text-[10px] font-mono font-semibold">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className={`${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className="hidden sm:inline">{connected ? 'WS CONNECTED' : 'WS OFFLINE'}</span>
              <span className="sm:hidden">{connected ? 'WS' : 'OFF'}</span>
            </span>
          </div>

          {/* Multiplayer Switch control trigger */}
          <button
            onClick={() => {
              setIsSplitSandboxMode(!isSplitSandboxMode);
              if (socket && users.length > 1) {
                // Ensure users are marked logged in on the server
                socket.emit('user:login', { userId: users[0].id });
                socket.emit('user:login', { userId: users[1].id });
              }
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1.25 sm:px-3 rounded-lg text-[10px] font-mono font-bold border transition duration-150 shrink-0 ${
              isSplitSandboxMode 
                ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-800/40' 
                : 'bg-slate-900 border-slate-800 text-slate-350 hover:border-slate-700 hover:text-white'
            }`}
            id="split-sandbox-toggle"
            title="Open side-by-side simulator panes to test real-time WebSocket events instantly!"
          >
            <Monitor size={12} className="shrink-0" />
            <span>
              <span className="hidden sm:inline">{isSplitSandboxMode ? "SINGLE SUITE VIEW" : "🎮 CO-OP MULTIPLAYER SPLIT"}</span>
              <span className="sm:hidden">{isSplitSandboxMode ? "SINGLE" : "🎮 SPLIT"}</span>
            </span>
          </button>
        </div>
      </header>

      {/* Main Suite Lane segment */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Render split pane multiplayer simulation browser */}
        {isSplitSandboxMode ? (
          <div className="flex-1 flex flex-col lg:flex-row divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-blue-900/40 h-full overflow-hidden" id="split-sandbox-viewport">
            
            {/* Left Frame Persona A */}
            <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
              <div className="bg-slate-900/90 border-b border-slate-950 px-4 py-1.5 flex items-center justify-between font-mono text-[10px] text-blue-400 shrink-0 select-none">
                <span className="font-bold flex items-center">
                  <button
                    onClick={() => setIsLeftMobileOpen(!isLeftMobileOpen)}
                    className="md:hidden p-1 mr-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                  >
                    <Menu size={11} />
                  </button>
                  💻 CLIENT INSTANCE A (Left)
                </span>
                <span className="text-slate-200">
                  Role: <strong className="text-white">{leftUser?.name}</strong>
                </span>
              </div>
              
              <div className="flex-1 flex overflow-hidden relative">
                <Sidebar 
                  users={users}
                  channels={channels}
                  projects={projects}
                  currentUser={leftUser}
                  activeChannel={activeChannelId}
                  activeProject={activeProjectId}
                  activeView={activeTab}
                  onSelectChannel={setActiveChannelId}
                  onSelectProject={setActiveProjectId}
                  onSelectView={setActiveTab}
                  onSwitchUser={(uid) => handleSwitchUser(uid, true)}
                  onAddChannel={handleAddChannel}
                  onAddProject={handleAddProject}
                  isMobileOpen={isLeftMobileOpen}
                  onCloseMobile={() => setIsLeftMobileOpen(false)}
                />
                
                <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/10">
                  {activeTab === 'dashboard' && (
                    <DashboardView 
                      tasks={tasks}
                      messages={messages}
                      channels={channels}
                      projects={projects}
                      whiteboard={whiteboard}
                      document={document}
                      users={users}
                      currentUser={leftUser}
                      onSelectView={setActiveTab}
                      onSelectProject={setActiveProjectId}
                      onSelectChannel={setActiveChannelId}
                    />
                  )}
                  {activeTab === 'calendar' && (
                    <CalendarView 
                      events={calendarEvents}
                      users={users}
                      currentUser={leftUser}
                      onAddEvent={handleAddCalendarEvent}
                      onDeleteEvent={handleDeleteCalendarEvent}
                      onUpdateEvent={handleUpdateCalendarEvent}
                    />
                  )}
                  {activeTab === 'chat' && (
                    <ChatView 
                      channel={channels.find(c => c.id === activeChannelId) || null}
                      messages={messages}
                      users={users}
                      currentUser={leftUser}
                      onSendMessage={(txt) => handleSendMessage(txt, leftUser?.id || '')}
                      onSendReply={(mid, rtxt) => handleSendReply(mid, rtxt, leftUser?.id || '')}
                      onToggleReaction={(mid, emo) => handleToggleReaction(mid, emo, leftUser?.id || '')}
                      onStartTyping={() => handleStartTyping(leftUser?.id || '')}
                    />
                  )}
                  {activeTab === 'board' && (
                    <BoardView 
                      project={projects.find(p => p.id === activeProjectId) || null}
                      tasks={tasks}
                      users={users}
                      currentUser={leftUser}
                      onCreateTask={handleCreateTask}
                      onUpdateTask={handleUpdateTask}
                      onCommentOnTask={(tid, text) => handleCommentOnTask(tid, text, leftUser?.id || '')}
                      onDeleteTask={handleDeleteTask}
                    />
                  )}
                  {activeTab === 'document' && (
                    <DocumentView 
                      document={document}
                      users={users}
                      currentUser={leftUser}
                      onUpdateDocument={(txt) => handleUpdateDocument(txt, leftUser?.id || '')}
                    />
                  )}
                  {activeTab === 'whiteboard' && (
                    <WhiteboardView 
                      elements={whiteboard}
                      users={users}
                      currentUser={leftUser}
                      onAddElement={handleAddWhiteboardElement}
                      onUpdateElement={handleUpdateWhiteboardElement}
                      onClearWhiteboard={handleClearWhiteboard}
                    />
                  )}
                </main>
              </div>
            </div>

            {/* Right Frame Persona B */}
            <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
              <div className="bg-slate-900/90 border-b border-slate-950 px-4 py-1.5 flex items-center justify-between font-mono text-[10px] text-pink-400 shrink-0 select-none">
                <span className="font-bold flex items-center">
                  <button
                    onClick={() => setIsRightMobileOpen(!isRightMobileOpen)}
                    className="md:hidden p-1 mr-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                  >
                    <Menu size={11} />
                  </button>
                  🌐 CLIENT INSTANCE B (Right)
                </span>
                <span className="text-slate-200">
                  Role: <strong className="text-white">{rightUser?.name}</strong>
                </span>
              </div>
              
              <div className="flex-1 flex overflow-hidden relative">
                <Sidebar 
                  users={users}
                  channels={channels}
                  projects={projects}
                  currentUser={rightUser}
                  activeChannel={activeChannelId}
                  activeProject={activeProjectId}
                  activeView={activeTab}
                  onSelectChannel={setActiveChannelId}
                  onSelectProject={setActiveProjectId}
                  onSelectView={setActiveTab}
                  onSwitchUser={(uid) => handleSwitchUser(uid, false)}
                  onAddChannel={handleAddChannel}
                  onAddProject={handleAddProject}
                  isMobileOpen={isRightMobileOpen}
                  onCloseMobile={() => setIsRightMobileOpen(false)}
                />
                
                <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/10">
                  {activeTab === 'dashboard' && (
                    <DashboardView 
                      tasks={tasks}
                      messages={messages}
                      channels={channels}
                      projects={projects}
                      whiteboard={whiteboard}
                      document={document}
                      users={users}
                      currentUser={rightUser}
                      onSelectView={setActiveTab}
                      onSelectProject={setActiveProjectId}
                      onSelectChannel={setActiveChannelId}
                    />
                  )}
                  {activeTab === 'calendar' && (
                    <CalendarView 
                      events={calendarEvents}
                      users={users}
                      currentUser={rightUser}
                      onAddEvent={handleAddCalendarEvent}
                      onDeleteEvent={handleDeleteCalendarEvent}
                      onUpdateEvent={handleUpdateCalendarEvent}
                    />
                  )}
                  {activeTab === 'chat' && (
                    <ChatView 
                      channel={channels.find(c => c.id === activeChannelId) || null}
                      messages={messages}
                      users={users}
                      currentUser={rightUser}
                      onSendMessage={(txt) => handleSendMessage(txt, rightUser?.id || '')}
                      onSendReply={(mid, rtxt) => handleSendReply(mid, rtxt, rightUser?.id || '')}
                      onToggleReaction={(mid, emo) => handleToggleReaction(mid, emo, rightUser?.id || '')}
                      onStartTyping={() => handleStartTyping(rightUser?.id || '')}
                    />
                  )}
                  {activeTab === 'board' && (
                    <BoardView 
                      project={projects.find(p => p.id === activeProjectId) || null}
                      tasks={tasks}
                      users={users}
                      currentUser={rightUser}
                      onCreateTask={handleCreateTask}
                      onUpdateTask={handleUpdateTask}
                      onCommentOnTask={(tid, text) => handleCommentOnTask(tid, text, rightUser?.id || '')}
                      onDeleteTask={handleDeleteTask}
                    />
                  )}
                  {activeTab === 'document' && (
                    <DocumentView 
                      document={document}
                      users={users}
                      currentUser={rightUser}
                      onUpdateDocument={(txt) => handleUpdateDocument(txt, rightUser?.id || '')}
                    />
                  )}
                  {activeTab === 'whiteboard' && (
                    <WhiteboardView 
                      elements={whiteboard}
                      users={users}
                      currentUser={rightUser}
                      onAddElement={handleAddWhiteboardElement}
                      onUpdateElement={handleUpdateWhiteboardElement}
                      onClearWhiteboard={handleClearWhiteboard}
                    />
                  )}
                </main>
              </div>
            </div>

          </div>
        ) : (
          /* Normal Full Viewport layout */
          <div className="flex-1 flex overflow-hidden w-full h-full relative">
            <Sidebar 
              users={users}
              channels={channels}
              projects={projects}
              currentUser={singleUser}
              activeChannel={activeChannelId}
              activeProject={activeProjectId}
              activeView={activeTab}
              onSelectChannel={setActiveChannelId}
              onSelectProject={setActiveProjectId}
              onSelectView={setActiveTab}
              onSwitchUser={(uid) => handleSwitchUser(uid, true)}
              onAddChannel={handleAddChannel}
              onAddProject={handleAddProject}
              isMobileOpen={isMobileOpen}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
            
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/10" id="main-content-lane">
              {activeTab === 'dashboard' && (
                <DashboardView 
                  tasks={tasks}
                  messages={messages}
                  channels={channels}
                  projects={projects}
                  whiteboard={whiteboard}
                  document={document}
                  users={users}
                  currentUser={singleUser}
                  onSelectView={setActiveTab}
                  onSelectProject={setActiveProjectId}
                  onSelectChannel={setActiveChannelId}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView 
                  events={calendarEvents}
                  users={users}
                  currentUser={singleUser}
                  onAddEvent={handleAddCalendarEvent}
                  onDeleteEvent={handleDeleteCalendarEvent}
                  onUpdateEvent={handleUpdateCalendarEvent}
                />
              )}
              {activeTab === 'chat' && (
                <ChatView 
                  channel={channels.find(c => c.id === activeChannelId) || null}
                  messages={messages}
                  users={users}
                  currentUser={singleUser}
                  onSendMessage={(txt) => handleSendMessage(txt, singleUser?.id || '')}
                  onSendReply={(mid, rtxt) => handleSendReply(mid, rtxt, singleUser?.id || '')}
                  onToggleReaction={(mid, emo) => handleToggleReaction(mid, emo, singleUser?.id || '')}
                  onStartTyping={() => handleStartTyping(singleUser?.id || '')}
                />
              )}
              {activeTab === 'board' && (
                <BoardView 
                  project={projects.find(p => p.id === activeProjectId) || null}
                  tasks={tasks}
                  users={users}
                  currentUser={singleUser}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onCommentOnTask={(tid, text) => handleCommentOnTask(tid, text, singleUser?.id || '')}
                  onDeleteTask={handleDeleteTask}
                />
              )}
              {activeTab === 'document' && (
                <DocumentView 
                  document={document}
                  users={users}
                  currentUser={singleUser}
                  onUpdateDocument={(txt) => handleUpdateDocument(txt, singleUser?.id || '')}
                />
              )}
              {activeTab === 'whiteboard' && (
                <WhiteboardView 
                  elements={whiteboard}
                  users={users}
                  currentUser={singleUser}
                  onAddElement={handleAddWhiteboardElement}
                  onUpdateElement={handleUpdateWhiteboardElement}
                  onClearWhiteboard={handleClearWhiteboard}
                />
              )}
            </main>
          </div>
        )}

      </div>
    </div>
  );
}
