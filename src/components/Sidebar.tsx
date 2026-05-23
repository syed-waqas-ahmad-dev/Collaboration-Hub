import React, { useState } from 'react';
import { Channel, Project, WorkspaceUser } from '../types';
import { 
  Hash, 
  Layers, 
  Plus, 
  Users, 
  Activity, 
  Settings, 
  Globe, 
  Briefcase, 
  LogOut,
  UserCheck,
  LayoutDashboard,
  Calendar
} from 'lucide-react';

interface SidebarProps {
  users: WorkspaceUser[];
  channels: Channel[];
  projects: Project[];
  currentUser: WorkspaceUser | null;
  activeChannel: string | null;
  activeProject: string | null;
  activeView: 'chat' | 'board' | 'document' | 'whiteboard' | 'dashboard' | 'calendar';
  onSelectChannel: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectView: (view: 'chat' | 'board' | 'document' | 'whiteboard' | 'dashboard' | 'calendar') => void;
  onSwitchUser: (userId: string) => void;
  onAddChannel: (name: string, desc: string) => void;
  onAddProject: (name: string, desc: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  users,
  channels,
  projects,
  currentUser,
  activeChannel,
  activeProject,
  activeView,
  onSelectChannel,
  onSelectProject,
  onSelectView,
  onSwitchUser,
  onAddChannel,
  onAddProject,
  isMobileOpen,
  onCloseMobile
}: SidebarProps) {
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onAddChannel(newChannelName.trim(), newChannelDesc.trim());
      setNewChannelName('');
      setNewChannelDesc('');
      setShowChannelForm(false);
      onCloseMobile?.();
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setShowProjectForm(false);
      onCloseMobile?.();
    }
  };

  return (
    <>
      {/* Mobile Sidebar overlay backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-55 w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 font-sans select-none shrink-0 transform md:transform-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50 md:z-auto`}
        id="app-sidebar"
      >
        {/* Workspace Branding */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-display font-bold text-white shadow-md shadow-blue-900/40">
              C
            </div>
            <div>
              <h1 className="font-display font-medium text-sm tracking-tight text-white">Collaboration</h1>
              <p className="text-[10px] font-mono text-slate-400 tracking-wider">ENTERPRISE CORE</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">LIVE</span>
          </div>
        </div>

        {/* Profile Simulator / Identity Segment */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/60">
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg select-none shadow-sm shadow-black/20 shrink-0" 
                  style={{ backgroundColor: `${currentUser.color}30`, border: `1.5px solid ${currentUser.color}` }}
                >
                  {currentUser.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">{currentUser.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{currentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUserModal(true)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition duration-200"
                title="Switch Simulator Identity"
                id="switch-profile-btn"
              >
                <UserCheck size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowUserModal(true)}
              className="w-full py-2 px-3 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition duration-150 flex items-center justify-center space-x-1.5"
              id="login-simulator-btn"
            >
              <span>Log In Simulation</span>
            </button>
          )}
        </div>

        {/* Main Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          
          {/* Collaboration Tools */}
          <div>
            <p className="px-2 text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2">SHARED PIPELINES</p>
            <div className="space-y-0.5">
              <button
                onClick={() => { onSelectView('dashboard'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'dashboard' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-dashboard-btn"
              >
                <LayoutDashboard size={15} />
                <span>Workspace Dashboard</span>
              </button>
              <button
                onClick={() => { onSelectView('calendar'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'calendar' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-calendar-btn"
              >
                <Calendar size={15} />
                <span>Meeting Calendar</span>
              </button>
              <button
                onClick={() => { onSelectView('chat'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'chat' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-chat-btn"
              >
                <Users size={15} />
                <span>Real-time Channels</span>
              </button>
              <button
                onClick={() => { onSelectView('board'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'board' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-board-btn"
              >
                <Briefcase size={15} />
                <span>Project Kanban</span>
              </button>
              <button
                onClick={() => { onSelectView('document'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'document' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-document-btn"
              >
                <Layers size={15} />
                <span>Shared Doc Editor</span>
              </button>
              <button
                onClick={() => { onSelectView('whiteboard'); onCloseMobile?.(); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                  activeView === 'whiteboard' 
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-800/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="view-whiteboard-btn"
              >
                <Globe size={15} />
                <span>Team Whiteboard</span>
              </button>
            </div>
          </div>

          {/* Channels List */}
          {activeView === 'chat' && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase">COMMUNICATION</p>
                <button 
                  onClick={() => setShowChannelForm(!showChannelForm)}
                  className="text-slate-400 hover:text-slate-100 transition duration-150"
                  id="add-channel-toggle"
                >
                  <Plus size={14} />
                </button>
              </div>

              {showChannelForm && (
                <form onSubmit={handleCreateChannel} className="mx-2 mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    placeholder="# channel-name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mb-1.5"
                    required
                    id="new-channel-name"
                  />
                  <input
                    type="text"
                    placeholder="Short description"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mb-2"
                    id="new-channel-description"
                  />
                  <div className="flex justify-end space-x-1.5">
                    <button 
                      type="button" 
                      onClick={() => setShowChannelForm(false)} 
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-[10px] text-white rounded"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-0.5">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { onSelectChannel(ch.id); onCloseMobile?.(); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition duration-150 ${
                      activeChannel === ch.id
                        ? 'bg-slate-800/80 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                    }`}
                    id={`channel-${ch.id}`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Hash size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {currentUser?.typingIn === ch.id && (
                      <span className="flex space-x-0.5">
                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project List */}
          {activeView === 'board' && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase">PORTFOLIO PROJECTS</p>
                <button 
                  onClick={() => setShowProjectForm(!showProjectForm)}
                  className="text-slate-400 hover:text-slate-100 transition duration-150"
                  id="add-project-toggle"
                >
                  <Plus size={14} />
                </button>
              </div>

              {showProjectForm && (
                <form onSubmit={handleCreateProject} className="mx-2 mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mb-1.5"
                    required
                    id="new-project-name"
                  />
                  <input
                    type="text"
                    placeholder="Scope parameters"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mb-2"
                    id="new-project-description"
                  />
                  <div className="flex justify-end space-x-1.5">
                    <button 
                      type="button" 
                      onClick={() => setShowProjectForm(false)} 
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-[10px] text-white rounded"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-0.5">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => { onSelectProject(proj.id); onCloseMobile?.(); }}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs transition duration-150 text-left truncate ${
                      activeProject === proj.id
                        ? 'bg-slate-800/80 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                    }`}
                    id={`project-${proj.id}`}
                  >
                    <Briefcase size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team Presence Roster */}
          <div>
            <p className="px-2 text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2">ACTIVE TEAM MEMBERS</p>
            <div className="space-y-2">
              {users.map((teamUser) => (
                <div 
                  key={teamUser.id} 
                  className="flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-slate-800/30 transition duration-150"
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <div className="relative shrink-0">
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold select-none shadow-sm"
                        style={{ backgroundColor: `${teamUser.color}25`, border: `1px solid ${teamUser.color}` }}
                      >
                        {teamUser.avatar}
                      </div>
                      <span 
                        className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-slate-900 ${
                          teamUser.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                        }`}
                      ></span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{teamUser.name}</p>
                      <p className="text-[9px] font-mono text-slate-400 truncate">{teamUser.role}</p>
                    </div>
                  </div>

                  {/* Simulated typing dot banner */}
                  {teamUser.typingIn && (
                    <span className="text-[8px] font-mono bg-indigo-950 text-indigo-300 px-1 py-0.5 rounded flex items-center">
                      Typing...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Identity Selector Modal / Dropdown Dialog */}
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-xl shadow-2xl p-5" id="identity-switcher-modal">
              <h3 className="font-display font-semibold text-base text-white mb-2">Simulate Workspace Persona</h3>
              <p className="text-xs text-slate-400 mb-4">
                Select an account below. You can use multiple simulated profiles side-by-side to experience instant Socket.IO data broadcasts!
              </p>

              <div className="space-y-2 mb-4">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      setShowUserModal(false);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition duration-150 ${
                      currentUser?.id === u.id 
                        ? 'bg-blue-600/20 border border-blue-500 text-white' 
                        : 'bg-slate-950/50 border border-slate-800/80 hover:bg-slate-850 hover:border-slate-755 text-slate-200'
                    }`}
                    id={`select-identity-${u.id}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-md shadow-sm shrink-0"
                      style={{ backgroundColor: `${u.color}30`, border: `1.5px solid ${u.color}` }}
                    >
                      {u.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{u.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{u.role}</p>
                    </div>
                    {currentUser?.id === u.id && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
                >
                  Close Simulator Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
