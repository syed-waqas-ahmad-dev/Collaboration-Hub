import React, { useState, useEffect } from 'react';
import { CalendarEvent, WorkspaceUser } from '../types';
import { 
  Calendar, 
  Clock, 
  Video, 
  Plus, 
  Trash2, 
  Users, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  CheckCircle,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  MessageSquare,
  ShieldAlert,
  X,
  Search,
  LayoutList,
  Bell,
  Copy,
  Check
} from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent?: (evt: CalendarEvent) => void;
}

export default function CalendarView({
  events = [],
  users,
  currentUser,
  onAddEvent,
  onDeleteEvent,
  onUpdateEvent
}: CalendarViewProps) {
  // Calendar View Control (Default to May 2026 for alignment with workspace baseline)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 0-indexed, 4 = May
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-05-23'); // Default to target date
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag-and-drop overlay targeting state
  const [draggedOverDateStr, setDraggedOverDateStr] = useState<string | null>(null);

  // Simulated live clock synchronized to May 23, 2026 for real-time sandbox notifications
  const [simulatedTime, setSimulatedTime] = useState<Date>(() => {
    const now = new Date();
    const date = new Date('2026-05-23T00:00:00');
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return date;
  });

  // Track dismissed reminders to allow user to snooze and close warning cards
  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const date = new Date('2026-05-23T00:00:00');
      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      setSimulatedTime(date);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getEventDateTime = (dateStr: string, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr + 'T00:00:00');
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const getMinutesUntilEvent = (evt: CalendarEvent) => {
    const evtTime = getEventDateTime(evt.date, evt.time);
    const diffMs = evtTime.getTime() - simulatedTime.getTime();
    return Math.floor(diffMs / 60000);
  };

  const getActiveReminders = () => {
    return events.filter(evt => {
      if (dismissedReminderIds.includes(evt.id)) return false;
      const diffMins = getMinutesUntilEvent(evt);
      // Remind if the event is scheduled to start in the next 15 minutes (or has just started / <= 15m)
      return diffMins >= 0 && diffMins <= 15;
    });
  };

  const handleEventDrop = (eventId: string, targetDateStr: string) => {
    setDraggedOverDateStr(null);
    if (!eventId || !targetDateStr) return;
    const evt = events.find(e => e.id === eventId);
    if (!evt) return;
    if (evt.date === targetDateStr) return; // Unchanged, ignore

    // Fire state update to store rescheduled calendar event
    onUpdateEvent?.({
      ...evt,
      date: targetDateStr
    });
  };
  
  // Sidebar virtual meeting active simulation state
  const [activeMeetingRoomCode, setActiveMeetingRoomCode] = useState<string | null>(null);
  
  // Meeting conference simulation states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [meetingChatText, setMeetingChatText] = useState('');
  const [meetingChatMessages, setMeetingChatMessages] = useState<Array<{ user: string; text: string; time: string }>>([
    { user: 'Syed Waqas', text: 'Hey team, welcome to the audio/video portal! Handshake successful.', time: '10:01 AM' },
    { user: 'Devon Miller', text: 'Great resolution! Sync is working flawlessly.', time: '10:02 AM' }
  ]);

  // Form states to create new events
  const [showEventForm, setShowEventForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTime, setFormTime] = useState('11:00');
  const [formType, setFormType] = useState<'meeting' | 'milestone' | 'brainstorm' | 'social'>('meeting');
  const [formProvisionMeeting, setFormProvisionMeeting] = useState(true);
  const [formExternalLink, setFormExternalLink] = useState('');
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const handleCopyLink = (e: React.MouseEvent, eventId: string, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedEventId(eventId);
    setTimeout(() => {
      setCopiedEventId(null);
    }, 2000);
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCreatorProfile = (userId: string) => {
    return users.find(u => u.id === userId) || { name: 'Unknown', color: '#64748B', avatar: '👤' };
  };

  // Calendar days generation logic
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (year: number, month: number) => {
    // Weekday index of first day (0 = Sunday, 1 = Monday...)
    return new Date(year, month, 1).getDay();
  };

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const offset = getFirstDayOffset(currentYear, currentMonth);
  
  // Create array of days representing the full 6-week grid
  const calendarCells: Array<{ dayNum: number | null; dateStr: string | null }> = [];
  
  // Fill offset empty cells
  for (let i = 0; i < offset; i++) {
    calendarCells.push({ dayNum: null, dateStr: null });
  }
  
  // Fill real days
  for (let day = 1; day <= daysCount; day++) {
    const formattedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dayNum: day, dateStr: formattedDateStr });
  }

  // Handle Month shift
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !currentUser) return;

    const meetCode = formProvisionMeeting 
      ? `meet-${Math.random().toString(36).substr(2, 3)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 3)}`
      : undefined;

    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: formTitle.trim(),
      description: formDesc.trim(),
      date: selectedDateStr,
      time: formTime,
      type: formType,
      createdBy: currentUser.id,
      roomCode: meetCode,
      externalMeetLink: formExternalLink.trim() || undefined
    };

    onAddEvent(newEvent);

    // Reset Form
    setFormTitle('');
    setFormDesc('');
    setFormTime('11:00');
    setFormType('meeting');
    setFormProvisionMeeting(true);
    setFormExternalLink('');
    setShowEventForm(false);
  };

  const selectedDateEvents = events.filter(e => e.date === selectedDateStr);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'meeting':
        return {
          badge: 'bg-indigo-950/80 border-indigo-900/60 text-indigo-400',
          dot: 'bg-indigo-500'
        };
      case 'milestone':
        return {
          badge: 'bg-rose-950/80 border-rose-900/60 text-rose-400 font-bold',
          dot: 'bg-rose-500'
        };
      case 'brainstorm':
        return {
          badge: 'bg-amber-950/80 border-amber-900/60 text-amber-400',
          dot: 'bg-amber-500'
        };
      case 'social':
        return {
          badge: 'bg-emerald-950/80 border-emerald-900/60 text-emerald-400',
          dot: 'bg-emerald-500'
        };
      default:
        return {
          badge: 'bg-slate-950 border-slate-800 text-slate-400',
          dot: 'bg-slate-500'
        };
    }
  };

  // Filter events based on active Search Query across Title or Description
  const filteredEvents = events.filter(evt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = evt.title?.toLowerCase().includes(q) ?? false;
    const matchesDesc = evt.description?.toLowerCase().includes(q) ?? false;
    return matchesTitle || matchesDesc;
  });

  // Sort overall chronologically (earliest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  // Separate into Upcoming vs Past based on operational system baseline date (May 23, 2026)
  const todayDateStr = '2026-05-23';
  const upcomingEvents = sortedEvents.filter(e => e.date >= todayDateStr);
  const pastEvents = sortedEvents.filter(e => e.date < todayDateStr);

  const renderAgendaEventItem = (evt: CalendarEvent, isUpcoming: boolean) => {
    const creator = getCreatorProfile(evt.createdBy);
    const style = getTypeStyle(evt.type);
    
    // Format Date beautifully
    const eventDate = new Date(evt.date + 'T00:00:00'); // ensure local timezone safe parse
    const monthAbbr = eventDate.toLocaleDateString([], { month: 'short' }).toUpperCase();
    const day = eventDate.getDate();
    const weekday = eventDate.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    const isToday = evt.date === '2026-05-23';

    // Active starting reminder computation for highlight styling
    const diffMins = getMinutesUntilEvent(evt);
    const isReminderActive = diffMins >= 0 && diffMins <= 15 && !dismissedReminderIds.includes(evt.id);

    return (
      <div 
        key={evt.id} 
        onClick={() => setSelectedDateStr(evt.date)}
        className={`hover:bg-slate-850/80 border transition-all duration-150 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${
          isReminderActive 
            ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/20 shadow-lg shadow-rose-950/30' 
            : evt.date === selectedDateStr 
              ? 'border-blue-500/80 bg-blue-950/5 ring-1 ring-blue-500/20' 
              : 'border-slate-850 bg-slate-900 hover:border-slate-700'
        }`}
        id={`agenda-item-${evt.id}`}
      >
        {/* Date visual pin */}
        <div className={`flex sm:flex-col items-center justify-center shrink-0 w-full sm:w-16 h-auto sm:h-16 py-2 px-3 sm:p-0 rounded-lg border font-mono text-center ${
          isReminderActive ? 'bg-rose-950/60 border-rose-900/40 text-rose-400' : 'bg-slate-950 border-slate-850/60 text-slate-500'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isReminderActive ? 'text-rose-400' : isToday ? 'text-blue-400' : 'text-slate-500'}`}>
            {weekday}
          </span>
          <span className={`text-lg sm:text-2xl font-bold leading-none mt-0.5 ${isReminderActive ? 'text-rose-400 animate-pulse font-black' : isToday ? 'text-blue-400 font-extrabold' : 'text-white'}`}>
            {day}
          </span>
          <span className="hidden sm:inline text-[8px] font-mono tracking-widest uppercase mt-0.5 text-slate-400">
            {monthAbbr}
          </span>
          {isToday && !isReminderActive && (
            <span className="inline sm:hidden ml-2 px-1.5 py-0.25 bg-blue-600 text-white rounded font-mono text-[8px] uppercase tracking-wider font-extrabold animate-pulse">
              Today
            </span>
          )}
          {isToday && !isReminderActive && (
            <span className="hidden sm:block text-[7px] text-blue-400 font-extrabold mt-0.5 uppercase tracking-wide">
              TODAY
            </span>
          )}
          {isReminderActive && (
            <span className="inline sm:hidden ml-2 px-1.5 py-0.25 bg-rose-600 text-white rounded font-mono text-[8px] uppercase tracking-wider font-extrabold animate-pulse">
              Alert
            </span>
          )}
        </div>

        {/* Info details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${style.badge}`}>
              {evt.type}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center space-x-1 font-mono">
              <Clock size={11} className={isReminderActive ? 'text-rose-400' : 'text-slate-500'} />
              <span className={isReminderActive ? 'text-rose-350 font-bold' : ''}>{evt.time}</span>
            </span>

            {isReminderActive && (
              <span className="text-[9px] font-mono px-2 py-0.5 bg-rose-600 text-white rounded-full font-bold flex items-center space-x-1 animate-pulse">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                <span>STARTING IN {diffMins === 0 ? 'NOW' : `${diffMins} MIN`}</span>
              </span>
            )}
          </div>

          <h3 className={`text-sm font-bold tracking-tight ${isReminderActive ? 'text-rose-200' : 'text-slate-100'}`}>
            {evt.title}
          </h3>
          
          {evt.description && (
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed italic font-sans">
              {evt.description}
            </p>
          )}

          <div className="flex items-center space-x-2.5 mt-2.5 font-mono text-[9px] text-slate-500 select-none">
            <span 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{ backgroundColor: `${creator.color}20`, border: `1px solid ${creator.color}` }}
            >
              {creator.avatar}
            </span>
            <span>Organizer: @{creator.name.split(' ')[0]}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-col items-stretch sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-0 border-slate-850 pt-3 sm:pt-0">
          {evt.externalMeetLink ? (
            <div className="flex flex-row sm:flex-col gap-1.5 shrink-0 w-full sm:w-auto">
              <a
                href={evt.externalMeetLink.startsWith('http') ? evt.externalMeetLink : `https://${evt.externalMeetLink}`}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow-sm shadow-indigo-900/20 border border-indigo-550 flex items-center justify-center space-x-1.5 shrink-0"
                title="Open external meeting link"
              >
                <Video size={11} />
                <span>Join Call</span>
              </a>
              <button
                type="button"
                onClick={(e) => handleCopyLink(e, evt.id, evt.externalMeetLink!)}
                className="px-3 py-1.25 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer border border-slate-800 flex items-center justify-center space-x-1.5 shrink-0"
                title="Copy External Meeting Link"
              >
                {copiedEventId === evt.id ? (
                  <>
                    <Check size={11} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} className="shrink-0" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          ) : evt.roomCode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMeetingRoomCode(evt.roomCode || null);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow-sm shadow-blue-900/20 border border-blue-550 flex items-center space-x-1.5 shrink-0"
              title="Enter Virtual Meet Session Room"
            >
              <Video size={11} />
              <span>Join Call</span>
            </button>
          ) : (
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-1 rounded inline-block text-center select-none border border-slate-900">
              Locked Event
            </span>
          )}

          {currentUser?.id === evt.createdBy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent(evt.id);
              }}
              className="text-xs px-2.5 py-1 text-rose-450 hover:text-white hover:bg-rose-950/40 rounded border border-transparent hover:border-rose-900 transition flex items-center space-x-1 font-mono cursor-pointer"
              title="Remove scheduling"
            >
              <Trash2 size={11} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleSendMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingChatText.trim() || !currentUser) return;
    setMeetingChatMessages(prev => [
      ...prev,
      {
        user: currentUser.name,
        text: meetingChatText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMeetingChatText('');
  };

  const activeMeetingObj = events.find(e => e.roomCode === activeMeetingRoomCode);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden font-sans select-none" id="workspace-calendar-page">
      
      {/* Simulation Meeting Conference Overlays - Fullscreen Modal Overlay inside this view */}
      {activeMeetingRoomCode && activeMeetingObj && (
        <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col" id="simulated-conference-overlay">
          {/* Header */}
          <header className="px-5 py-3 border-b border-slate-900 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                <Video size={16} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-y-0.5">
                  <h2 className="text-sm font-bold text-white mr-2 truncate max-w-[140px] sm:max-w-xs">{activeMeetingObj.title}</h2>
                  <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded text-[8.5px] font-mono leading-none">Simulated Live Portal</span>
                </div>
                <p className="text-[10px] text-slate-400 tracking-wider font-mono">CODE: {activeMeetingObj.roomCode}</p>
              </div>
            </div>

            <button
              onClick={() => setActiveMeetingRoomCode(null)}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs font-semibold hover:text-white transition cursor-pointer flex items-center space-x-1 border border-rose-900/50"
              title="Leave Room"
            >
              <X size={12} />
              <span>Leave Room</span>
            </button>
          </header>

          {/* Conference View Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Primary Video Grid */}
            <div className="flex-1 p-4 bg-slate-950 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 h-full align-items-center">
              {/* Box 1: Current Agent / Simulation host */}
              <div className="relative bg-slate-900 rounded-xl border border-slate-850 overflow-hidden aspect-video flex flex-col justify-between shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent p-3 flex items-center justify-between z-10 font-mono text-[10px] text-slate-350">
                  <span className="font-semibold text-white">🖥️ {currentUser?.name || 'You'} (Simulation Admin)</span>
                  <span className="bg-blue-600 text-white px-1.5 py-0.25 rounded text-[8px] tracking-widest font-bold">1080p Local</span>
                </div>

                {/* Simulated video frame */}
                {isCamOff ? (
                  <div className="flex-1 flex items-center justify-center bg-slate-950">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold border-2"
                      style={{ backgroundColor: `${currentUser?.color}20`, borderColor: currentUser?.color }}
                    >
                      {currentUser?.avatar || '👤'}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-gradient-to-tr from-slate-950 via-indigo-950/10 to-slate-900 flex flex-col items-center justify-center relative">
                    {/* Visual simulated wave tracker */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="w-16 h-16 rounded-full bg-blue-500 animate-ping absolute" style={{ animationDuration: '3s' }} />
                      <div className="w-24 h-24 rounded-full bg-indigo-500 animate-ping absolute" style={{ animationDuration: '5s' }} />
                    </div>
                    {/* Subtly animated placeholder avatar representing digital video stream */}
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl select-none z-10 border shadow-lg animate-bounce"
                      style={{ backgroundColor: `${currentUser?.color}30`, borderColor: currentUser?.color, animationDuration: '4s' }}
                    >
                      {currentUser?.avatar || '👑'}
                    </div>
                    {isSharingScreen && (
                      <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-xs flex items-center justify-center z-20 border border-indigo-500 border-dashed m-3 rounded-lg text-center">
                        <div className="font-mono text-indigo-300">
                          <ScreenShare size={24} className="mx-auto text-indigo-400 mb-1.5 animate-pulse" />
                          <p className="text-[11px] font-bold">SHARING DESKTOP FRAME</p>
                          <p className="text-[8px] text-indigo-400 mt-0.5">Real-time collaboration synchronizing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Controls indicators */}
                <div className="absolute bottom-3 left-3 flex items-center space-x-2 z-10">
                  <span className={`p-1.5 rounded-md ${isMicMuted ? 'bg-rose-500/20 border border-rose-500 text-rose-400' : 'bg-slate-950/70 text-slate-350'} text-[10px]`}>
                    {isMicMuted ? <MicOff size={11} /> : <Mic size={11} />}
                  </span>
                  <span className={`p-1.5 rounded-md ${isCamOff ? 'bg-rose-500/20 border border-rose-500 text-rose-400' : 'bg-slate-950/70 text-slate-350'} text-[10px]`}>
                    {isCamOff ? <VideoOff size={11} /> : <Video size={11} />}
                  </span>
                </div>
              </div>

              {/* Box 2: Peer Attendee 1 */}
              <div className="relative bg-slate-900 rounded-xl border border-slate-850 overflow-hidden aspect-video flex flex-col justify-between shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent p-3 flex items-center justify-between z-10 font-mono text-[10px] text-slate-350">
                  <span className="font-semibold text-white">💻 Devon Miller (Lead Developer)</span>
                  <span className="text-[8.5px] font-mono text-emerald-400 flex items-center space-x-1 bg-slate-950 px-1.5 py-0.25 rounded">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>AUDIO SYNCED</span>
                  </span>
                </div>

                <div className="flex-1 bg-gradient-to-bl from-slate-950 via-emerald-950/10 to-slate-900 flex flex-col items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl select-none z-10 border border-emerald-500/30 shadow-lg bg-emerald-950/40">
                    💻
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 z-10 bg-slate-950/75 px-2 py-1 border border-slate-800 rounded-md flex items-center space-x-1.5">
                  <Mic size={11} className="text-emerald-400" />
                  <span className="text-[9px] text-slate-400 font-mono leading-none">Speaking</span>
                </div>
              </div>

              {/* Box 3: Peer Attendee 2 */}
              <div className="relative bg-slate-900 rounded-xl border border-slate-850 overflow-hidden aspect-video flex flex-col justify-between shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent p-3 flex items-center justify-between z-10 font-mono text-[10px] text-slate-350">
                  <span className="font-semibold text-white">🎨 Sasha Grey (Lead UI/UX Designer)</span>
                  <span className="text-[8.5px] font-mono text-slate-400 flex items-center space-x-1 bg-slate-950 px-1.5 py-0.25 rounded">
                    <span>AUDIO MUTED</span>
                  </span>
                </div>

                <div className="flex-1 bg-gradient-to-br from-slate-950 via-pink-950/10 to-slate-900 flex flex-col items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl select-none z-10 border border-pink-500/30 shadow-lg bg-pink-950/40">
                    🎨
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 z-10 bg-rose-500/20 px-2 py-1 border border-rose-500 rounded-md flex items-center space-x-1.5">
                  <MicOff size={11} className="text-rose-400" />
                  <span className="text-[9px] text-rose-350 font-mono leading-none">Muted</span>
                </div>
              </div>

              {/* Box 4: Peer Attendee 3 */}
              <div className="relative bg-slate-900 rounded-xl border border-slate-850 overflow-hidden aspect-video flex flex-col justify-between shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent p-3 flex items-center justify-between z-10 font-mono text-[10px] text-slate-350">
                  <span className="font-semibold text-white">📊 Aria Chen (Product Operations)</span>
                  <span className="text-[8.5px] font-mono text-slate-400 flex items-center space-x-1 bg-slate-950 px-1.5 py-0.25 rounded">
                    <span>RECONNECTING...</span>
                  </span>
                </div>

                <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative">
                  <span className="h-5 w-5 rounded-full border border-slate-700 border-t-blue-500 animate-spin mb-1" />
                  <span className="text-[9px] text-slate-500 font-mono text-center mt-1">Syncing frame tracks</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Conference Chat Box Panel */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-900 bg-slate-900/40 flex flex-col backdrop-blur-md">
              <div className="p-4 border-b border-slate-900 flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare size={13} className="text-blue-400" />
                  <span>Conference Chat ({meetingChatMessages.length})</span>
                </h3>
              </div>

              {/* Messages timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {meetingChatMessages.map((msg, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-855 p-2.5 rounded-lg flex flex-col text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-350 font-mono text-[9px]">@{msg.user.split(' ')[0]}</span>
                      <span className="text-[8px] text-slate-600 font-mono">{msg.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-sans leading-normal break-words">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Submit Chat replies */}
              <form onSubmit={handleSendMeetingChat} className="p-3 border-t border-slate-900 flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Send meeting transcript message..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder-slate-600"
                  value={meetingChatText}
                  onChange={(e) => setMeetingChatText(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded text-xs shrink-0 cursor-pointer font-semibold"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Action Footer Buttons Grid */}
          <footer className="p-4 border-t border-slate-900 bg-slate-900/95 shrink-0 flex items-center justify-center space-x-4">
            <button
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-3 rounded-full transition cursor-pointer flex items-center justify-center ${
                isMicMuted ? 'bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-900' : 'bg-slate-850 hover:bg-slate-800 text-slate-100'
              }`}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
              onClick={() => setIsCamOff(!isCamOff)}
              className={`p-3 rounded-full transition cursor-pointer flex items-center justify-center ${
                isCamOff ? 'bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-900' : 'bg-slate-850 hover:bg-slate-800 text-slate-100'
              }`}
              title={isCamOff ? 'Start video camera' : 'Stop video camera'}
            >
              {isCamOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>

            <button
              onClick={() => setIsSharingScreen(!isSharingScreen)}
              className={`p-3 rounded-full transition cursor-pointer flex items-center justify-center ${
                isSharingScreen ? 'bg-indigo-600 text-white outline outline-indigo-500 shadow' : 'bg-slate-850 hover:bg-slate-800 text-slate-100'
              }`}
              title={isSharingScreen ? 'Stop screen sharing' : 'Share desktop frame screen'}
            >
              <ScreenShare size={16} />
            </button>
          </footer>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto select-none">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-blue-400" />
              <h2 className="font-display font-medium text-xs text-blue-400 uppercase tracking-wider font-mono">Workspace Schedules</h2>
            </div>
            <h1 className="font-display font-bold text-lg md:text-xl text-white tracking-tight mt-1">
              Co-op Event Planner Room
            </h1>
          </div>

          {/* Month Navigator Header Controls */}
          <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Prior Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-bold text-white min-w-[100px] text-center">
              {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic Event Alerts Reminder Section with Snooze/Dismiss actions */}
        {(() => {
          const activeReminders = getActiveReminders();
          if (activeReminders.length === 0) return null;
          return (
            <div className="mb-6 space-y-2.5 animate-fade-in shrink-0">
              {activeReminders.map(evt => {
                const diffMins = getMinutesUntilEvent(evt);
                const isStartingNow = diffMins <= 0;
                
                return (
                  <div 
                    key={evt.id} 
                    className="bg-indigo-950/45 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/20 backdrop-blur-md relative overflow-hidden"
                    id={`reminder-banner-${evt.id}`}
                  >
                    {/* Pulsing state visual strip indicator */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse" />

                    <div className="flex items-start sm:items-center space-x-3 pl-1">
                      <span className="p-2 bg-rose-950/40 rounded-lg text-rose-400 shrink-0 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                        <Bell size={16} className="text-rose-400 animate-pulse" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono font-bold text-rose-300 uppercase tracking-widest bg-rose-955/40 px-2 py-0.5 rounded border border-rose-800/20">
                            SESSION REMINDER
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-[10px] font-mono text-rose-400 font-bold tracking-wider uppercase">
                            {isStartingNow ? 'Starting Now!' : `Starting in ${diffMins} ${diffMins === 1 ? 'min' : 'mins'}`}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-white mt-1 leading-tight flex items-center flex-wrap gap-x-2">
                          <span>{evt.title}</span>
                          <span className="text-slate-400 font-normal font-mono text-[10px]">({evt.time})</span>
                        </h3>
                        {evt.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xl italic">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 ml-11 sm:ml-0 shrink-0">
                      {evt.externalMeetLink ? (
                        <>
                          <a
                            href={evt.externalMeetLink.startsWith('http') ? evt.externalMeetLink : `https://${evt.externalMeetLink}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={() => {
                              setSelectedDateStr(evt.date);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow flex items-center space-x-1.5"
                          >
                            <Video size={12} />
                            <span>Join Call</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(e, evt.id, evt.externalMeetLink!)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer border border-slate-800 flex items-center space-x-1.5"
                            title="Copy External Meeting Link"
                          >
                            {copiedEventId === evt.id ? (
                              <>
                                <Check size={12} className="text-emerald-400 shrink-0" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="shrink-0" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : evt.roomCode ? (
                        <button
                          onClick={() => {
                            setActiveMeetingRoomCode(evt.roomCode || null);
                            // Highlight the day as selected in the scheduler
                            setSelectedDateStr(evt.date);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow flex items-center space-x-1.5"
                        >
                          <Video size={12} />
                          <span>Join Call</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDateStr(evt.date);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow flex items-center space-x-1"
                        >
                          <Calendar size={12} />
                          <span>View Day</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDismissedReminderIds(prev => [...prev, evt.id]);
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-mono transition cursor-pointer border border-slate-800"
                        title="Dismiss notification"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Filter & Selector Controller row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl mb-6 shadow-sm shrink-0">
          {/* Search bar designed professionally to filter scheduled events by title/description */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search scheduled sessions by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 placeholder-slate-650 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
              id="calendar-search-field"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-white text-xs cursor-pointer"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Button layout group between Month Grid and Agenda Timeline list */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 border border-slate-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition text-xs font-mono font-bold cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="toggle-grid-mode"
            >
              <Calendar size={13} />
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition text-xs font-mono font-bold cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="toggle-agenda-mode"
            >
              <LayoutList size={13} />
              <span>Agenda Feed</span>
            </button>
          </div>
        </div>

        {viewMode === 'agenda' ? (
          /* Event Agenda Timeline Scrollable List container */
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[460px] shadow-2xl">
            {/* Header timeline stats */}
            <div className="bg-slate-950 border-b border-slate-850 px-4 py-3.5 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                CHRONOLOGICAL TIMELINE FEED
              </span>
              <span className="bg-blue-950/60 text-blue-400 border border-blue-900/50 px-2 py-0.5 rounded text-[9.5px] font-mono leading-none">
                {filteredEvents.length} Matched Sessions
              </span>
            </div>

            {/* Agenda Timeline events viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 select-text custom-scrollbar" id="agenda-scroller">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-24 bg-slate-950/20 border border-slate-850 border-dotted rounded-xl p-6 max-w-md mx-auto my-6 select-none">
                  <Sparkles size={28} className="text-indigo-400 opacity-60 mx-auto mb-3 animate-bounce" style={{ animationDuration: '3s' }} />
                  <p className="text-xs font-mono font-bold text-slate-200">No scheduled sessions found</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {searchQuery 
                      ? "No events matched your current search criteria. Try modifying your filter text." 
                      : "Schedule standard or workshop co-op events to populate the active pipeline."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-650 text-indigo-300 hover:text-white border border-indigo-900 font-mono text-xs font-semibold rounded transition cursor-pointer"
                    >
                      Clear Filter Query
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category: Upcoming sessions */}
                  {upcomingEvents.length > 0 && (
                    <div className="space-y-3.5">
                      <div className="flex items-center space-x-2 pb-1 border-b border-slate-850 select-none">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/25">
                          Upcoming Milestones & Meets ({upcomingEvents.length})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {upcomingEvents.map(evt => renderAgendaEventItem(evt, true))}
                      </div>
                    </div>
                  )}

                  {/* Category: Past timeline matches */}
                  {pastEvents.length > 0 && (
                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center space-x-2 pb-1 border-b border-slate-850 select-none">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-855">
                          Prior Finished Events ({pastEvents.length})
                        </span>
                      </div>
                      <div className="space-y-3 opacity-70 hover:opacity-100 transition duration-150">
                        {pastEvents.map(evt => renderAgendaEventItem(evt, false))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Visual Calendar Month Grid View content block */
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[460px] shadow-2xl">
            {/* Weekday indicator row */}
            <div className="grid grid-cols-7 bg-slate-950 text-center border-b border-slate-850 py-2.5 text-[10px] font-mono font-bold text-slate-400 tracking-wider">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Grid Cells with search dynamic filtering applied and drag-and-drop rescheduling support */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-850 bg-slate-950/20">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const hasEvents = cell.dateStr ? filteredEvents.some(e => e.date === cell.dateStr) : false;
                const dayEvents = cell.dateStr ? filteredEvents.filter(e => e.date === cell.dateStr) : [];
                const isToday = cell.dateStr === '2026-05-23'; // Target calendar local date configuration
                const isDraggedOver = cell.dateStr && cell.dateStr === draggedOverDateStr;

                // Check if any event in this day has an upcoming starting reminder
                const hasDayReminder = cell.dateStr && dayEvents.some(evt => {
                  const diff = getMinutesUntilEvent(evt);
                  return diff >= 0 && diff <= 15 && !dismissedReminderIds.includes(evt.id);
                });

                return (
                  <div
                    key={idx}
                    onClick={() => cell.dateStr && setSelectedDateStr(cell.dateStr)}
                    onDragOver={(e) => {
                      if (cell.dateStr) {
                        e.preventDefault();
                        if (draggedOverDateStr !== cell.dateStr) {
                          setDraggedOverDateStr(cell.dateStr);
                        }
                      }
                    }}
                    onDragLeave={() => {
                      if (cell.dateStr && draggedOverDateStr === cell.dateStr) {
                        setDraggedOverDateStr(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (cell.dateStr) {
                        e.preventDefault();
                        const eventId = e.dataTransfer.getData('text/plain');
                        handleEventDrop(eventId, cell.dateStr);
                      }
                    }}
                    className={`p-2 flex flex-col justify-between transition-all duration-200 min-h-[65px] h-full overflow-hidden cursor-pointer relative ${
                      cell.dayNum ? 'hover:bg-slate-900/40' : 'bg-slate-950/40 pointer-events-none'
                    } ${isSelected ? 'bg-indigo-950/20 border-indigo-900 ring-1 ring-inset ring-indigo-500/20' : ''} ${
                      isDraggedOver ? 'bg-indigo-950/50 border-indigo-500 ring-4 ring-indigo-500/30 scale-[1.01] shadow-2xl z-10' : ''
                    }`}
                  >
                    {/* Top Day Info row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded ${
                          isToday 
                            ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' 
                            : cell.dayNum ? 'text-slate-350' : 'text-slate-650'
                        }`}>
                          {cell.dayNum}
                        </span>
                        
                        {cell.dayNum && hasDayReminder && (
                          <span className="relative flex h-2 w-2" title="Upcomimg session starting soon!">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </div>

                      {/* Quick Add indicator if hovered/selected */}
                      {cell.dayNum && isSelected && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEventForm(true);
                          }}
                          className="p-0.5 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-indigo-600 transition"
                          title="Add event to day"
                          id={`quick-add-${cell.dayNum}`}
                        >
                          <Plus size={10} />
                        </button>
                      )}
                    </div>

                    {/* Day events visual preview list with search dynamic filters applied */}
                    <div className="mt-1 flex flex-col space-y-1 overflow-y-auto max-h-[50px] scrollbar-none antialiased">
                      {dayEvents.map(evt => {
                        const style = getTypeStyle(evt.type);
                        const isEvtReminderActive = getMinutesUntilEvent(evt) >= 0 && getMinutesUntilEvent(evt) <= 15 && !dismissedReminderIds.includes(evt.id);
                        
                        return (
                          <div 
                            key={evt.id} 
                            title={`${evt.title} (${evt.time}). Drag to move to another day.`}
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation(); // Stop parent click selected date trigger
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', evt.id);
                            }}
                            className={`text-[8px] font-semibold flex items-center space-x-1 px-1 py-0.25 rounded border transition-all cursor-grab active:cursor-grabbing hover:border-indigo-500/30 ${style.badge} ${
                              isEvtReminderActive ? 'ring-1 ring-rose-500 animate-pulse border-rose-500 font-extrabold text-rose-200' : 'border-transparent'
                            } leading-tight truncate`}
                          >
                            <span className={`w-1 h-1 rounded-full shrink-0 ${isEvtReminderActive ? 'bg-rose-500 animate-ping' : style.dot}`} />
                            <span className="truncate">{evt.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Scheduling Right panel sidebar details */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 bg-slate-900/30 backdrop-blur-md p-4 flex flex-col h-full overflow-y-auto shrink-0 select-text">
        <h3 className="font-display font-[#64748B] font-bold text-xs text-indigo-400 uppercase tracking-wider font-mono mb-3.5 flex items-center space-x-1.5">
          <Calendar size={13} className="text-indigo-400" />
          <span>DAY SCHEDULER BOARD</span>
        </h3>
        
        {/* Dynamic Connected day selection marker */}
        <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl mb-4 text-xs font-mono">
          <p className="text-[10px] text-slate-500 font-bold uppercase">CONNECTED DAY SELECTION</p>
          <p className="text-white font-bold mt-1 text-[13px]">{new Date(selectedDateStr).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Action events planner lists */}
        <div className="space-y-3 mb-4 flex-1">
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/20 border border-slate-850 border-dotted rounded-xl p-4">
              <Sparkles size={18} className="text-indigo-400 opacity-60 mx-auto mb-1.5" />
              <p className="text-[11px] font-mono text-slate-350">No meetings scheduled</p>
              <p className="text-[9.5px] text-slate-500 mt-1">Simulate a collaboration sprint by creating one!</p>
              <button
                onClick={() => setShowEventForm(true)}
                className="mt-3 px-3 py-1 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-450 hover:text-white border border-indigo-900 hover:border-indigo-650 transition rounded font-mono text-[9px] cursor-pointer"
              >
                + Schedule Session
              </button>
            </div>
          ) : (
            selectedDateEvents.map(evt => {
              const creator = getCreatorProfile(evt.createdBy);
              const style = getTypeStyle(evt.type);

              return (
                <div key={evt.id} className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl flex flex-col space-y-2 hover:border-slate-750 transition duration-150">
                  <div className="flex items-center justify-between">
                    <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${style.badge}`}>
                      {evt.type}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 font-mono">
                      <Clock size={11} className="text-slate-500" />
                      <span>{evt.time}</span>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-100 text-xs tracking-tight">{evt.title}</h4>
                    {evt.description && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal italic font-sans">{evt.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 text-[9px] font-mono text-slate-400">
                    <span>Organizer: @{creator.name.split(' ')[0]}</span>
                    
                    {currentUser?.id === evt.createdBy && (
                      <button
                        onClick={() => onDeleteEvent(evt.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded transition cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  {evt.externalMeetLink ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <a
                        href={evt.externalMeetLink.startsWith('http') ? evt.externalMeetLink : `https://${evt.externalMeetLink}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer shadow-sm shadow-indigo-900/20 border border-indigo-550"
                        title="Open external Google Meet / Zoom link"
                      >
                        <Video size={12} className="shrink-0" />
                        <span>Join External Call</span>
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, evt.id, evt.externalMeetLink!)}
                        className="w-full flex items-center justify-center space-x-1.5 py-1.25 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer border border-slate-800"
                        title="Copy External Meeting Link"
                      >
                        {copiedEventId === evt.id ? (
                          <>
                            <Check size={12} className="text-emerald-400 shrink-0" />
                            <span className="text-emerald-400">Copied Link!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="shrink-0" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : evt.roomCode ? (
                    <button
                      onClick={() => setActiveMeetingRoomCode(evt.roomCode || null)}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold font-mono transition mt-1 cursor-pointer shadow-sm shadow-blue-900/20 border border-blue-550"
                      title="Enter Virtual Meet Session Room"
                    >
                      <Video size={12} className="shrink-0" />
                      <span>Join Call ({evt.roomCode})</span>
                    </button>
                  ) : (
                    <div className="text-[8.5px] text-slate-500 text-center uppercase font-mono bg-slate-900 py-1 rounded">
                      🔒 Local Milestone Event
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating schedule scheduler form trigger overlay */}
        {showEventForm ? (
          <form onSubmit={handleCreateEventSubmit} className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3.5 shrink-0" id="calendar-add-event-form">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Schedule Session</h4>
              <button 
                type="button" 
                onClick={() => setShowEventForm(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-450 uppercase mb-1">Session Title</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="Daily Design critique..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-450 uppercase mb-1">Short Scope Overview</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none h-14"
                placeholder="Key parameters, objectives, milestones..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-450 uppercase mb-1">Select Time</label>
                <input
                  type="time"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer text-center font-mono"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-450 uppercase mb-1">Session Category</label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                >
                  <option value="meeting">Meeting 👥</option>
                  <option value="milestone">Milestone 🏁</option>
                  <option value="brainstorm">Brainstorm 💡</option>
                  <option value="social">Social 🍿</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-450 uppercase mb-1">External Call Link (Google Meet / Zoom)</label>
              <input
                type="url"
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="https://meet.google.com/abc-defg-hij or Zoom URL"
                value={formExternalLink}
                onChange={(e) => setFormExternalLink(e.target.value)}
              />
            </div>

            {formType !== 'milestone' && (
              <div className="flex items-center space-x-2 py-0.5">
                <input
                  type="checkbox"
                  id="form-provision-check"
                  checked={formProvisionMeeting}
                  onChange={(e) => setFormProvisionMeeting(e.target.checked)}
                  className="rounded border-slate-850 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                <label htmlFor="form-provision-check" className="text-[10px] font-mono text-slate-350 select-none cursor-pointer">
                  Generate Audio/Video Portal
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-xs font-bold shadow cursor-pointer text-center"
              >
                Schedule
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowEventForm(true)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold font-mono transition cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Schedule Session event</span>
          </button>
        )}
      </div>
    </div>
  );
}
