import React, { useRef, useState, useEffect } from 'react';
import { CollaborativeDocument, WorkspaceUser } from '../types';
import { 
  FileText, 
  RefreshCw, 
  Clock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  BookOpen, 
  Database,
  User,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface DocumentViewProps {
  document: CollaborativeDocument;
  users: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  onUpdateDocument: (text: string) => void;
}

export default function DocumentView({
  document,
  users,
  currentUser,
  onUpdateDocument
}: DocumentViewProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(document.text);

  // Sync state if remote text changes
  useEffect(() => {
    // Only overwrite if textarea is not active, or if the text is genuinely different
    if (textareaRef.current !== window.document.activeElement) {
      setLocalText(document.text);
    } else if (Math.abs(document.text.length - localText.length) > 10) {
      // Large edits
      setLocalText(document.text);
    }
  }, [document.text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textValue = e.target.value;
    setLocalText(textValue);
    onUpdateDocument(textValue); // Fire Socket.io broadcast event
  };

  const getUpdaterProfile = () => {
    if (!document.lastUpdatedBy) return null;
    return users.find(u => u.id === document.lastUpdatedBy) || null;
  };

  const updater = getUpdaterProfile();

  // Simple Markdown Parser for visual representation
  const parseMarkdownHtml = (text: string) => {
    if (!text) return '<p class="text-slate-500 italic">This editor is currently blank.</p>';
    
    // Safety escapes
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Header conversions
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-white tracking-tight mt-4 mb-2">$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3 class="text-base font-bold text-slate-100 mt-5 mb-2.5">$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2 class="text-lg font-bold text-blue-400 font-display mt-6 border-b border-slate-800 pb-1 mb-3">$1</h2>');

    // Bullet points
    escaped = escaped.replace(/^\- (.*$)/gim, '<li class="text-xs text-slate-300 list-disc ml-4 my-1">$1</li>');

    // Bold tags
    escaped = escaped.replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>');

    // Bullet lists containers
    const lines = escaped.split('\n');
    let output = '';
    let inList = false;

    lines.forEach((line) => {
      if (line.trim().startsWith('<li')) {
        if (!inList) {
          output += '<ul class="space-y-1 my-2">';
          inList = true;
        }
        output += line;
      } else {
        if (inList) {
          output += '</ul>';
          inList = false;
        }
        if (line.trim() !== '') {
          // Wrap standard non-headers elements in simple paragraph
          if (!line.startsWith('<h') && !line.startsWith('<ul') && !line.startsWith('</ul')) {
            output += `<p class="text-xs text-slate-300 leading-relaxed my-2">${line}</p>`;
          } else {
            output += line;
          }
        }
      }
    });

    if (inList) {
      output += '</ul>';
    }

    return output;
  };

  const wordCount = localText.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full font-sans text-slate-200" id="document-suite">
      {/* Header Bar */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-900 bg-slate-900/40 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <FileText size={16} className="text-emerald-500" />
            <h2 className="font-display font-semibold text-sm text-white">Project Specs Pad</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono max-w-xs sm:max-w-none truncate">
            Shared Markdown documentation. Any keystroke syncs in real-time instantly.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setIsPreviewMode(false)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition font-medium ${
                !isPreviewMode ? 'bg-slate-850 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              id="doc-edit-mode-btn"
            >
              Editor
            </button>
            <button
              onClick={() => setIsPreviewMode(true)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition font-medium ${
                isPreviewMode ? 'bg-slate-850 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              id="doc-preview-mode-btn"
            >
              <span className="hidden sm:inline">Split </span>Preview
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-450 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center space-x-1.5">
            <Database size={11} className="text-emerald-500 shrink-0" />
            <span>Revision {document.version}</span>
          </div>
        </div>
      </div>

      {/* Editor Body Area */}
      <div className="flex-1 flex overflow-hidden p-3 md:p-6 bg-slate-950/25">
        
        {/* Document Editor Area split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full h-full">
          
          {/* Main textarea Editor panel */}
          <div className={`${!isPreviewMode ? 'flex' : 'hidden lg:flex'} flex-col h-full bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl relative`} id="markdown-editor-pane">
            <div className="bg-slate-950/50 border-b border-slate-850 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse"></span>
                ACTIVE WRITING PAD
              </span>
              <span>{wordCount} Words</span>
            </div>

            <textarea
              ref={textareaRef}
              value={localText}
              onChange={handleTextChange}
              placeholder="# Markdown header...&#10;&#10;Use standard Markdown format. Anyone aligned to this suite will see edits in real-time."
              disabled={!currentUser}
              className={`flex-1 p-4 md:p-5 bg-transparent border-none text-xs text-slate-100 font-mono focus:outline-none resize-none placeholder-slate-650 leading-relaxed ${
                !currentUser ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
              }`}
              id="markdown-textarea"
            />
            
            {!currentUser && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center backdrop-blur-[1px]">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg max-w-xs text-center mx-4">
                  <User size={20} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-xs text-slate-200 font-semibold mb-1">Editing Access Restricted</p>
                  <p className="text-[10px] text-slate-400">Select a simulated user from the left-hand sidebar to acquire editing tokens.</p>
                </div>
              </div>
            )}
          </div>

          {/* Markdown Output Render pad */}
          <div className={`${isPreviewMode ? 'flex' : 'hidden lg:flex'} flex-col h-full bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-md`} id="markdown-output-pane">
            <div className="bg-slate-950/30 border-b border-slate-900 px-4 py-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center text-emerald-500">
                <BookOpen size={12} className="mr-1.25" />
                COMPILED SPEC SHEET PREVIEW
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 text-slate-200 select-text bg-slate-950/10">
              <div 
                className="prose prose-invert prose-xs text-slate-300 select-all"
                dangerouslySetInnerHTML={{ __html: parseMarkdownHtml(localText) }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Editor Details Footer Indicator */}
      {updater && (
        <div className="px-4 py-2.5 md:px-6 md:py-2 border-t border-slate-900 bg-slate-950/70 text-[10px] font-mono text-slate-400 flex flex-col sm:flex-row gap-2 sm:items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Synced to Database Node</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Last revision by:</span>
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-white font-semibold">
              <span>{updater.avatar}</span>
              <span>{updater.name}</span>
            </div>
            <span>- {new Date(document.lastUpdatedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
