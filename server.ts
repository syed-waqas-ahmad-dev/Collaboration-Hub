import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GlobalState, WorkspaceUser, Message, Channel, Project, Task, WhiteboardElement } from './src/types';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// Initial Mock Database State
const INITIAL_STATE: GlobalState = {
  users: [
    { id: 'usr-1', name: 'Syed Waqas', role: 'Enterprise Admin / PM', color: '#3B82F6', avatar: '👑', online: false },
    { id: 'usr-2', name: 'Devon Miller', role: 'Lead Developer', color: '#10B981', avatar: '💻', online: false },
    { id: 'usr-3', name: 'Sasha Grey', role: 'Lead UI/UX Designer', color: '#EC4899', avatar: '🎨', online: false },
    { id: 'usr-4', name: 'Aria Chen', role: 'Product Operations', color: '#F59E0B', avatar: '📊', online: false }
  ],
  channels: [
    { id: 'ch-general', name: 'general', description: 'Company-wide announcements and watercooler talk.' },
    { id: 'ch-announcements', name: 'announcements', description: 'Important milestones and high-level project alerts! 📢' },
    { id: 'ch-dev-team', name: 'engineering-lobby', description: 'Technical design brainstorms, commits, and sprint planning.' },
    { id: 'ch-creative-shack', name: 'creative-shack', description: 'Brand boards, UI feedback, and mood board coordination.' }
  ],
  messages: [
    { id: 'msg-1', channelId: 'ch-general', userId: 'usr-1', text: 'Welcome everyone to the Enterprise Collaboration Suite! This app demonstrates real-time bidirectional synchronization across chat, Kanban boards, collaborative text editors, and interactive whiteboards.', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: 'msg-2', channelId: 'ch-general', userId: 'usr-2', text: 'Stunning! Real-time syncing is instantly updating across multiple tabs. Check out the Multiplayer Split simulator below!', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), reactions: { '🚀': ['usr-1', 'usr-3'] } },
    { id: 'msg-3', channelId: 'ch-dev-team', userId: 'usr-2', text: 'Starting sprint 1 design system config. Synced tasks are on the Team Kanban Board.', timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() }
  ],
  projects: [
    { id: 'proj-1', name: 'Apollo Core Launch', description: 'Building the next generation design system and multi-tenant telemetry.' },
    { id: 'proj-2', name: 'Brand & Identity Refresh', description: 'Upgraded marketing style guide, typography pairing, and visual boards.' }
  ],
  tasks: [
    {
      id: 'task-101',
      projectId: 'proj-1',
      title: 'Define Design Tokens & Typography Scale',
      description: 'Establish standard root sizing, tracking guidelines, and font family pairing (Inter & Space Grotesk).',
      status: 'done',
      priority: 'high',
      category: 'UX',
      assigneeId: 'usr-3',
      dueDate: '2026-06-01',
      comments: [
        { id: 'tc-1', taskId: 'task-101', userId: 'usr-1', text: 'This looks fantastic! Great font choice.', timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString() }
      ]
    },
    {
      id: 'task-102',
      projectId: 'proj-1',
      title: 'Initialize Socket.IO Gateway Clusters',
      description: 'Setup full-stack Express handlers on Cloud Run to support seamless event broadcast updates with fallback routing.',
      status: 'in_progress',
      priority: 'high',
      category: 'Engineering',
      assigneeId: 'usr-2',
      dueDate: '2026-06-05',
      comments: []
    },
    {
      id: 'task-103',
      projectId: 'proj-1',
      title: 'Conduct Interactive User Feedback Loops',
      description: 'Interview 5 core stakeholders to test split-views and screen sharing controls.',
      status: 'todo',
      priority: 'medium',
      category: 'Marketing',
      assigneeId: 'usr-4',
      dueDate: '2026-06-15',
      comments: []
    },
    {
      id: 'task-104',
      projectId: 'proj-1',
      title: 'Optimize Tailwind Theme Compilations',
      description: 'Coordinate styling builds to trim package sizes and ensure accessible color contrast ratios.',
      status: 'backlog',
      priority: 'low',
      category: 'Engineering',
      assigneeId: 'usr-3',
      dueDate: '2026-06-30',
      comments: []
    }
  ],
  document: {
    text: `# Apollo Launch Roadmap Sprint 1 🚀 \n\n## Core Objectives\n1. Establish robust **real-time backend pipelines** with automatic database persistence (Local JSON Store).\n2. Create beautifully tailored **collaboration panels** supporting multi-tenancy.\n3. Implement highly fluid custom canvas overlays for real-time team wireframing.\n\n## Live Sprint Notes\n- Use **Space Grotesk** for structural layouts and display headlines.\n- Store documents synchronously on the backend using delta revisions.\n- Emphasize workspace cleanliness over cluttered debug metrics.\n`,
    version: 1,
    lastUpdatedBy: 'usr-1',
    lastUpdatedAt: new Date().toISOString()
  },
  whiteboard: [
    { id: 'wb-1', type: 'note', color: '#FEF08A', x: 80, y: 70, width: 220, height: 160, text: '💡 Concept:\nMultiplayer split browser simulation allows dual-user checks directly in the preview!', createdBy: 'usr-1' },
    { id: 'wb-2', type: 'note', color: '#BFDBFE', x: 380, y: 120, width: 200, height: 140, text: '🎨 Design tokens:\n- Space Grotesk (Display)\n- Inter (Body UI)', createdBy: 'usr-3' }
  ],
  calendarEvents: [
    { id: 'evt-1', title: 'Daily Cross-functional Standup', description: 'Synchronize roadmap status and unblock sprint engineering blockers.', date: '2026-05-24', time: '10:00', type: 'meeting', createdBy: 'usr-1', roomCode: 'meet-qwe-asdf-zxc' },
    { id: 'evt-2', title: 'Sprint 1 Brand & Identity Review', description: 'Coordinate presentation of brand tokens and new color assets on Whiteboard.', date: '2026-05-25', time: '14:30', type: 'brainstorm', createdBy: 'usr-3', roomCode: 'meet-uio-hjkl-vbn' },
    { id: 'evt-3', title: 'Apollo Core Launch Gate Milestone', description: 'Release final system configurations to production gateway cloud servers.', date: '2026-05-29', time: '09:00', type: 'milestone', createdBy: 'usr-2' },
    { id: 'evt-4', title: 'Team Retro & Casual Social Mixer', description: 'Online happy hour, casual icebreakers, and sandbox showcase games.', date: '2026-05-27', time: '17:00', type: 'social', createdBy: 'usr-4', roomCode: 'meet-pub-room-six' }
  ]
};

// Database Read/Write Helpers
function loadDb(): GlobalState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // Ensure users aren't left permanently online if server crashed
      if (parsed.users) {
        parsed.users = parsed.users.map((u: WorkspaceUser) => ({ ...u, online: false, typingIn: undefined }));
      }
      if (!parsed.calendarEvents) {
        parsed.calendarEvents = INITIAL_STATE.calendarEvents;
      }
      return { ...INITIAL_STATE, ...parsed };
    }
  } catch (err) {
    console.error('Error loading database, resetting state:', err);
  }
  return INITIAL_STATE;
}

function saveDb(state: GlobalState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Memory Database Instance
let dbState = loadDb();

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // REST API Endpoints
  app.get('/api/state', (req, res) => {
    res.json(dbState);
  });

  // Socket.IO Events Handlers
  io.on('connection', (socket) => {
    console.log(`Socket connection made: ${socket.id}`);

    // Synchronize initial state with the client
    socket.emit('state:init', dbState);

    // User authentication / login
    socket.on('user:login', ({ userId }: { userId: string }) => {
      const user = dbState.users.find(u => u.id === userId);
      if (user) {
        user.online = true;
        saveDb(dbState);
        io.emit('user:presence', dbState.users);
        console.log(`User ${user.name} logged online`);
      }
    });

    // User typing status
    socket.on('user:typing', ({ userId, channelId }: { userId: string, channelId: string | undefined }) => {
      const user = dbState.users.find(u => u.id === userId);
      if (user) {
        user.typingIn = channelId;
        io.emit('user:typing_updated', { userId, channelId });
      }
    });

    // Send real-time message
    socket.on('message:send', ({ channelId, userId, text }: { channelId: string, userId: string, text: string }) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        userId,
        text,
        timestamp: new Date().toISOString(),
        replies: [],
        reactions: {}
      };
      
      dbState.messages.push(newMessage);
      saveDb(dbState);
      
      // Stop typing
      const user = dbState.users.find(u => u.id === userId);
      if (user) {
        user.typingIn = undefined;
        io.emit('user:typing_updated', { userId, channelId: undefined });
      }

      io.emit('message:new', newMessage);
    });

    // Reply to message thread
    socket.on('message:reply', ({ messageId, userId, text }: { messageId: string, userId: string, text: string }) => {
      const message = dbState.messages.find(m => m.id === messageId);
      if (message) {
        if (!message.replies) message.replies = [];
        message.replies.push({
          id: `reply-${Date.now()}`,
          userId,
          text,
          timestamp: new Date().toISOString()
        });
        saveDb(dbState);
        io.emit('message:updated', message);
      }
    });

    // Toggle Reaction on message
    socket.on('message:react', ({ messageId, userId, emoji }: { messageId: string, userId: string, emoji: string }) => {
      const message = dbState.messages.find(m => m.id === messageId);
      if (message) {
        if (!message.reactions) message.reactions = {};
        if (!message.reactions[emoji]) message.reactions[emoji] = [];
        
        const idx = message.reactions[emoji].indexOf(userId);
        if (idx > -1) {
          message.reactions[emoji].splice(idx, 1);
          if (message.reactions[emoji].length === 0) {
            delete message.reactions[emoji];
          }
        } else {
          message.reactions[emoji].push(userId);
        }
        
        saveDb(dbState);
        io.emit('message:updated', message);
      }
    });

    // Kanban Task Events
    socket.on('task:create', (taskData: Omit<Task, 'comments'>) => {
      const newTask: Task = {
        ...taskData,
        comments: []
      };
      dbState.tasks.push(newTask);
      saveDb(dbState);
      io.emit('task:created', newTask);
    });

    socket.on('task:update', (updatedTask: Task) => {
      const idx = dbState.tasks.findIndex(t => t.id === updatedTask.id);
      if (idx > -1) {
        dbState.tasks[idx] = updatedTask;
        saveDb(dbState);
        io.emit('task:updated', updatedTask);
      }
    });

    socket.on('task:comment', ({ taskId, userId, text }: { taskId: string, userId: string, text: string }) => {
      const task = dbState.tasks.find(t => t.id === taskId);
      if (task) {
        task.comments.push({
          id: `comment-${Date.now()}`,
          taskId,
          userId,
          text,
          timestamp: new Date().toISOString()
        });
        saveDb(dbState);
        io.emit('task:updated', task);
      }
    });

    socket.on('task:delete', ({ taskId }: { taskId: string }) => {
      dbState.tasks = dbState.tasks.filter(t => t.id !== taskId);
      saveDb(dbState);
      io.emit('task:deleted', { taskId });
    });

    // Project Events
    socket.on('project:create', (projectData: Project) => {
      dbState.projects.push(projectData);
      saveDb(dbState);
      io.emit('project:created', projectData);
    });

    // Document Collaborative Synchronization
    socket.on('doc:update', ({ text, userId }: { text: string; userId: string }) => {
      dbState.document.text = text;
      dbState.document.version += 1;
      dbState.document.lastUpdatedBy = userId;
      dbState.document.lastUpdatedAt = new Date().toISOString();
      saveDb(dbState);
      // Broadcast update to all other connected sockets
      socket.broadcast.emit('doc:updated', dbState.document);
    });

    // Interactive Whiteboard Canvas Draw
    socket.on('whiteboard:element_added', (element: WhiteboardElement) => {
      dbState.whiteboard.push(element);
      saveDb(dbState);
      socket.broadcast.emit('whiteboard:element_added', element);
    });

    socket.on('whiteboard:element_updated', (updatedElement: WhiteboardElement) => {
      const idx = dbState.whiteboard.findIndex(e => e.id === updatedElement.id);
      if (idx > -1) {
        dbState.whiteboard[idx] = updatedElement;
        saveDb(dbState);
        socket.broadcast.emit('whiteboard:element_updated', updatedElement);
      }
    });

    socket.on('whiteboard:clear', () => {
      dbState.whiteboard = [];
      saveDb(dbState);
      io.emit('whiteboard:cleared');
    });

    // Calendar sync sockets
    socket.on('calendar:create', (newEvent: any) => {
      if (!dbState.calendarEvents) dbState.calendarEvents = [];
      dbState.calendarEvents.push(newEvent);
      saveDb(dbState);
      io.emit('calendar:created', newEvent);
    });

    socket.on('calendar:delete', ({ id }: { id: string }) => {
      if (!dbState.calendarEvents) dbState.calendarEvents = [];
      dbState.calendarEvents = dbState.calendarEvents.filter(e => e.id !== id);
      saveDb(dbState);
      io.emit('calendar:deleted', { id });
    });

    socket.on('calendar:update', (updatedEvt: any) => {
      if (!dbState.calendarEvents) dbState.calendarEvents = [];
      dbState.calendarEvents = dbState.calendarEvents.map(e => e.id === updatedEvt.id ? updatedEvt : e);
      saveDb(dbState);
      io.emit('calendar:updated', updatedEvt);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Find database user and mark offline, since we mapped sockets simply in client setup,
      // we can do a broadcast request or check clients.
      // To keep sandbox reliable, client informs logout but we can also mark user offline if needed.
    });
  });

  // Serving Frontend (Vite Setup or Static build)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
