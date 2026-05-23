import React, { useRef, useState, useEffect } from 'react';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { jsPDF } from 'jspdf';
import { WhiteboardElement, WorkspaceUser } from '../types';
import { 
  Globe, 
  Trash2, 
  Square, 
  Edit3, 
  StickyNote, 
  Palette, 
  Layers, 
  CheckCircle, 
  Info,
  MousePointer,
  Download,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  Grid,
  Magnet,
  Lock,
  Unlock,
  MessageSquare
} from 'lucide-react';

interface WhiteboardAction {
  type: 'add' | 'update' | 'delete' | 'multi-update' | 'multi-delete';
  elementId?: string;
  before?: WhiteboardElement;
  after?: WhiteboardElement;
  elementsBefore?: WhiteboardElement[];
  elementsAfter?: WhiteboardElement[];
}

interface WhiteboardViewProps {
  elements: WhiteboardElement[];
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onAddElement: (element: WhiteboardElement) => void;
  onUpdateElement: (element: WhiteboardElement) => void;
  onClearWhiteboard: () => void;
}

const NOTE_COLORS = [
  { hex: '#FEF08A', name: 'Canary Yellow' },
  { hex: '#BFDBFE', name: 'Sky Blue' },
  { hex: '#BBF7D0', name: 'Mint Green' },
  { hex: '#FBCFE8', name: 'Blush Pink' },
  { hex: '#DDD6FE', name: 'Lavender Purple' }
];

const NOTE_TEMPLATES = [
  { id: 'Empty', name: 'Empty Note', description: 'Simple blank sheet', text: 'New Brainstorm Note.\nDouble click to edit.' },
  { id: 'SWOT', name: 'SWOT Analysis', description: 'Strength, Weakness, Opportunity, Threat matrix', text: 'STRENGTHS:\n- High speed\nWEAKNESSES:\n- Lack documentation\nOPPORTUNITIES:\n- Expand market\nTHREATS:\n- High competition' },
  { id: 'User Story', name: 'User Story', description: 'Agile design representation', text: 'AS A: <User>\nI WANT TO: <Goal>\nSO THAT: <Benefit>' },
  { id: 'Action Item', name: 'Action Item', description: 'Task assignee checklist', text: 'TASK: Complete system refactor\nASSIGNEE: @Team\nDUE DATE: 2026-06-01\nSTATUS: [ ] Todo' },
  { id: 'Icebreaker', name: 'Icebreaker', description: 'Interactive prompt', text: 'PROMPT: If you could gain any superpower, what would it be?\n\nYOUR ANSWER:\n- ' }
];

const GRID_SIZE = 24;

export default function WhiteboardView({
  elements,
  users,
  currentUser,
  onAddElement,
  onUpdateElement,
  onClearWhiteboard
}: WhiteboardViewProps) {
  const [tool, setTool] = useState<'select' | 'pencil' | 'note' | 'pan'>('select');
  const [selectedColor, setSelectedColor] = useState('#FEF08A');
  const [drawingPoints, setDrawingPoints] = useState<number[] | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [noteInputId, setNoteInputId] = useState<string | null>(null);
  const [noteInputText, setNoteInputText] = useState('');

  // Templates & Threaded comments states
  const [selectedTemplate, setSelectedTemplate] = useState('Empty');
  const [activeCommentsNoteId, setActiveCommentsNoteId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Zoom and Pan Viewport States
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Undo and Redo Operation Command Stacks
  const [undoStack, setUndoStack] = useState<WhiteboardAction[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardAction[]>([]);

  // Grid layout visual toggle and snap-alignment preferences
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Refs for navigation dragging, edit tracking, and undo operations
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragStartElementRef = useRef<WhiteboardElement | null>(null);
  const textStartElementRef = useRef<WhiteboardElement | null>(null);

  // Group selection states & tracking refs
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  const isDrawingSelectionBoxRef = useRef(false);
  const selectionStartCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartGroupStatesRef = useRef<WhiteboardElement[]>([]);
  const draggedGroupStartRef = useRef<Record<string, { x: number; y: number }>>({});
  const preSpaceToolRef = useRef<'select' | 'pencil' | 'note' | 'pan' | null>(null);
  const isSpacePressedRef = useRef(false);

  // Resize states and color update helpers
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState({ width: 200, height: 150 });
  const [resizeStartMouse, setResizeStartMouse] = useState({ x: 0, y: 0 });

  // D3 Zoom Controller Setup
  useEffect(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .filter((event: any) => {
        // Allow wheel zoom
        if (event.type === 'wheel') return true;
        
        // Allow multi-touch pinch zoom
        if (event.touches && event.touches.length > 1) return true;
        
        if (event.type === 'touchstart') {
          return tool === 'pan';
        }
        
        // Allow panning with standard clicks when in pan mode
        if (tool === 'pan') {
          return event.button === 0 || event.button === 1;
        }
        
        // Force support for Middle Click pan in any active modes
        if (event.button === 1) return true;
        
        return false;
      })
      .on('zoom', (event) => {
        const { transform } = event;
        setPan({ x: transform.x, y: transform.y });
        setZoom(transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;

    const selection = select(svgEl).call(zoomBehavior);

    // Disable double-click-to-zoom to prevent overlapping Sticky note click triggers
    selection.on('dblclick.zoom', null);

    return () => {
      zoomBehavior.on('zoom', null);
    };
  }, [tool]);

  const updateSelectedElementsColor = (newColor: string) => {
    const affected = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'note' && !el.isLocked && el.color !== newColor);
    if (affected.length === 0) return;

    const beforeStates = affected.map(el => ({ ...el }));
    const afterStates = affected.map(el => ({ ...el, color: newColor }));

    afterStates.forEach(el => onUpdateElement(el));

    setUndoStack(prev => [...prev, {
      type: 'multi-update',
      elementsBefore: beforeStates,
      elementsAfter: afterStates
    }]);
    setRedoStack([]);
  };

  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Reverse transform using translate and zoom coefficients
    const x = (clientX - pan.x) / zoom;
    const y = (clientY - pan.y) / zoom;
    return { x, y };
  };

  // Pencil and canvas event handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentUser) return;
    
    // Only drag or draw with left mouse click
    if (e.button !== 0) return;

    const { x, y } = getSvgCoordinates(e);

    if (tool === 'pencil') {
      setDrawingPoints([x, y]);
    } else if (tool === 'note') {
      // Create new Note element
      let noteX = x - 100;
      let noteY = y - 75;
      if (snapToGrid) {
        noteX = Math.round(noteX / GRID_SIZE) * GRID_SIZE;
        noteY = Math.round(noteY / GRID_SIZE) * GRID_SIZE;
      }
      const templateObj = NOTE_TEMPLATES.find(t => t.id === selectedTemplate) || NOTE_TEMPLATES[0];
      const newNote: WhiteboardElement = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'note',
        color: selectedColor,
        x: noteX, // Center note around click slightly
        y: noteY,
        width: 200,
        height: 150,
        text: templateObj.text,
        createdBy: currentUser.id,
        comments: []
      };
      onAddElement(newNote);
      setUndoStack(prev => [...prev, { type: 'add', elementId: newNote.id, after: newNote }]);
      setRedoStack([]); // Clear Redo
      setTool('select'); // Default back to selecting
    } else if (tool === 'select') {
      // Start Drawing Selection Box on empty canvas (since note clicks with stopPropagation don't get here)
      isDrawingSelectionBoxRef.current = true;
      selectionStartCoordsRef.current = { x, y };
      if (!e.shiftKey) {
        setSelectedElementIds([]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = getSvgCoordinates(e);

    if (tool === 'pencil' && drawingPoints) {
      if (e.shiftKey && drawingPoints.length >= 2) {
        // Orthogonal snapping relative to start point
        const startX = drawingPoints[0];
        const startY = drawingPoints[1];
        const dx = Math.abs(x - startX);
        const dy = Math.abs(y - startY);
        if (dx > dy) {
          // Horizontal line
          setDrawingPoints([startX, startY, x, startY]);
        } else {
          // Vertical line
          setDrawingPoints([startX, startY, startX, y]);
        }
      } else {
        setDrawingPoints([...drawingPoints, x, y]);
      }
    } else if (isDrawingSelectionBoxRef.current && selectionStartCoordsRef.current) {
      // Drawing Selection Bounding Box update
      const startX = selectionStartCoordsRef.current.x;
      const startY = selectionStartCoordsRef.current.y;
      setSelectionBox({
        startX,
        startY,
        endX: x,
        endY: y
      });

      const box_x_min = Math.min(startX, x);
      const box_y_min = Math.min(startY, y);
      const box_x_max = Math.max(startX, x);
      const box_y_max = Math.max(startY, y);

      const enclosedNoteIds = elements
        .filter(el => el.type === 'note' && !el.isDeleted)
        .filter(note => {
          const noteW = note.width || 200;
          const noteH = note.height || 150;
          const noteX = note.x || 0;
          const noteY = note.y || 0;
          return noteX < box_x_max && 
                 noteX + noteW > box_x_min && 
                 noteY < box_y_max && 
                 noteY + noteH > box_y_min;
        })
        .map(el => el.id);

      if (e.shiftKey) {
        setSelectedElementIds(prev => Array.from(new Set([...prev, ...enclosedNoteIds])));
      } else {
        setSelectedElementIds(enclosedNoteIds);
      }
    } else if (resizingNoteId) {
      const element = elements.find(el => el.id === resizingNoteId);
      if (element && !element.isLocked) {
        const deltaX = x - resizeStartMouse.x;
        const deltaY = y - resizeStartMouse.y;
        
        let newWidth = Math.max(120, resizeStartSize.width + deltaX);
        let newHeight = Math.max(90, resizeStartSize.height + deltaY);

        if (snapToGrid) {
          newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
          newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
        }

        onUpdateElement({
          ...element,
          width: newWidth,
          height: newHeight
        });
      }
    } else if (draggedElementId) {
      // Dragging selected element(s) group
      const deltaX = x - dragOffset.x;
      const deltaY = y - dragOffset.y;

      selectedElementIds.forEach(id => {
        const startPos = draggedGroupStartRef.current[id];
        if (startPos) {
          const element = elements.find(el => el.id === id);
          if (element && element.type === 'note') {
            let noteX = startPos.x + deltaX;
            let noteY = startPos.y + deltaY;
            if (snapToGrid) {
              noteX = Math.round(noteX / GRID_SIZE) * GRID_SIZE;
              noteY = Math.round(noteY / GRID_SIZE) * GRID_SIZE;
            }
            onUpdateElement({
              ...element,
              x: noteX,
              y: noteY
            });
          }
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (tool === 'pencil' && drawingPoints && drawingPoints.length > 4 && currentUser) {
      const newPath: WhiteboardElement = {
        id: `pencil-${Date.now()}`,
        type: 'pencil',
        color: selectedColor === '#FEF08A' ? '#3B82F6' : selectedColor, // Use darker lines
        points: drawingPoints,
        createdBy: currentUser.id
      };
      onAddElement(newPath);
      setUndoStack(prev => [...prev, { type: 'add', elementId: newPath.id, after: newPath }]);
      setRedoStack([]);
    }

    // Handle Selection Box closure
    if (isDrawingSelectionBoxRef.current) {
      setSelectionBox(null);
      isDrawingSelectionBoxRef.current = false;
      selectionStartCoordsRef.current = null;
    }

    // Record dragging complete inside Undo history for single or group drag
    if (draggedElementId && dragStartGroupStatesRef.current.length > 0) {
      const beforeStates = dragStartGroupStatesRef.current;
      const afterStates = elements.filter(el => beforeStates.some(b => b.id === el.id));
      
      const moved = beforeStates.some(before => {
        const after = afterStates.find(a => a.id === before.id);
        return after && (after.x !== before.x || after.y !== before.y);
      });

      if (moved) {
        if (beforeStates.length === 1) {
          setUndoStack(prev => [...prev, {
            type: 'update',
            elementId: beforeStates[0].id,
            before: beforeStates[0],
            after: { ...afterStates.find(a => a.id === beforeStates[0].id)! }
          }]);
        } else {
          setUndoStack(prev => [...prev, {
            type: 'multi-update',
            elementsBefore: beforeStates,
            elementsAfter: afterStates.map(el => ({ ...el }))
          }]);
        }
        setRedoStack([]);
      }
      dragStartGroupStatesRef.current = [];
    }

    // Record resizing complete inside Undo history
    if (resizingNoteId) {
      const afterElement = elements.find(el => el.id === resizingNoteId);
      const beforeElement = dragStartElementRef.current;
      if (afterElement && beforeElement && (beforeElement.width !== afterElement.width || beforeElement.height !== afterElement.height)) {
        setUndoStack(prev => [...prev, {
          type: 'update',
          elementId: resizingNoteId,
          before: beforeElement,
          after: { ...afterElement }
        }]);
        setRedoStack([]);
      }
      setResizingNoteId(null);
    }

    setDrawingPoints(null);
    setDraggedElementId(null);
    isDraggingCanvasRef.current = false;
  };

  // Drag handles for notes
  const startDragNote = (e: React.MouseEvent, element: WhiteboardElement) => {
    if (tool !== 'select' || !currentUser) return;
    e.stopPropagation();
    
    let nextSelection = [...selectedElementIds];
    if (e.shiftKey) {
      if (nextSelection.includes(element.id)) {
        nextSelection = nextSelection.filter(id => id !== element.id);
      } else {
        nextSelection.push(element.id);
      }
    } else {
      if (!nextSelection.includes(element.id)) {
        nextSelection = [element.id];
      }
    }
    setSelectedElementIds(nextSelection);

    if (element.isLocked) {
      return; // Do not register dragging offsets for locked sticky notes
    }

    // Save starting pos of all elements in active selection for relative drag calculations
    const dragStartedNotes: Record<string, { x: number; y: number }> = {};
    const beforeGroupStates: WhiteboardElement[] = [];

    elements.forEach(el => {
      if (nextSelection.includes(el.id) && el.type === 'note' && !el.isDeleted) {
        dragStartedNotes[el.id] = { x: el.x || 0, y: el.y || 0 };
        beforeGroupStates.push({ ...el });
      }
    });

    draggedGroupStartRef.current = dragStartedNotes;
    dragStartGroupStatesRef.current = beforeGroupStates;
    dragStartElementRef.current = { ...element }; // legacy single-element coordinate fallback

    if (svgRef.current) {
      const { x: virtualMouseX, y: virtualMouseY } = getSvgCoordinates(e as unknown as React.MouseEvent<SVGSVGElement>);
      
      setDraggedElementId(element.id);
      setDragOffset({
        x: virtualMouseX, // Absolute start coords to compute delta
        y: virtualMouseY
      });
    }
  };

  const handleLaunchTextEdit = (element: WhiteboardElement) => {
    if (!currentUser || element.isLocked) return;
    textStartElementRef.current = { ...element };
    setNoteInputId(element.id);
    setNoteInputText(element.text || '');
  };

  const submitNoteUpdate = (element: WhiteboardElement) => {
    const updated = {
      ...element,
      text: noteInputText
    };
    onUpdateElement(updated);
    
    // Log Undo history entry if text edits occurred
    if (textStartElementRef.current && textStartElementRef.current.text !== noteInputText) {
      setUndoStack(prev => [...prev, {
        type: 'update',
        elementId: element.id,
        before: textStartElementRef.current!,
        after: updated
      }]);
      setRedoStack([]);
    }
    setNoteInputId(null);
  };

  const handleDeleteNote = (e: React.MouseEvent, element: WhiteboardElement) => {
    e.stopPropagation();
    if (element.isLocked) return;
    const updated = { ...element, isDeleted: true };
    onUpdateElement(updated);
    
    setUndoStack(prev => [...prev, {
      type: 'delete',
      elementId: element.id,
      before: element,
      after: updated
    }]);
    setRedoStack([]);
    
    // Filter deleted from selection list
    setSelectedElementIds(prev => prev.filter(id => id !== element.id));
  };

  // Group Deletion Helper Action
  const handleDeleteSelected = () => {
    setSelectedElementIds(prevIds => {
      if (prevIds.length === 0) return prevIds;
      
      const elementsToDelete = elements.filter(el => prevIds.includes(el.id) && !el.isDeleted && !el.isLocked);
      if (elementsToDelete.length === 0) return prevIds;

      const beforeStates = elementsToDelete.map(el => ({ ...el }));
      const afterStates = elementsToDelete.map(el => ({ ...el, isDeleted: true }));

      afterStates.forEach(el => onUpdateElement(el));

      setUndoStack(prev => [...prev, {
        type: 'multi-delete',
        elementsBefore: beforeStates,
        elementsAfter: afterStates
      }]);
      setRedoStack([]);
      
      // Keep locked items selected
      return prevIds.filter(id => !elementsToDelete.some(el => el.id === id));
    });
  };

  // Start resizing sticky notes
  const startResizeNote = (e: React.MouseEvent, element: WhiteboardElement) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser || element.isLocked) return;

    setResizingNoteId(element.id);
    setResizeStartSize({
      width: element.width || 200,
      height: element.height || 150
    });
    
    const { x, y } = getSvgCoordinates(e as unknown as React.MouseEvent<SVGSVGElement>);
    setResizeStartMouse({ x, y });
    dragStartElementRef.current = { ...element };
  };

  // Undo and Redo operations
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    if (action.type === 'add' && action.elementId) {
      const el = elements.find(e => e.id === action.elementId);
      if (el) {
        onUpdateElement({ ...el, isDeleted: true });
      }
    } else if (action.type === 'update') {
      if (action.before) {
        onUpdateElement(action.before);
      }
    } else if (action.type === 'delete') {
      if (action.before) {
        onUpdateElement({ ...action.before, isDeleted: false });
      }
    } else if (action.type === 'multi-update' && action.elementsBefore) {
      action.elementsBefore.forEach(el => onUpdateElement(el));
    } else if (action.type === 'multi-delete' && action.elementsBefore) {
      action.elementsBefore.forEach(el => onUpdateElement({ ...el, isDeleted: false }));
    }
    
    setRedoStack(prev => [...prev, action]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    
    if (action.type === 'add' && action.elementId) {
      const el = elements.find(e => e.id === action.elementId);
      if (el) {
        onUpdateElement({ ...el, isDeleted: false });
      } else if (action.after) {
        onUpdateElement({ ...action.after, isDeleted: false });
      }
    } else if (action.type === 'update') {
      if (action.after) {
        onUpdateElement(action.after);
      }
    } else if (action.type === 'delete') {
      const el = elements.find(e => e.id === action.elementId);
      if (el) {
        onUpdateElement({ ...el, isDeleted: true });
      }
    } else if (action.type === 'multi-update' && action.elementsAfter) {
      action.elementsAfter.forEach(el => onUpdateElement(el));
    } else if (action.type === 'multi-delete' && action.elementsAfter) {
      action.elementsAfter.forEach(el => onUpdateElement({ ...el, isDeleted: true }));
    }
    
    setUndoStack(prev => [...prev, action]);
  };

  // Keyboard hotkeys mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Spacebar panning lock (hold down space for panning)
      if (e.key === ' ' || e.code === 'Space') {
        if (!isSpacePressedRef.current) {
          isSpacePressedRef.current = true;
          preSpaceToolRef.current = tool;
          setTool('pan');
        }
        e.preventDefault();
        return;
      }

      // Mode switching: V (Select), P (Pencil), N (Note), H (Pan)
      if (key === 'v') {
        setTool('select');
        return;
      }
      if (key === 'p') {
        setTool('pencil');
        return;
      }
      if (key === 'n') {
        setTool('note');
        return;
      }
      if (key === 'h') {
        setTool('pan');
        return;
      }

      // Deleting a selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Toggle options: G (Grid), S (Snap)
      if (key === 'g') {
        setShowGrid(prev => !prev);
        return;
      }
      if (key === 's') {
        setSnapToGrid(prev => !prev);
        return;
      }

      // Select all: Ctrl+A / Cmd+A
      if ((e.ctrlKey || e.metaKey) && key === 'a') {
        e.preventDefault();
        const selectableIds = elements
          .filter(el => el.type === 'note' && !el.isDeleted)
          .map(el => el.id);
        setSelectedElementIds(selectableIds);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        isSpacePressedRef.current = false;
        if (preSpaceToolRef.current) {
          setTool(preSpaceToolRef.current);
          preSpaceToolRef.current = null;
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoStack, redoStack, elements, selectedElementIds, tool, showGrid, snapToGrid]);

  const getCreatorProfile = (userId: string) => {
    return users.find(u => u.id === userId) || { name: 'Unknown', color: '#64748B' };
  };

  const selectedNoteForComments = elements.find(el => el.id === activeCommentsNoteId);
  const activeNoteComments = selectedNoteForComments?.comments || [];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeCommentsNoteId || !newCommentText.trim()) return;

    const targetNote = elements.find(el => el.id === activeCommentsNoteId);
    if (!targetNote) return;

    const newComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser.id,
      text: newCommentText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(targetNote.comments || []), newComment];
    const updatedNote = {
      ...targetNote,
      comments: updatedComments
    };

    onUpdateElement(updatedNote);

    setUndoStack(prev => [...prev, {
      type: 'update',
      elementId: targetNote.id,
      before: targetNote,
      after: updatedNote
    }]);
    setRedoStack([]);
    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!currentUser || !activeCommentsNoteId) return;

    const targetNote = elements.find(el => el.id === activeCommentsNoteId);
    if (!targetNote) return;

    const updatedComments = (targetNote.comments || []).filter(c => c.id !== commentId);
    const updatedNote = {
      ...targetNote,
      comments: updatedComments
    };

    onUpdateElement(updatedNote);

    setUndoStack(prev => [...prev, {
      type: 'update',
      elementId: targetNote.id,
      before: targetNote,
      after: updatedNote
    }]);
    setRedoStack([]);
  };

  const handleDownloadPDF = () => {
    try {
      const activeNotes = elements.filter(el => el.type === 'note' && !el.isDeleted);
      const activePencil = elements.filter(el => el.type === 'pencil' && !el.isDeleted);

      if (activeNotes.length === 0 && activePencil.length === 0) {
        alert("The team whiteboard is empty! Place a sticky note or sketch first to export PDF.");
        return;
      }

      // 1. Calculate the bounding box of elements
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      activeNotes.forEach(note => {
        const nx = note.x || 0;
        const ny = note.y || 0;
        const nw = note.width || 200;
        const nh = note.height || 150;
        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx + nw);
        maxY = Math.max(maxY, ny + nh);
      });

      activePencil.forEach(p => {
        if (!p.points) return;
        for (let i = 0; i < p.points.length; i += 2) {
          const px = p.points[i];
          const py = p.points[i+1];
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      });

      const padding = 80;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const width = Math.max(800, maxX - minX);
      const height = Math.max(600, maxY - minY);

      // Create high-DPI canvas
      const canvas = document.createElement('canvas');
      const scale = 1.5;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(-minX, -minY);

      if (showGrid) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
        const startX = Math.floor(minX / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor(minY / GRID_SIZE) * GRID_SIZE;
        const endX = Math.ceil(maxX / GRID_SIZE) * GRID_SIZE;
        const endY = Math.ceil(maxY / GRID_SIZE) * GRID_SIZE;

        for (let gx = startX; gx <= endX; gx += GRID_SIZE) {
          for (let gy = startY; gy <= endY; gy += GRID_SIZE) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      activePencil.forEach(p => {
        if (!p.points || p.points.length < 4) return;
        ctx.beginPath();
        ctx.strokeStyle = p.color || '#3B82F6';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(p.points[0], p.points[1]);
        for (let i = 2; i < p.points.length; i += 2) {
          ctx.lineTo(p.points[i], p.points[i + 1]);
        }
        ctx.stroke();
      });

      activeNotes.forEach(note => {
        const nx = note.x || 0;
        const ny = note.y || 0;
        const nw = note.width || 200;
        const nh = note.height || 150;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        ctx.fillStyle = note.color || '#FEF08A';
        ctx.beginPath();
        const radius = 12;
        ctx.moveTo(nx + radius, ny);
        ctx.lineTo(nx + nw - radius, ny);
        ctx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + radius);
        ctx.lineTo(nx + nw, ny + nh - radius);
        ctx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - radius, ny + nh);
        ctx.lineTo(nx + radius, ny + nh);
        ctx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - radius);
        ctx.lineTo(nx, ny + radius);
        ctx.quadraticCurveTo(nx, ny, nx + radius, ny);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = '500 12px "Inter", sans-serif';
        ctx.textBaseline = 'top';

        const textPaddingLeft = 16;
        const textPaddingTop = 16;
        const maxTextWidth = nw - textPaddingLeft * 2;

        const textLines = (note.text || '').split('\n');
        let currentY = ny + textPaddingTop;

        textLines.forEach(line => {
          const words = line.split(' ');
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxTextWidth && n > 0) {
              ctx.fillText(currentLine, nx + textPaddingLeft, currentY);
              currentLine = words[n] + ' ';
              currentY += 16;
            } else {
              currentLine = testLine;
            }
          }
          ctx.fillText(currentLine, nx + textPaddingLeft, currentY);
          currentY += 16;
        });

        const creator = getCreatorProfile(note.createdBy);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.font = '8px monospace';
        const footerY = ny + nh - 16;
        const authorText = `@${creator.name.split(' ')[0]}`;
        ctx.fillText(authorText, nx + textPaddingLeft, footerY);

        if (note.isLocked) {
          ctx.fillText('🔒 Locked', nx + nw - 60, footerY);
        }
      });

      ctx.restore();

      const pngUrl = canvas.toDataURL('image/png');

      // 2. Generate PDF with jsPDF - Portrait, points, A4 size: 595.28 x 841.89
      const doc = new jsPDF('p', 'pt', 'a4');

      // Page 1: COVER
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 595.28, 140, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('TEAM CANVAS WORKSPACE REPORT', 40, 70);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(148, 163, 184);
      doc.text('Preserved layout, sketching guides, and structural templates summary', 40, 95);

      // Metadata section
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Export Metadata', 40, 190);

      doc.setDrawColor(226, 232, 240);
      doc.line(40, 205, 555, 205);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      const sessionUser = currentUser ? currentUser.name : 'Guest User';
      const timestampString = new Date().toLocaleString();

      doc.text(`Generated By:  ${sessionUser}`, 40, 230);
      doc.text(`Exported At:   ${timestampString}`, 40, 250);
      doc.text(`Total Sticky Notes:  ${activeNotes.length}`, 40, 275);
      doc.text(`Total Pencil Sketches:  ${activePencil.length}`, 40, 295);

      // Summary details box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(40, 330, 515, 180, 8, 8, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text('COLLABORATIVE WHITEBOARD COMPENDIUM', 55, 360);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);

      const bullets = [
        `• Vector curves and sketch coordinates are rendered in high resolution.`,
        `• Double wrap limits are formatted ensuring full legibility for long paragraphs.`,
        `• Nested elements hold creator references ensuring clear team work ownership.`,
        `• Active discussions, threaded commentary, and sub-threads are saved sequentially.`
      ];
      bullets.forEach((bullet, bidx) => {
        doc.text(bullet, 55, 390 + bidx * 22);
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Google AI Studio Interactive Workspace Companion Document', 40, 790);

      // Page 2: VISUAL MAP
      doc.addPage();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 595.28, 55, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Visual Whiteboard Canvas Layout', 40, 33);

      const targetW = 515;
      const targetH = (height / width) * targetW;
      const clampH = Math.min(520, targetH);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(2, 6, 23);
      doc.roundedRect(40, 85, 515, clampH, 6, 6, 'FD');

      doc.addImage(pngUrl, 'PNG', 40, 85, 515, clampH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Snapshot bounds: [X:${Math.round(minX)}, Y:${Math.round(minY)}] to [X:${Math.round(maxX)}, Y:${Math.round(maxY)}]. Frame scaled automatically.`, 40, 85 + clampH + 25);

      // Page 3: WRITTEN NOTES DETAIL WITH COMMENTARY THREADS
      if (activeNotes.length > 0) {
        doc.addPage();

        let writeY = 90;

        const resetHeader = () => {
          doc.setFillColor(79, 70, 229);
          doc.rect(0, 0, 595.28, 55, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text('Sticker Content & Threaded Discussions Details', 40, 33);
          writeY = 90;
        };

        resetHeader();

        activeNotes.forEach((note, noteIdx) => {
          const creator = getCreatorProfile(note.createdBy);
          const commentsCount = note.comments?.length || 0;

          const approxBlockHeight = 120 + commentsCount * 30;
          if (writeY + approxBlockHeight > 780) {
            doc.addPage();
            resetHeader();
          }

          doc.setFillColor(250, 250, 250);
          doc.setDrawColor(218, 221, 225);
          doc.roundedRect(40, writeY, 515, 110, 4, 4, 'FD');

          doc.setFillColor(note.color || '#FEF08A');
          doc.rect(45, writeY + 5, 8, 100, 'F');

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`Sticky Note #${noteIdx + 1}  —  by @${creator.name}`, 65, writeY + 22);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          const lockNoteStr = note.isLocked ? 'Locked 🔒' : 'Editable 🔓';
          doc.text(`Coordinates: [${Math.round(note.x || 0)}, ${Math.round(note.y || 0)}]  |  Status: ${lockNoteStr}  |  Comments: ${commentsCount}`, 65, writeY + 38);

          doc.setTextColor(51, 65, 85);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          const splitText = doc.splitTextToSize(note.text || 'Empty Note Content', 450);
          doc.text(splitText, 65, writeY + 58);

          writeY += 125;

          if (commentsCount > 0) {
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(`Discussion thread (${commentsCount} active replies):`, 55, writeY);

            writeY += 14;

            note.comments?.forEach(comm => {
              const commProfile = getCreatorProfile(comm.userId);

              if (writeY + 32 > 785) {
                doc.addPage();
                resetHeader();
                writeY += 15;
              }

              doc.setFillColor(241, 245, 249);
              doc.roundedRect(55, writeY, 500, 26, 4, 4, 'F');

              doc.setTextColor(79, 70, 229);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8.5);
              doc.text(`@${commProfile.name.split(' ')[0]}`, 65, writeY + 16);

              doc.setTextColor(100, 116, 139);
              doc.setFont('helvetica', 'normal');
              doc.text(`[${new Date(comm.timestamp).toLocaleString()}]`, 130, writeY + 16);

              doc.setTextColor(51, 65, 85);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.text(`:   "${comm.text}"`, 220, writeY + 16);

              writeY += 32;
            });
            writeY += 12;
          }
          writeY += 15;
        });
      }

      doc.save(`whiteboard-workspace-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to export multi-page PDF document:', err);
      alert('We hit an error parsing notes or assembling vector layouts. Please try again!');
    }
  };

  const triggerFallbackSvgDownload = (blobURL: string) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = blobURL;
    downloadLink.download = `whiteboard-sketch-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleDownloadPNG = () => {
    try {
      // 1. Determine bounding box of all elements to crop/frame them nicely
      const activeNotes = elements.filter(el => el.type === 'note' && !el.isDeleted);
      const activePencil = elements.filter(el => el.type === 'pencil' && !el.isDeleted);

      if (activeNotes.length === 0 && activePencil.length === 0) {
        alert("The team whiteboard is empty! Place a sticky note or sketch first to export.");
        return;
      }

      // Calculate the bounding box of all elements to automatically frame the exported drawing
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      activeNotes.forEach(note => {
        const nx = note.x || 0;
        const ny = note.y || 0;
        const nw = note.width || 200;
        const nh = note.height || 150;
        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx + nw);
        maxY = Math.max(maxY, ny + nh);
      });

      activePencil.forEach(p => {
        if (!p.points) return;
        for (let i = 0; i < p.points.length; i += 2) {
          const px = p.points[i];
          const py = p.points[i+1];
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      });

      // Add generous padding (e.g., 80px) around the elements
      const padding = 80;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      // Ensure minimum output dimensions
      const width = Math.max(800, maxX - minX);
      const height = Math.max(600, maxY - minY);

      // Create a high-DPI canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // Export at 2x resolution for high printing quality
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Scale canvas context for logical coordinate drawing
      ctx.scale(scale, scale);

      // Fill background - slate-950 color matching our sleek team app
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Translate context so that (minX, minY) is at (0, 0)
      ctx.save();
      ctx.translate(-minX, -minY);

      // Draw Grid dots in active zone
      if (showGrid) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
        // Snap start grid boundary
        const startX = Math.floor(minX / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor(minY / GRID_SIZE) * GRID_SIZE;
        const endX = Math.ceil(maxX / GRID_SIZE) * GRID_SIZE;
        const endY = Math.ceil(maxY / GRID_SIZE) * GRID_SIZE;

        for (let gx = startX; gx <= endX; gx += GRID_SIZE) {
          for (let gy = startY; gy <= endY; gy += GRID_SIZE) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      // Draw Pencil Lines
      activePencil.forEach(p => {
        if (!p.points || p.points.length < 4) return;
        ctx.beginPath();
        ctx.strokeStyle = p.color || '#3B82F6';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(p.points[0], p.points[1]);
        for (let i = 2; i < p.points.length; i += 2) {
          ctx.lineTo(p.points[i], p.points[i + 1]);
        }
        ctx.stroke();
      });

      // Draw Sticky Notes
      activeNotes.forEach(note => {
        const nx = note.x || 0;
        const ny = note.y || 0;
        const nw = note.width || 200;
        const nh = note.height || 150;

        // Draw card shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        // Draw sticker background container
        ctx.fillStyle = note.color || '#FEF08A';
        ctx.beginPath();
        // Rounded rectangle
        const radius = 12;
        ctx.moveTo(nx + radius, ny);
        ctx.lineTo(nx + nw - radius, ny);
        ctx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + radius);
        ctx.lineTo(nx + nw, ny + nh - radius);
        ctx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - radius, ny + nh);
        ctx.lineTo(nx + radius, ny + nh);
        ctx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - radius);
        ctx.lineTo(nx, ny + radius);
        ctx.quadraticCurveTo(nx, ny, nx + radius, ny);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Subtle borders
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text content with proper word wrap inside note bounds
        ctx.fillStyle = '#0f172a'; // slate-900 contrast text
        ctx.font = '500 12px "Inter", sans-serif';
        ctx.textBaseline = 'top';

        const textPaddingLeft = 16;
        const textPaddingTop = 16;
        const maxTextWidth = nw - textPaddingLeft * 2;
        
        const textLines = (note.text || '').split('\n');
        let currentY = ny + textPaddingTop;

        textLines.forEach(line => {
          const words = line.split(' ');
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxTextWidth && n > 0) {
              // Draw the current wrapped line
              ctx.fillText(currentLine, nx + textPaddingLeft, currentY);
              currentLine = words[n] + ' ';
              currentY += 16; // Line spacing height
            } else {
              currentLine = testLine;
            }
          }
          // Draw any leftover test line
          ctx.fillText(currentLine, nx + textPaddingLeft, currentY);
          currentY += 16;
        });

        // Draw note footer (Author Username @name & status indicator)
        const creator = getCreatorProfile(note.createdBy);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.font = '8px monospace';
        const footerY = ny + nh - 16;

        // Draw author
        const authorText = `@${creator.name.split(' ')[0]}`;
        ctx.fillText(authorText, nx + textPaddingLeft, footerY);

        // Draw lock indicator if locked
        if (note.isLocked) {
          ctx.fillText('🔒 Locked', nx + nw - 60, footerY);
        }
      });

      ctx.restore();

      // Download the generated artwork
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `whiteboard-workspace-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    } catch (err) {
      console.error('Failed to manually draw/export canvas to PNG:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full font-sans text-slate-200" id="whiteboard-view-container">
      
      {/* Control Toolbar */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-900 bg-slate-900/40 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="text-blue-500 shrink-0" size={16} />
            <h2 className="font-display font-semibold text-sm text-white">Interactive Team Canvas</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Brainstorming layout. Place sticky nodes or draw workflows. Synced in real-time.
          </p>
        </div>

        {/* Tools and triggers */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Active Tool Selector */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 items-center">
            <button
               onClick={() => setTool('select')}
               className={`p-1.5 rounded-md transition ${
                 tool === 'select' ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white'
               }`}
               title="Select / Move mode"
               id="select-tool-btn"
            >
              <MousePointer size={14} />
            </button>
            <button
               onClick={() => setTool('pan')}
               className={`p-1.5 rounded-md transition ${
                 tool === 'pan' ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white'
               }`}
               title="Pan / Navigate mode"
               id="pan-tool-btn"
            >
              <Hand size={14} />
            </button>
            <button
               onClick={() => setTool('pencil')}
               className={`p-1.5 rounded-md transition ${
                 tool === 'pencil' ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white'
               }`}
               title="Pencil sketching (Hold Shift for straight lines)"
               id="pencil-tool-btn"
            >
              <Edit3 size={14} />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            <div className="flex items-center space-x-0.5 pl-0.5">
              <button
                 onClick={() => setTool('note')}
                 className={`p-1.5 rounded-md transition ${
                   tool === 'note' ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white'
                 }`}
                 title="Add Sticky Note template on click"
                 id="note-tool-btn"
              >
                <StickyNote size={14} />
              </button>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setTool('note');
                }}
                className="bg-transparent border-none text-[10px] text-slate-300 font-mono font-semibold focus:outline-none focus:ring-0 pr-1 cursor-pointer hover:text-white max-w-[95px] md:max-w-[110px]"
                id="sticky-note-template-dropdown"
                title="Select sticky note layout template structure"
              >
                {NOTE_TEMPLATES.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id} className="bg-slate-950 text-slate-200">
                    {tmpl.id === 'Empty' ? '📋 Plain' : `📋 ${tmpl.name}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Undo / Redo Action Group */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`p-1.5 rounded-md transition ${
                undoStack.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Undo Action (Ctrl+Z)"
              id="undo-btn"
            >
              <Undo size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`p-1.5 rounded-md transition ${
                redoStack.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Redo Action (Ctrl+Y)"
              id="redo-btn"
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Grid visual guidelines and alignment snapping group */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 items-center space-x-0.5">
            <button
               onClick={() => setShowGrid(!showGrid)}
               className={`p-1.5 rounded-md transition flex items-center space-x-1 ${
                 showGrid ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-850'
               }`}
               title={showGrid ? "Hide Background Grid" : "Show Background Grid"}
               id="toggle-grid-btn"
            >
              <Grid size={14} className={showGrid ? 'text-blue-400' : 'text-slate-400'} />
              <span className="text-[10px] font-mono px-0.5 hidden xs:inline">Grid</span>
            </button>
            <button
               onClick={() => setSnapToGrid(!snapToGrid)}
               className={`p-1.5 rounded-md transition flex items-center space-x-1 ${
                 snapToGrid ? 'bg-slate-850 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-850'
               }`}
               title={snapToGrid ? "Disable Snap-to-Grid" : "Enable Snap-to-Grid"}
               id="snap-to-grid-btn"
            >
              <Magnet size={14} className={snapToGrid ? 'text-emerald-400' : 'text-slate-400'} />
              <span className="text-[10px] font-mono px-0.5 hidden xs:inline">Snap</span>
            </button>
          </div>

          {/* Color Pallet (Applicable for Notes and Pencil line) */}
          <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3.5">
            {NOTE_COLORS.map(c => (
              <button
                key={c.hex}
                onClick={() => {
                  setSelectedColor(c.hex);
                  updateSelectedElementsColor(c.hex);
                }}
                className={`w-4 h-4 rounded-full transition duration-150 transform hover:scale-125 cursor-pointer ${
                  selectedColor.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 scale-110' : ''
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
            <div 
              className="relative w-5 h-5 rounded-full flex items-center justify-center overflow-hidden border border-slate-700 bg-slate-800 hover:scale-110 active:scale-95 transition cursor-pointer" 
              title="Custom Color Picker"
              id="toolbar-color-picker-trigger"
            >
              <Palette size={10} className="text-slate-300 pointer-events-none absolute" />
              <input
                type="color"
                value={selectedColor.startsWith('#') ? selectedColor : '#FEF08A'}
                onChange={(e) => {
                  const newCol = e.target.value;
                  setSelectedColor(newCol);
                  updateSelectedElementsColor(newCol);
                }}
                className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                id="custom-color-picker-input"
              />
            </div>
          </div>

          <button
            onClick={handleDownloadPNG}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-950/40 text-indigo-400 hover:text-indigo-350 border border-indigo-900/60 hover:border-indigo-750 rounded-lg text-xs font-semibold transition cursor-pointer font-mono"
            id="download-whiteboard-btn"
            title="Download collaborative sketch as a PNG image"
          >
            <Download size={12} />
            <span>Export PNG</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-950/40 text-emerald-400 hover:text-emerald-350 border border-emerald-900/60 hover:border-emerald-750 rounded-lg text-xs font-semibold transition cursor-pointer font-mono"
            id="download-whiteboard-pdf-btn"
            title="Export annotated multi-page PDF"
          >
            <Layers size={13} className="text-emerald-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Clear the collaborative whiteboard for all live team members? This action is instant.')) {
                onClearWhiteboard();
              }
            }}
            className="flex items-center space-x-1.25 px-2.5 py-1.5 bg-rose-950/40 text-rose-400 hover:text-rose-350 border border-rose-900/60 hover:border-rose-700 rounded-lg text-xs font-semibold transition"
            id="clear-whiteboard-btn"
          >
            <Trash2 size={12} />
            <span>Clear Slate</span>
          </button>
        </div>
      </div>

      {/* SVG Drawing Canvas stage */}
      <div className="flex-1 relative bg-slate-950/40 overflow-hidden" id="canvas-stage">
        
        {/* Floating Instructions Legend */}
        <div className="hidden lg:block absolute top-4 left-4 bg-slate-900/95 border border-slate-800 p-4 rounded-xl text-[10px] font-mono max-w-[240px] shadow-lg z-10 backdrop-blur pointer-events-none">
          <p className="text-slate-200 font-bold flex items-center mb-2.5 text-[11px] font-display">
            <Info size={11} className="mr-1 text-blue-400" />
             CANVAS CONTROLS & HOTKEYS
          </p>
          <ul className="space-y-1.5 text-slate-400 leading-normal">
            <li>📦 <strong className="text-slate-300">Group Select</strong>: Drag on empty space in Select mode to highlight multiple nodes. Hold <kbd className="px-1 bg-slate-800 text-xs rounded">Shift</kbd> to add.</li>
            <li>✋ <strong className="text-slate-300">Pan Hold</strong>: Press & hold <kbd className="px-1 bg-slate-800 text-xs rounded">Spacebar</kbd> to drag canvas.</li>
            <li>⌨️ <strong className="text-slate-300">Tool Keys</strong>: <kbd className="px-1 bg-slate-800 text-xs rounded">V</kbd> Select, <kbd className="px-1 bg-slate-800 text-xs rounded">P</kbd> Pencil, <kbd className="px-1 bg-slate-800 text-xs rounded">N</kbd> Note, <kbd className="px-1 bg-slate-800 text-xs rounded">H</kbd> Pan.</li>
            <li>🧹 <strong className="text-slate-300">Delete Group</strong>: Press <kbd className="px-1 bg-slate-800 text-xs rounded">Del</kbd> or <kbd className="px-1 bg-slate-800 text-xs rounded">Backspace</kbd>.</li>
            <li>✨ <strong className="text-slate-300">Select All</strong>: Press <kbd className="px-1 bg-slate-800 text-xs rounded">Ctrl+A</kbd> or <kbd className="px-1 bg-slate-800 text-xs rounded">Cmd+A</kbd>.</li>
            <li>🧲 <strong className="text-slate-300">Option Toggles</strong>: <kbd className="px-1 bg-slate-800 text-xs rounded">G</kbd> Grid on/off, <kbd className="px-1 bg-slate-800 text-xs rounded">S</kbd> Snapping on/off.</li>
          </ul>
        </div>

        {/* Dual Screen Simulator Alert */}
        <div className="hidden sm:block absolute top-4 right-4 bg-slate-900/70 text-[10px] text-blue-400 font-mono px-3 py-1 rounded-full border border-blue-900/40 backdrop-blur z-10 pointer-events-none">
          💫 Syncing elements instantly over WebSockets
        </div>

        {/* Floating Zoom Controls Option Overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-800 p-1 rounded-xl shadow-lg z-10 backdrop-blur flex items-center space-x-1 font-mono text-xs select-none">
          <button
            onClick={() => {
              if (svgRef.current && zoomBehaviorRef.current) {
                select(svgRef.current).call(zoomBehaviorRef.current.scaleBy as any, 1 / 1.25);
              }
            }}
            className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition cursor-pointer"
            title="Zoom Out"
            id="zoom-out-btn"
          >
            <ZoomOut size={13} />
          </button>
          
          <span className="text-[10px] text-slate-350 font-semibold px-1 w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={() => {
              if (svgRef.current && zoomBehaviorRef.current) {
                select(svgRef.current).call(zoomBehaviorRef.current.scaleBy as any, 1.25);
              }
            }}
            className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition cursor-pointer"
            title="Zoom In"
            id="zoom-in-btn"
          >
            <ZoomIn size={13} />
          </button>
          
          <div className="w-px h-4 bg-slate-800" />
          
          <button
            onClick={() => {
              if (svgRef.current && zoomBehaviorRef.current) {
                select(svgRef.current).call(zoomBehaviorRef.current.transform as any, zoomIdentity);
              } else {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }
            }}
            className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition flex items-center space-x-1 text-[9px] cursor-pointer"
            title="Reset to 100% zoom"
            id="reset-zoom-btn"
          >
            <RotateCcw size={11} />
            <span>1:1</span>
          </button>
        </div>

        {/* SVG Area */}
        <svg
          ref={svgRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full select-none bg-slate-950/80 ${
            tool === 'select' ? 'cursor-default' : tool === 'pencil' ? 'cursor-cell' : tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-copy'
          }`}
          id="collaborative-svg-board"
        >
          <defs>
            {/* SVG Grid Dot Pattern structure */}
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(148, 163, 184, 0.12)" />
            </pattern>
          </defs>

          {/* Transformed Group for smooth, performant infinite navigation */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} id="transformed-canvas-group">
            
            {/* Extended grid canvas background layer */}
            {showGrid && (
              <rect x="-100000" y="-100000" width="200000" height="200000" fill="url(#grid)" pointerEvents="none" />
            )}

            {/* Render Multi-Selection Box */}
            {selectionBox && (
              <rect
                x={Math.min(selectionBox.startX, selectionBox.endX)}
                y={Math.min(selectionBox.startY, selectionBox.endY)}
                width={Math.abs(selectionBox.startX - selectionBox.endX)}
                height={Math.abs(selectionBox.startY - selectionBox.endY)}
                fill="rgba(99, 102, 241, 0.08)"
                stroke="#6366F1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                rx={4}
                pointerEvents="none"
                id="svg-selection-box"
              />
            )}

            {/* Render Drawn Pencil Lines (filtering out items marked as isDeleted) */}
            {elements.filter(el => el.type === 'pencil' && !el.isDeleted).map((p) => {
              if (!p.points || p.points.length < 4) return null;
              // Map flat points array to SVG path syntax "M x y L x y..."
              let d = `M ${p.points[0]} ${p.points[1]}`;
              for (let i = 2; i < p.points.length; i += 2) {
                d += ` L ${p.points[i]} ${p.points[i+1]}`;
              }
              return (
                <path
                  key={p.id}
                  d={d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  id={`svg-pencil-${p.id}`}
                />
              );
            })}

            {/* Render local active sketch in-progress */}
            {tool === 'pencil' && drawingPoints && drawingPoints.length > 2 && (
              <path
                d={`M ${drawingPoints[0]} ${drawingPoints[1]}` + drawingPoints.slice(2).reduce((acc, curr, index) => {
                  return acc + (index % 2 === 0 ? ` L ${curr}` : ` ${curr}`);
                }, '')}
                fill="none"
                stroke={selectedColor === '#FEF08A' ? '#3B82F6' : selectedColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
                id="svg-local-sketching"
              />
            )}

            {/* Render Sticky Notes as foreignObjects or nested SVGs (filtering out items marked as isDeleted) */}
            {elements.filter(el => el.type === 'note' && !el.isDeleted).map((note) => {
              const creator = getCreatorProfile(note.createdBy);
              const isEditingThisNote = noteInputId === note.id;
              const isSelected = selectedElementIds.includes(note.id) || draggedElementId === note.id;

              return (
                <foreignObject
                  key={note.id}
                  x={note.x || 50}
                  y={note.y || 50}
                  width={note.width || 200}
                  height={note.height || 150}
                  onMouseDown={(e) => startDragNote(e, note)}
                  id={`foreign-note-${note.id}`}
                  className="overflow-visible"
                >
                  <div 
                    className={`relative p-4 rounded-xl shadow-lg border border-yellow-700/10 flex flex-col justify-between overflow-hidden select-none transition group ${
                      isSelected ? 'ring-4 ring-indigo-500 shadow-2xl scale-[1.03]' : 'hover:scale-[1.015]'
                    } ${note.isLocked ? 'cursor-default border-indigo-500/30' : 'cursor-move'}`}
                    style={{ 
                      backgroundColor: note.color, 
                      color: '#0f172a', 
                      width: '100%', 
                      height: '100%' 
                    }}
                    onDoubleClick={() => handleLaunchTextEdit(note)}
                  >
                    {/* Note Editing Controls */}
                    {isEditingThisNote ? (
                      <div className="flex flex-col h-full bg-slate-900 text-white rounded-lg p-2 border border-slate-700 text-xs">
                        <textarea
                          value={noteInputText}
                          onChange={(e) => setNoteInputText(e.target.value)}
                          className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none placeholder-slate-500 font-mono leading-relaxed"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              submitNoteUpdate(note);
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end space-x-1 mt-1">
                          <button 
                            onClick={() => setNoteInputId(null)}
                            className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded font-semibold"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => submitNoteUpdate(note)}
                            className="px-1.5 py-0.5 bg-blue-600 text-[9px] rounded font-semibold text-white"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Note Action Icons (visible when hovering) */}
                        {tool === 'select' && (
                          <div className="absolute top-2 right-2 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition duration-150 z-10 bg-white/70 backdrop-blur-sm rounded p-0.5 shadow-sm">
                            {/* Thread Comments Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentsNoteId(note.id);
                              }}
                              className="p-1 text-slate-750 hover:text-indigo-700 rounded hover:bg-black/5 cursor-pointer flex items-center justify-center relative"
                              title="Engage in discussion thread"
                              id={`comment-note-btn-${note.id}`}
                            >
                              <MessageSquare size={11} className={note.comments?.length ? 'text-indigo-600 font-bold' : 'text-slate-700'} />
                              {note.comments && note.comments.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-mono text-[6px] w-2.5 h-2.5 rounded-full flex items-center justify-center">
                                  {note.comments.length}
                                </span>
                              )}
                            </button>

                            {/* Lock/Unlock Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = { ...note, isLocked: !note.isLocked };
                                onUpdateElement(updated);
                                setUndoStack(prev => [...prev, {
                                  type: 'update',
                                  elementId: note.id,
                                  before: note,
                                  after: updated
                                }]);
                                setRedoStack([]);
                              }}
                              className="p-1 text-slate-700 hover:text-indigo-700 rounded hover:bg-black/5 cursor-pointer flex items-center justify-center"
                              title={note.isLocked ? "Unlock Sticky Note" : "Lock Sticky Note"}
                              id={`lock-note-btn-${note.id}`}
                            >
                              {note.isLocked ? <Lock size={11} className="text-indigo-600" /> : <Unlock size={11} />}
                            </button>

                            {/* Delete Button (hidden when locked) */}
                            {!note.isLocked && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteNote(e, note)}
                                className="p-1 text-slate-700 hover:text-red-750 rounded hover:bg-black/5 cursor-pointer flex items-center justify-center"
                                title="Delete Sticky Note"
                                id={`delete-note-btn-${note.id}`}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Persistent Lock Emblem (when locked and not hovered) */}
                        {note.isLocked && (
                          <div className="absolute top-2.5 right-2.5 text-indigo-600/80 transition group-hover:opacity-0" title="Locked Sticky Note">
                            <Lock size={11} />
                          </div>
                        )}

                        {/* Text content */}
                        <p className="text-[11px] font-sans font-medium whitespace-pre-wrap leading-relaxed break-words flex-1 overflow-y-auto pr-1">
                          {note.text}
                        </p>

                        {/* Sticky Footer */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/5 text-[8px] font-mono text-slate-600 shrink-0">
                          <span>@{creator.name.split(' ')[0]}</span>
                          {note.comments && note.comments.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentsNoteId(note.id);
                              }}
                              className="text-[7.5px] text-indigo-700 hover:text-indigo-600 font-bold flex items-center space-x-0.5 cursor-pointer pointer-events-auto"
                              title="Click to view discussion conversation"
                            >
                              <span>💬 {note.comments.length} comments</span>
                            </button>
                          ) : (
                            <span className="text-[7.5px] text-slate-500 select-none">
                              {note.isLocked ? "🔒 Locked" : "Double-click to Edit"}
                            </span>
                          )}
                        </div>

                        {/* Resize handle (only show in selection mode if not locked) */}
                        {!note.isLocked && tool === 'select' && (
                          <div
                            onMouseDown={(e) => startResizeNote(e, note)}
                            className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center text-slate-550 hover:text-indigo-600 transition"
                            title="Drag to resize note"
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <line x1="6" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.35)" />
                              <line x1="6" y1="3" x2="3" y2="6" stroke="rgba(0,0,0,0.35)" />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>

        {/* Threaded Discussion Panel overlay */}
        {activeCommentsNoteId && (
          <div 
            className="absolute top-0 right-0 w-80 h-full bg-slate-900/95 border-l border-slate-800 shadow-2xl z-30 flex flex-col backdrop-blur-md"
            id="threaded-comments-sidebar"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5 font-mono">
                <span>💬 Commentary Thread</span>
                <span className="bg-indigo-900/40 text-indigo-400 px-1.5 py-0.5 rounded-full text-[9px]">
                  {activeNoteComments.length}
                </span>
              </h3>
              <button 
                onClick={() => setActiveCommentsNoteId(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition text-[10px] cursor-pointer"
                title="Close discussion panel"
              >
                ✕
              </button>
            </div>

            {/* Connected Note Reference preview */}
            <div className="p-3.5 bg-slate-950/50 border-b border-slate-800 flex items-start space-x-2.5">
              <div 
                className="w-3 h-3 rounded-full shrink-0 mt-0.5 border" 
                style={{ backgroundColor: selectedNoteForComments?.color || '#FEF08A', borderColor: 'rgba(0,0,0,0.1)' }} 
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-semibold text-slate-300">Connected Sticky Note</p>
                <p className="text-[10px] text-slate-500 line-clamp-2 italic leading-normal font-sans">
                  "{selectedNoteForComments?.text || 'No text content'}"
                </p>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5" id="comments-timeline-scroll">
              {activeNoteComments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[10px] text-slate-500">No replies yet.</p>
                  <p className="text-[9px] text-slate-600 mt-1 italic font-mono">Be the first to start a discussion!</p>
                </div>
              ) : (
                activeNoteComments.map(comm => {
                  const author = getCreatorProfile(comm.userId);
                  return (
                    <div key={comm.id} className="group flex flex-col space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-[10px] font-mono" style={{ color: author.color }}>
                            @{author.name.split(' ')[0]}
                          </span>
                          <span className="text-[8px] text-slate-500">
                            {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* Delete comment */}
                        {(currentUser?.id === comm.userId) && (
                          <button
                            onClick={() => handleDeleteComment(comm.id)}
                            className="text-[9px] text-slate-506 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                            title="Delete commentary reply"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850/80 text-[10px] text-slate-300 leading-normal font-sans break-words select-text">
                        {comm.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form to append new reply */}
            <form 
              onSubmit={handleAddComment}
              className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col space-y-2 shrink-0"
            >
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Post a reply in this discussion thread..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder-slate-600 resize-none h-16 transition"
                required
              />
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 italic font-mono">Synced globally</span>
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] font-semibold transition flex items-center space-x-1 cursor-pointer"
                >
                  <span>Reply</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {!currentUser && (
          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center backdrop-blur-[1px] z-20">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg max-w-xs text-center">
              <MousePointer size={20} className="mx-auto text-amber-500 mb-2" />
              <p className="text-xs text-slate-200 font-semibold mb-1">Canvas Locked</p>
              <p className="text-[10px] text-slate-400">Please switch to a simulated identity from the sidebar to sketch or deploy notes on the canvas.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
