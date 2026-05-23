import React from 'react';
import { Task, Message, Channel, Project, WhiteboardElement, CollaborativeDocument, WorkspaceUser } from '../types';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Briefcase, 
  Layers, 
  FileText, 
  CheckCircle, 
  Clock, 
  Plus, 
  Flame, 
  Sparkles, 
  ChevronRight,
  TrendingDown,
  Calendar
} from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  messages: Message[];
  channels: Channel[];
  projects: Project[];
  whiteboard: WhiteboardElement[];
  document: CollaborativeDocument;
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onSelectView: (view: 'chat' | 'board' | 'document' | 'whiteboard' | 'dashboard' | 'calendar') => void;
  onSelectProject: (id: string) => void;
  onSelectChannel: (id: string) => void;
}

export default function DashboardView({
  tasks,
  messages,
  channels,
  projects,
  whiteboard,
  document,
  users,
  currentUser,
  onSelectView,
  onSelectProject,
  onSelectChannel
}: DashboardViewProps) {
  
  // Calculate Workspace Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog' || t.status === 'todo').length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalMessages = messages.length;
  const totalUsers = users.length;
  const onlineUsers = users.filter(u => u.online).length;
  
  const totalStickyNotes = whiteboard.filter(el => el.type === 'note' && !el.isDeleted).length;
  const totalSketches = whiteboard.filter(el => el.type === 'pencil' && !el.isDeleted).length;

  const getCreatorProfile = (userId: string) => {
    return users.find(u => u.id === userId) || { name: 'UnknownUser', color: '#64748B', avatar: '👤' };
  };

  // Urgent High Priority Tasks Due List
  const urgentTasks = tasks
    .filter(t => t.status !== 'done' && t.priority === 'high')
    .slice(0, 3);

  // Synthesize a live chronological audit feed based on live state data!
  const getDynamicActivities = () => {
    const list: Array<{
      id: string;
      time: Date;
      user: WorkspaceUser;
      text: string;
      badge: string;
      badgeColor: string;
      actionUrl?: { view: any; param?: string };
    }> = [];

    // Document update
    if (document.lastUpdatedAt && document.lastUpdatedBy) {
      const u = getCreatorProfile(document.lastUpdatedBy) as WorkspaceUser;
      list.push({
        id: `act-doc-${document.version}`,
        time: new Date(document.lastUpdatedAt),
        user: u,
        text: `Updated the collaborative workspace roadmap to v${document.version}`,
        badge: 'DOCUMENT',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      });
    }

    // Task actions and comments
    tasks.forEach(t => {
      if (t.comments && t.comments.length > 0) {
        t.comments.forEach(c => {
          const u = getCreatorProfile(c.userId) as WorkspaceUser;
          list.push({
            id: `act-tcomm-${c.id}`,
            time: new Date(c.timestamp),
            user: u,
            text: `Commented on task "${t.title}": "${c.text.length > 35 ? c.text.substring(0, 35) + '...' : c.text}"`,
            badge: 'TASK COMMENT',
            badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          });
        });
      }
    });

    // Recent Messages (limit to 5)
    messages.slice(-5).forEach(m => {
      const u = getCreatorProfile(m.userId) as WorkspaceUser;
      const ch = channels.find(c => c.id === m.channelId);
      list.push({
        id: `act-msg-${m.id}`,
        time: m.timestamp ? new Date(m.timestamp) : new Date(),
        user: u,
        text: `Posted message in #${ch?.name || 'chat'}: "${m.text.length > 40 ? m.text.substring(0, 40) + '...' : m.text}"`,
        badge: 'CHAT',
        badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
      });
    });

    // Whiteboard elements (Stickers / Sketches)
    whiteboard.slice(-4).forEach(el => {
      const u = getCreatorProfile(el.createdBy) as WorkspaceUser;
      const isSticker = el.type === 'note';
      list.push({
        id: `act-wb-${el.id}`,
        time: new Date(Date.now() - 3600 * 1000 * 4), // fallback offset
        user: u,
        text: isSticker 
          ? `Created a sticky note on team whiteboard: "${el.text?.substring(0, 30)}..."`
          : `Added vector drawing curves to team whiteboard sketch`,
        badge: 'CANVAS',
        badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      });
    });

    return list
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 6);
  };

  const recentActivities = getDynamicActivities();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 text-slate-100 select-text" id="dashboard-insights-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-blue-400" />
            <h2 className="font-display font-medium text-xs text-blue-400 uppercase tracking-wider font-mono">Workspace Overview</h2>
          </div>
          <h1 className="font-display font-bold text-lg md:text-xl text-white tracking-tight mt-1">
            Real-time Operational Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Telemetry reports computed directly from your active kanban project pipelines, synchronized channels, document text sizes, and whiteboards.
          </p>
        </div>

        {/* Dynamic Activity Badge */}
        <div className="flex items-center space-x-2.5 bg-slate-900 border border-slate-800 p-3 rounded-xl shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          <div className="text-left font-mono">
            <p className="text-[10px] text-slate-400 font-bold uppercase">System Co-op Status</p>
            <p className="text-[10px] text-slate-300 mt-0.5">{onlineUsers} OF {totalUsers} SIMULATED MEMBERS ACTIVE</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Kanban Velocity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Kanban progress</span>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-white tracking-tight">{completionPercentage}%</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{completedTasks} of {totalTasks} tickets done</p>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>

        {/* Global Messages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Chat volume</span>
            <MessageSquare size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-white tracking-tight">{totalMessages}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Synchronized globally</p>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-mono font-medium mt-3">
            <span>#{channels.length} real channels open</span>
          </div>
        </div>

        {/* Document scale */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Report version</span>
            <Layers size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-white tracking-tight">v{document.version}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Roadmap revisions</p>
          </div>
          <div className="text-[10px] text-amber-400 font-mono mt-3 flex items-center justify-between">
            <span>Size: {document.text?.length || 0} chars</span>
          </div>
        </div>

        {/* Whiteboard elements */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Whiteboard cards</span>
            <Activity size={14} className="text-pink-400" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-white tracking-tight">{totalStickyNotes}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{totalSketches} layout vector lines</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-pink-400 font-mono mt-3">
            <span>Export modes: 📄PDF / 🖼️PNG</span>
          </div>
        </div>
      </div>

      {/* Primary Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Graph 1: Kanban status breakdown using custom SVG */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider font-mono">
                🎟️ Kanban Status distribution
              </h3>
              <button 
                onClick={() => onSelectView('board')} 
                className="text-[10px] font-mono text-blue-400 hover:text-white flex items-center space-x-0.5 cursor-pointer"
              >
                <span>Manage Board</span>
                <ChevronRight size={10} />
              </button>
            </div>

            {/* SVG Interactive Stat Chart */}
            <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-6">
              {/* Radial donut chart with SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="55"
                    className="stroke-slate-950"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {completionPercentage > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r="55"
                      className="stroke-emerald-500 stroke-dasharray transition-all duration-500"
                      strokeWidth="11"
                      strokeDasharray={`${(completionPercentage * 345) / 100} 345`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  )}
                </svg>
                {/* Center metric */}
                <div className="absolute text-center">
                  <span className="text-xl font-bold font-mono text-white block">{completionPercentage}%</span>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-semibold">Done Rate</span>
                </div>
              </div>

              {/* Status List Legend with metrics */}
              <div className="flex-1 w-full space-y-3 font-mono">
                {['backlog', 'todo', 'in_progress', 'review', 'done'].map((st) => {
                  const labelMap: Record<string, { name: string; color: string }> = {
                    backlog: { name: 'Backlog Inventory', color: 'bg-slate-650' },
                    todo: { name: 'To Do Pipeline', color: 'bg-indigo-600' },
                    in_progress: { name: 'In Active Progress', color: 'bg-blue-500' },
                    review: { name: 'Quality Review Gate', color: 'bg-amber-500' },
                    done: { name: 'Finalized Releases', color: 'bg-emerald-500' }
                  };
                  const currentSt = labelMap[st];
                  const count = tasks.filter(t => t.status === st).length;
                  const itemPercent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

                  return (
                    <div key={st} className="text-xs">
                      <div className="flex items-center justify-between text-slate-350 mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${currentSt.color}`}></span>
                          <span className="font-semibold text-[11px] text-slate-150">{currentSt.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-white">
                          {count} ({itemPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                        <div className={`h-full ${currentSt.color}`} style={{ width: `${itemPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Priority breakdown widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider font-mono mb-4">
              🛡️ Team Task Priorities
            </h3>
            
            <div className="space-y-4 py-2 font-mono">
              {['high', 'medium', 'low'].map(prio => {
                const count = tasks.filter(t => t.priority === prio).length;
                const ratio = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                
                const configs: Record<string, { label: string; text: string; bg: string }> = {
                  high: { label: '🔴 High Focus', text: 'text-rose-400', bg: 'bg-rose-500' },
                  medium: { label: '🟡 Normal Run', text: 'text-amber-400', bg: 'bg-amber-500' },
                  low: { label: '🟢 General Back', text: 'text-emerald-400', bg: 'bg-emerald-500' },
                };
                
                const currentConf = configs[prio];
                return (
                  <div key={prio}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className={`font-semibold text-[11px] ${currentConf.text}`}>{currentConf.label}</span>
                      <span className="text-slate-400 text-[11px]">{count} tasks</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                      <div className={`h-full ${currentConf.bg}`} style={{ width: `${ratio}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 text-[10px] text-slate-400 mt-4 leading-normal italic">
            🚀 High-priority tasks automatically trigger warnings in client frames. Keep resolution cycles under 48 hours.
          </div>
        </div>
      </div>

      {/* Live System Activities & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:col-span-2">
          <h3 className="font-display font-[#64748B] font-bold text-xs text-indigo-400 uppercase tracking-wider font-mono mb-4 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <span>⚡ LIVE CO-OP ACTIVITY PIPELINE</span>
          </h3>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xs text-slate-500">No activity logged.</p>
                <p className="text-[10px] text-slate-600 mt-1">Activities will compile automatically as actions occur.</p>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-start justify-between p-2.5 hover:bg-slate-950/40 rounded-lg transition border border-transparent hover:border-slate-850 text-xs">
                  <div className="flex items-start space-x-3 overflow-hidden mr-2">
                    {/* Simulated user circle */}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-md select-none shrink-0"
                      style={{ backgroundColor: `${act.user.color}15`, border: `1px solid ${act.user.color}` }}
                    >
                      {act.user.avatar}
                    </div>

                    <div className="min-w-0">
                      <p className="text-slate-200">
                        <strong className="text-slate-100 font-semibold font-mono">@{act.user.name.split(' ')[0]}</strong>
                        <span className="text-slate-350 ml-1.5 font-sans leading-relaxed">{act.text}</span>
                      </p>
                      
                      <div className="flex items-center space-x-2.5 mt-1">
                        <span className={`text-[8.5px] font-mono border px-1.5 py-0.25 rounded font-bold uppercase ${act.badgeColor}`}>
                          {act.badge}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-500">
                          {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action center / Upcoming Schedule alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-xs text-rose-400 uppercase tracking-wider font-mono mb-4 flex items-center space-x-1.5">
              <Flame size={12} className="text-rose-400 animate-pulse" />
              <span>🚨 ATTENTIONS REQUIRED ({urgentTasks.length})</span>
            </h3>

            {urgentTasks.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 border border-slate-850 rounded-lg p-4">
                <CheckCircle size={28} className="text-emerald-500 mx-auto opacity-75 mb-2" />
                <p className="text-[11px] font-mono font-bold text-slate-300">Clean Slate!</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">No unresolved high-priority bottlenecks logged.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map(t => {
                  const assignee = users.find(u => u.id === t.assigneeId);
                  return (
                    <div key={t.id} className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg flex flex-col space-y-1.5 hover:border-rose-900/45 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-rose-950 text-rose-400 border border-rose-900 font-bold rounded">
                          Urgent Due
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          Due {t.dueDate || 'ASAP'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-200 text-xs tracking-tight line-clamp-1">
                        {t.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1.5 border-t border-slate-900">
                        <span>Assigned to: @{assignee?.name.split(' ')[0] || 'Unassigned'}</span>
                        <button 
                          onClick={() => {
                            onSelectProject(t.projectId);
                            onSelectView('board');
                          }} 
                          className="text-blue-400 hover:text-white flex items-center cursor-pointer font-bold"
                        >
                          Open Task
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button 
              onClick={() => onSelectView('calendar')}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-400 hover:text-white border border-indigo-900 rounded-lg text-xs font-semibold font-mono transition cursor-pointer"
            >
              <Calendar size={13} />
              <span>View Workspace Calendar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
