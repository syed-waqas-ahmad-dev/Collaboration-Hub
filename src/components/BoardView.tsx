import React, { useState } from 'react';
import { Project, Task, WorkspaceUser } from '../types';
import { 
  Trello, 
  Calendar, 
  User, 
  MessageSquare, 
  Plus, 
  Tag, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft,
  ChevronsUpDown,
  X,
  MessageCircle,
  AlertCircle,
  Search,
  Archive,
  CheckSquare,
  Square,
  Trash2,
  ListTodo
} from 'lucide-react';

interface BoardViewProps {
  project: Project | null;
  tasks: Task[];
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onCreateTask: (task: Omit<Task, 'comments'>) => void;
  onUpdateTask: (task: Task) => void;
  onCommentOnTask: (taskId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS: { id: Task['status']; title: string; colorClass: string; bgClass: string }[] = [
  { id: 'backlog', title: 'Backlog', colorClass: 'text-slate-400 border-slate-605', bgClass: 'bg-slate-900/40' },
  { id: 'todo', title: 'To Do', colorClass: 'text-blue-400 border-blue-605', bgClass: 'bg-blue-950/20' },
  { id: 'in_progress', title: 'In Progress', colorClass: 'text-amber-400 border-amber-605', bgClass: 'bg-amber-950/20' },
  { id: 'review', title: 'In Review', colorClass: 'text-purple-400 border-purple-650', bgClass: 'bg-purple-950/20' },
  { id: 'done', title: 'Completed', colorClass: 'text-emerald-400 border-emerald-600', bgClass: 'bg-emerald-950/20' }
];

export default function BoardView({
  project,
  tasks,
  users,
  currentUser,
  onCreateTask,
  onUpdateTask,
  onCommentOnTask,
  onDeleteTask
}: BoardViewProps) {
  const [activeTaskModal, setActiveTaskModal] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // New task form fields
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [newCategory, setNewCategory] = useState<string>('Engineering');
  const [newStatus, setNewStatus] = useState<Task['status']>('todo');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [draggedOverCol, setDraggedOverCol] = useState<Task['status'] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center" id="empty-board-state">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
          <Trello size={30} />
        </div>
        <h3 className="font-display font-medium text-lg text-slate-100">Synchronize Agile Kanban</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select or initialize a portfolio project from the sidebar to visualize workflows and assign milestones.
        </p>
      </div>
    );
  }

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const filteredProjectTasks = tasks.filter(t => {
    const matchesProject = t.projectId === project.id;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'Other' ? !t.category || t.category === 'Other' : t.category === selectedCategory);
    return matchesProject && matchesSearch && matchesCategory;
  });

  const getAssignee = (assigneeId?: string) => {
    return users.find(u => u.id === assigneeId) || null;
  };

  const handleLaunchCreate = (status: Task['status']) => {
    setNewStatus(status);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewCategory('Engineering');
    setNewAssigneeId(currentUser?.id || '');
    setNewDueDate('');
    setShowCreateModal(true);
  };

  const submitCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreateTask({
        id: `task-${Date.now()}`,
        projectId: project.id,
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: newStatus,
        priority: newPriority,
        category: newCategory,
        assigneeId: newAssigneeId || undefined,
        dueDate: newDueDate || undefined
      });
      setShowCreateModal(false);
    }
  };

  const getColumnTitle = (id: Task['status']) => {
    if (id === 'archive') return 'Archived';
    const col = COLUMNS.find(c => c.id === id);
    return col ? col.title : id;
  };

  const updateTaskWithHistory = (taskToUpdate: Task, updatedFields: Partial<Task>) => {
    const isStatusChanged = updatedFields.status !== undefined && updatedFields.status !== taskToUpdate.status;
    const historyEntry = isStatusChanged ? {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId: taskToUpdate.id,
      userId: currentUser?.id || 'anonymous',
      action: `Moved card from "${getColumnTitle(taskToUpdate.status)}" to "${getColumnTitle(updatedFields.status!)}"`,
      timestamp: new Date().toISOString()
    } : null;

    const newHistory = historyEntry ? [...(taskToUpdate.history || []), historyEntry] : taskToUpdate.history;

    onUpdateTask({
      ...taskToUpdate,
      ...updatedFields,
      history: newHistory
    });
  };

  const moveTaskStatus = (task: Task, newStatus: Task['status']) => {
    updateTaskWithHistory(task, { status: newStatus });
  };

  const handleAddSubTask = (taskToUpdate: Task, title: string) => {
    if (!title.trim()) return;
    const newSubTask = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: title.trim(),
      isCompleted: false
    };
    const updatedSubTasks = [...(taskToUpdate.subTasks || []), newSubTask];
    
    const historyEntry = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId: taskToUpdate.id,
      userId: currentUser?.id || 'anonymous',
      action: `Added sub-task: "${title.trim()}"`,
      timestamp: new Date().toISOString()
    };
    
    onUpdateTask({
      ...taskToUpdate,
      subTasks: updatedSubTasks,
      history: [...(taskToUpdate.history || []), historyEntry]
    });
    setNewSubTaskTitle('');
  };

  const handleToggleSubTask = (taskToUpdate: Task, subTaskId: string) => {
    const subTask = (taskToUpdate.subTasks || []).find(st => st.id === subTaskId);
    if (!subTask) return;
    
    const updatedSubTasks = (taskToUpdate.subTasks || []).map(st => 
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    const historyEntry = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId: taskToUpdate.id,
      userId: currentUser?.id || 'anonymous',
      action: `${!subTask.isCompleted ? 'Marked' : 'Unmarked'} sub-task as completed: "${subTask.title}"`,
      timestamp: new Date().toISOString()
    };

    onUpdateTask({
      ...taskToUpdate,
      subTasks: updatedSubTasks,
      history: [...(taskToUpdate.history || []), historyEntry]
    });
  };

  const handleDeleteSubTask = (taskToUpdate: Task, subTaskId: string) => {
    const subTask = (taskToUpdate.subTasks || []).find(st => st.id === subTaskId);
    if (!subTask) return;

    const updatedSubTasks = (taskToUpdate.subTasks || []).filter(st => st.id !== subTaskId);

    const historyEntry = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId: taskToUpdate.id,
      userId: currentUser?.id || 'anonymous',
      action: `Removed sub-task: "${subTask.title}"`,
      timestamp: new Date().toISOString()
    };

    onUpdateTask({
      ...taskToUpdate,
      subTasks: updatedSubTasks,
      history: [...(taskToUpdate.history || []), historyEntry]
    });
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== targetStatus) {
      moveTaskStatus(task, targetStatus);
    }
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommentText.trim() && activeTaskModal) {
      onCommentOnTask(activeTaskModal.id, newCommentText.trim());
      
      // Update local state copy in modal
      const taskInDb = tasks.find(t => t.id === activeTaskModal.id);
      if (taskInDb) {
        const tempComments = [...taskInDb.comments, {
          id: `comment-temp-${Date.now()}`,
          taskId: activeTaskModal.id,
          userId: currentUser?.id || 'guest',
          text: newCommentText.trim(),
          timestamp: new Date().toISOString()
        }];
        setActiveTaskModal({
          ...taskInDb,
          comments: tempComments
        });
      }
      setNewCommentText('');
    }
  };

  // Synchronize modal state if tasks edit happens over socket
  const syncedActiveTask = activeTaskModal 
    ? tasks.find(t => t.id === activeTaskModal.id) || activeTaskModal 
    : null;

  const activeColumns = showArchived
    ? [
        ...COLUMNS,
        { id: 'archive' as Task['status'], title: 'Archived', colorClass: 'text-amber-400 border-amber-900/40', bgClass: 'bg-slate-900/30' }
      ]
    : COLUMNS;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full pb-6 font-sans text-slate-200 bg-slate-950/10" id={`boardview-${project.id}`}>
      
      {/* Kanban Dashboard Header Banner */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-900 bg-slate-900/40 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <Trello size={16} className="text-blue-500" />
            <h2 className="font-display font-semibold text-sm text-white">{project.name}</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono max-w-xs sm:max-w-xl truncate">
            {project.description || 'Sprint cycles tracking.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-start sm:self-auto shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:border-blue-500 transition w-full sm:w-40 md:w-48"
              id="search-tasks-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-0.5 rounded"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 transition cursor-pointer w-full sm:w-36 font-semibold"
              id="filter-category-select"
            >
              <option value="all">All Categories</option>
              <option value="Engineering">⚙️ Engineering</option>
              <option value="Marketing">📈 Marketing</option>
              <option value="UX">🎨 UX</option>
              <option value="Other">📁 Other</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Tag size={12} />
            </div>
          </div>

          {/* Toggle Archived Cards Button */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition duration-150 shrink-0 ${
              showArchived
                ? 'bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-600/20'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            id="toggle-archived-btn"
          >
            <Archive size={12} />
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
          </button>

          <button
            onClick={() => handleLaunchCreate('todo')}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition shadow shrink-0"
            id="add-task-top-btn"
          >
            <Plus size={13} />
            <span>Create Card</span>
          </button>
        </div>
      </div>

      {/* Board Columns container scroll row */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 items-stretch md:items-start select-none snap-y md:snap-x snap-mandatory scroll-smooth scrollbar-thin" id="board-columns-scrollway">
        
        {activeColumns.map((col) => {
          const colTasks = filteredProjectTasks.filter(t => t.status === col.id);
          const isOver = draggedOverCol === col.id;
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedOverCol !== col.id) {
                  setDraggedOverCol(col.id);
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDraggedOverCol(col.id);
              }}
              onDragLeave={() => {
                if (draggedOverCol === col.id) {
                  setDraggedOverCol(null);
                }
              }}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-full md:w-[310px] flex-shrink-0 flex flex-col min-h-[160px] max-h-[320px] md:max-h-full rounded-xl border ${
                isOver 
                  ? 'border-blue-500 bg-slate-900/60 shadow-[inset_0_0_12px_rgba(59,130,246,0.15)] scale-[1.01]' 
                  : 'border-slate-900 ' + col.bgClass
              } p-3 snap-center md:snap-align-none transition-all duration-150`}
              id={`kanban-col-${col.id}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
                <div className="flex items-center space-x-1.5">
                  <span className={`text-xs font-semibold ${col.colorClass}`}>{col.title}</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-900/80 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-800/40">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => handleLaunchCreate(col.id)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition duration-150"
                  id={`create-card-col-${col.id}`}
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Tasks List Stack */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800/40 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-mono italic">No cards here</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assignee = getAssignee(task.assigneeId);
                    const priorityClasses = task.priority === 'high'
                      ? 'border-l-[3px] border-l-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.09)]'
                      : task.priority === 'medium'
                        ? 'border-l-[3px] border-l-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.09)]'
                        : 'border-l-[3px] border-l-slate-600 shadow-sm';
                    return (
                      <div
                        key={task.id}
                        onClick={() => setActiveTaskModal(task)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                        }}
                        onDragEnd={() => setDraggedOverCol(null)}
                        className={`p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl cursor-grab active:cursor-grabbing select-none group transition duration-150 ${priorityClasses}`}
                        id={`task-card-${task.id}`}
                      >
                        {/* Priority & Category Badges */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-wrap gap-1 items-center max-w-[70%]">
                            <span className={`text-[9px] font-mono tracking-wider font-bold uppercase rounded-md px-1.5 py-0.5 ${
                              task.priority === 'high' 
                                ? 'bg-rose-950/50 text-rose-400 border border-rose-900/40' 
                                : task.priority === 'medium'
                                  ? 'bg-amber-950/50 text-amber-400 border border-amber-905/40'
                                  : 'bg-slate-950/70 text-slate-400 border border-slate-850'
                            }`}>
                              {task.priority[0].toUpperCase() + task.priority.slice(1)}
                            </span>
                            {task.category && (
                              <span className={`text-[9px] font-mono tracking-wider font-bold rounded-md px-1.5 py-0.5 flex items-center gap-0.5 ${
                                task.category === 'Engineering'
                                  ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40'
                                  : task.category === 'Marketing'
                                    ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40'
                                    : task.category === 'UX'
                                      ? 'bg-purple-950/60 text-purple-400 border border-purple-900/40'
                                      : 'bg-slate-950/70 text-slate-400 border border-slate-850'
                              }`}>
                                {task.category === 'Engineering' ? '⚙️' : task.category === 'Marketing' ? '📈' : task.category === 'UX' ? '🎨' : '📁'}
                                <span>{task.category}</span>
                              </span>
                            )}
                          </div>
                          
                          {/* Swimlane Fast Switch Dropdown */}
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="opacity-0 group-hover:opacity-100 flex items-center bg-slate-950 p-0.5 rounded border border-slate-850 transition duration-150"
                          >
                            <select
                              value={task.status}
                              onChange={(e) => moveTaskStatus(task, e.target.value as Task['status'])}
                              className="bg-transparent border-none text-[9px] font-mono text-slate-400 focus:outline-none focus:text-white cursor-pointer"
                              title="Move swimlane"
                            >
                              <option value="backlog" className="bg-slate-900">Backlog</option>
                              <option value="todo" className="bg-slate-900">To Do</option>
                              <option value="in_progress" className="bg-slate-900">In Progress</option>
                              <option value="review" className="bg-slate-900">In Review</option>
                              <option value="done" className="bg-slate-900">Completed</option>
                              <option value="archive" className="bg-slate-900">Archive</option>
                            </select>
                          </div>
                        </div>

                        {/* Title & Desc */}
                        <h4 className="text-xs font-semibold text-slate-100 group-hover:text-blue-400 transition mb-1 leading-tight">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-sans">{task.description}</p>

                        {/* Footer details row */}
                        <div className="flex items-center justify-between border-t border-slate-800/60 mt-3 pt-2">
                          <div className="flex items-center space-x-2.5">
                            {task.dueDate && (
                              <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-450">
                                <Calendar size={10} />
                                <span>{task.dueDate.substring(5)}</span>
                              </div>
                            )}
                            {task.comments.length > 0 && (
                              <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-400">
                                <MessageCircle size={10} />
                                <span>{task.comments.length}</span>
                              </div>
                            )}
                            {task.subTasks && task.subTasks.length > 0 && (
                              <div className="flex items-center space-x-1 text-[9px] font-mono text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 rounded px-1 py-0.5" title="Sub-tasks progress">
                                <ListTodo size={10} />
                                <span>
                                  {task.subTasks.filter(st => st.isCompleted).length}/{task.subTasks.length}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Assignee Bubble */}
                          {assignee ? (
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono"
                              style={{ backgroundColor: `${assignee.color}25`, border: `1px solid ${assignee.color}` }}
                              title={`Assigned to: ${assignee.name}`}
                            >
                              {assignee.avatar}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600" title="Unassigned">
                              <User size={9} />
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

      </div>

      {/* DETAILED TASK DIALOG / MODAL */}
      {syncedActiveTask && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-[calc(100%-1.5rem)] max-w-lg mx-3 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]" id="task-detail-modal">
            
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/45">
              <div className="flex items-center space-x-2">
                <Trello size={15} className="text-blue-500" />
                <span className="text-[10px] font-mono text-slate-400">CARD DETAILS (#{syncedActiveTask.id})</span>
              </div>
              <button 
                onClick={() => setActiveTaskModal(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                id="close-task-detail-btn"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content pane */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
              
              {/* Title Section */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Title</p>
                <h3 className="font-display font-semibold text-sm md:text-base text-white">{syncedActiveTask.title}</h3>
                <p className="text-xs text-slate-300 mt-2 font-sans bg-slate-950/40 border border-slate-850 p-2.5 md:p-3 rounded-lg leading-relaxed">
                  {syncedActiveTask.description || 'No description provided.'}
                </p>
              </div>

              {/* Grid Segment fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Swimlane State */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Swimlane</p>
                  <select
                    value={syncedActiveTask.status}
                    onChange={(e) => {
                      updateTaskWithHistory(syncedActiveTask, { status: e.target.value as Task['status'] });
                    }}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    id="edit-task-status"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Category</p>
                  <select
                    value={syncedActiveTask.category || ''}
                    onChange={(e) => {
                      updateTaskWithHistory(syncedActiveTask, { category: e.target.value || undefined });
                    }}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-semibold"
                    id="edit-task-category"
                  >
                    <option value="">None</option>
                    <option value="Engineering">⚙️ Engineering</option>
                    <option value="Marketing">📈 Marketing</option>
                    <option value="UX">🎨 UX</option>
                    <option value="Other">📁 Other</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Priority</p>
                  <select
                    value={syncedActiveTask.priority}
                    onChange={(e) => {
                      updateTaskWithHistory(syncedActiveTask, { priority: e.target.value as Task['priority'] });
                    }}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    id="edit-task-priority"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Assignee</p>
                  <select
                    value={syncedActiveTask.assigneeId || ''}
                    onChange={(e) => {
                      updateTaskWithHistory(syncedActiveTask, { assigneeId: e.target.value || undefined });
                    }}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    id="edit-task-assignee"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Deadline</p>
                  <input
                    type="date"
                    value={syncedActiveTask.dueDate || ''}
                    onChange={(e) => {
                      updateTaskWithHistory(syncedActiveTask, { dueDate: e.target.value || undefined });
                    }}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                    id="edit-task-duedate"
                  />
                </div>
              </div>

              {/* Task Sub-tasks Section */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ListTodo size={14} className="text-slate-400" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Sub-tasks ({(syncedActiveTask.subTasks || []).filter(st => st.isCompleted).length}/{(syncedActiveTask.subTasks || []).length})
                    </p>
                  </div>
                  {syncedActiveTask.subTasks && syncedActiveTask.subTasks.length > 0 && (
                    <span className="text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {Math.round(((syncedActiveTask.subTasks || []).filter(st => st.isCompleted).length / syncedActiveTask.subTasks.length) * 100)}% complete
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {syncedActiveTask.subTasks && syncedActiveTask.subTasks.length > 0 && (
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-850/50">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-300" 
                      style={{ 
                        width: `${((syncedActiveTask.subTasks || []).filter(st => st.isCompleted).length / syncedActiveTask.subTasks.length) * 100}%` 
                      }} 
                    />
                  </div>
                )}

                {/* Sub-tasks list */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {(!syncedActiveTask.subTasks || syncedActiveTask.subTasks.length === 0) ? (
                    <p className="text-[10px] text-slate-500 italic pl-1">No sub-tasks defined for this milestone.</p>
                  ) : (
                    syncedActiveTask.subTasks.map(st => (
                      <div 
                        key={st.id} 
                        className="flex items-center justify-between p-2 bg-slate-950/40 hover:bg-slate-950/75 rounded-lg border border-slate-850 transition duration-150 group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubTask(syncedActiveTask, st.id)}
                          className="flex items-center space-x-2 text-xs text-left text-slate-300 hover:text-white transition flex-1 focus:outline-none"
                        >
                          {st.isCompleted ? (
                            <CheckSquare size={14} className="text-indigo-400 shrink-0" />
                          ) : (
                            <Square size={14} className="text-slate-500 hover:text-slate-400 shrink-0" />
                          )}
                          <span className={`leading-snug break-words pr-2 ${st.isCompleted ? 'line-through text-slate-500' : ''}`}>
                            {st.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubTask(syncedActiveTask, st.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 opacity-0 group-hover:opacity-100 transition duration-150"
                          title="Delete sub-task"
                          id={`delete-subtask-${st.id}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Sub-task form input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new sub-task..."
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubTask(syncedActiveTask, newSubTaskTitle);
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-100 px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                    id="new-subtask-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubTask(syncedActiveTask, newSubTaskTitle)}
                    className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg font-semibold text-xs transition duration-150 shrink-0"
                    id="add-subtask-btn"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Task History Audit Trail */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Card Life Cycle Audit Trail ({(syncedActiveTask.history || []).length})</p>
                <div className="space-y-2 max-h-36 overflow-y-auto pl-1 pr-1 scrollbar-thin">
                  {(!syncedActiveTask.history || syncedActiveTask.history.length === 0) ? (
                    <p className="text-[10px] text-slate-500 italic">No movements recorded yet on this card.</p>
                  ) : (
                    <div className="relative border-l border-slate-800 ml-1.5 pl-3.5 space-y-3 py-1">
                      {syncedActiveTask.history.map((h) => {
                        const actor = users.find(u => u.id === h.userId) || { name: 'System', avatar: '💻', color: '#64748B' };
                        const logTime = new Date(h.timestamp);
                        return (
                          <div key={h.id} className="relative text-[11px] leading-relaxed">
                            {/* Dot indicator */}
                            <span 
                              className="absolute -left-[19.5px] top-1.5 w-2.5 h-2.5 rounded-full border border-slate-900"
                              style={{ backgroundColor: actor.color || '#3b82f6' }}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between text-slate-350 gap-0.5 sm:gap-2">
                              <div>
                                <span className="font-semibold text-slate-200 mr-1.5">{actor.avatar} {actor.name}</span>
                                <span>{h.action}</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                {logTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} {logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Task Comments Stream */}
              <div className="border-t border-slate-800 pt-4 space-y-3.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Collaboration Activity Stream ({syncedActiveTask.comments.length})</p>
                
                <div className="space-y-2.5 max-h-40 overflow-y-auto">
                  {syncedActiveTask.comments.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No notes posted on this canvas yet.</p>
                  ) : (
                    syncedActiveTask.comments.map(c => {
                      const commentAuthor = users.find(u => u.id === c.userId) || { name: 'Guest Node', color: '#64748B', avatar: '👤' };
                      return (
                        <div key={c.id} className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-850 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-200 flex items-center space-x-1">
                              <span>{commentAuthor.avatar}</span>
                              <span>{commentAuthor.name}</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-350">{c.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Post comment form */}
                {currentUser ? (
                  <form onSubmit={submitComment} className="flex gap-2 bg-slate-950 p-2 rounded-lg border border-slate-850">
                    <input
                      type="text"
                      placeholder="Add an update or comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-100 focus:outline-none placeholder-slate-500"
                      required
                      id="comment-input"
                    />
                    <button 
                      type="submit" 
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-[10px]"
                    >
                      Post Note
                    </button>
                  </form>
                ) : (
                  <p className="text-[10px] text-slate-500 bg-slate-950 p-2 rounded border border-dashed border-slate-800 text-center">
                    Simulate workspace identity in sidebar to comment.
                  </p>
                )}
              </div>

            </div>

            {/* Footer triggers */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex justify-between">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this card? This updates all clients globally.')) {
                    onDeleteTask(syncedActiveTask.id);
                    setActiveTaskModal(null);
                  }
                }}
                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-900/40 hover:border-rose-500/50 rounded-lg text-[10px] font-mono transition"
                id="delete-task-btn"
              >
                Delete Card
              </button>
              <button
                onClick={() => setActiveTaskModal(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-750 text-xs text-slate-300 rounded-lg font-medium transition"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50">
          <form onSubmit={submitCreateTask} className="bg-slate-905 bg-slate-900 border border-slate-800 w-[calc(100%-1.5rem)] max-w-md mx-3 rounded-2xl shadow-2xl overflow-hidden text-slate-100" id="create-task-modal">
            
            <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-950/45 flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-1.5">
                <Plus size={15} className="text-blue-500" />
                <span>Initialize Task Card</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Redefine container build scripts"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                  id="create-task-title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Scope description</label>
                <textarea
                  placeholder="Identify milestones and file alignments in this backlog segment."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-20"
                  id="create-task-desc"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:text-white"
                    id="create-task-priority"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Column */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Column</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Task['status'])}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:text-white"
                    id="create-task-status"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:text-white font-semibold"
                    id="create-task-category"
                  >
                    <option value="Engineering">⚙️ Engineering</option>
                    <option value="Marketing">📈 Marketing</option>
                    <option value="UX">🎨 UX</option>
                    <option value="Other">📁 Other</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Assign User</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:text-white"
                    id="create-task-assignee"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Target date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:text-white cursor-pointer"
                    id="create-task-date"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-755 text-xs text-slate-300 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition shadow"
                id="create-task-submit-btn"
              >
                Publish Card
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
