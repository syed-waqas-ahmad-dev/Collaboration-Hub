export interface WorkspaceUser {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  online: boolean;
  typingIn?: string; // e.g. "channel_id" or undefined
}

export interface Channel {
  id: string;
  name: string;
  description: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  timestamp: string;
  replies?: MessageReply[];
  reactions?: { [emoji: string]: string[] }; // emoji => array of userIds
}

export interface MessageReply {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  userId: string;
  action: string; // e.g., "Moved from todo to in_progress"
  timestamp: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archive';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  assigneeId?: string;
  dueDate?: string;
  comments: TaskComment[];
  history?: TaskHistoryEntry[];
  subTasks?: SubTask[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface WhiteboardComment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface WhiteboardElement {
  id: string;
  type: 'pencil' | 'note' | 'rect' | 'circle';
  color: string;
  points?: number[]; // [x1, y1, x2, y2, ...] for pencil drawing
  x?: number; // for shapes / notes
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  createdBy: string;
  isDeleted?: boolean;
  isLocked?: boolean;
  comments?: WhiteboardComment[];
}

export interface CollaborativeDocument {
  text: string;
  version: number;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'meeting' | 'milestone' | 'brainstorm' | 'social';
  createdBy: string;
  roomCode?: string; // Google Meet simulation code, e.g. "meet-xyz"
  externalMeetLink?: string; // Google Meet or Zoom URL link
}

export interface GlobalState {
  users: WorkspaceUser[];
  channels: Channel[];
  messages: Message[];
  projects: Project[];
  tasks: Task[];
  document: CollaborativeDocument;
  whiteboard: WhiteboardElement[];
  calendarEvents?: CalendarEvent[];
}
