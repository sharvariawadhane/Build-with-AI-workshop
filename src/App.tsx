/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  FilePlus, 
  Search, 
  Grid, 
  List as ListIcon, 
  Tag, 
  Download, 
  Trash2, 
  MoreVertical, 
  Info, 
  X, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon, 
  Plus,
  Loader2,
  ChevronDown,
  SortAsc,
  SortDesc,
  Upload,
  Layers,
  Clock,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './db';
import { analyzeImage } from './services/geminiService';
import { FileEntry } from './types';

// --- Components ---

interface FileCardProps {
  key?: React.Key;
  file: FileEntry;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onPreview: (file: FileEntry) => void;
  onDownload: (file: FileEntry) => void;
  onDelete: (id: number) => Promise<void>;
  onTagClick: (tag: string) => void;
}

const FileCard = ({ 
  file, 
  viewMode, 
  isSelected,
  onPreview, 
  onDownload, 
  onDelete, 
  onTagClick 
}: FileCardProps) => {
  const isImage = file.type.startsWith('image/');
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file.data);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.data, isImage]);

  const handleSingleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(file);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(file);
  };

  if (viewMode === 'list') {
    return (
      <div 
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className={`group flex items-center gap-4 p-2 transition-colors cursor-pointer border-b border-zinc-800/50 ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-zinc-800/30'}`}
      >
        <div className={`w-8 h-8 flex-shrink-0 rounded flex items-center justify-center overflow-hidden border ${isSelected ? 'border-indigo-500/50' : 'border-zinc-800 bg-zinc-900'}`}>
          {isImage && imgUrl ? (
            <img src={imgUrl} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <FileIcon className="w-4 h-4 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[11px] font-medium truncate ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>{file.name}</h3>
          <div className="flex gap-2 text-[9px] font-mono text-zinc-500">
            <span>{(file.size / 1024).toFixed(0)}KB</span>
            <span>•</span>
            <span>{new Date(file.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {file.tags.slice(0, 2).map(tag => (
            <span 
              key={tag} 
              onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
              className="px-1.5 py-0.5 bg-zinc-800/50 text-[8px] rounded-sm text-zinc-400 hover:text-indigo-400"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDownload(file); }} className="p-1 text-zinc-500 hover:text-indigo-400"><Download size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(file.id!); }} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      layout
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      className={`group relative rounded p-2 flex flex-col gap-2 transition-all cursor-pointer border-2 shadow-sm ${isSelected ? 'bg-zinc-900 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
    >
      <div className={`aspect-video rounded flex items-center justify-center overflow-hidden relative border ${isSelected ? 'border-indigo-500/20' : 'border-zinc-800 bg-zinc-800'}`}>
        {isImage && imgUrl ? (
          <img src={imgUrl} alt={file.name} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" referrerPolicy="no-referrer" />
        ) : (
          <FileIcon className="w-6 h-6 text-zinc-700" />
        )}
        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors" />
        {file.aiMetadata && (
          <div className="absolute top-1 right-1 px-1 bg-indigo-500 text-[8px] font-bold text-white rounded-[2px] opacity-80 uppercase tracking-tighter">AI:ON</div>
        )}
      </div>
      <div className="px-0.5">
        <h3 className={`text-[11px] font-medium truncate mb-0.5 ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>{file.name}</h3>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono text-zinc-500">{(file.size / 1024).toFixed(0)}KB • {file.type.split('/')[1].toUpperCase()}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => { e.stopPropagation(); onDelete(file.id!); }} className="p-0.5 text-zinc-600 hover:text-red-400"><Trash2 size={10} /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [sortField, setSortField] = useState<'name' | 'createdAt' | 'size'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const files = useLiveQuery(async () => {
    let all = await db.files.toArray();
    
    // Filtering
    if (searchQuery) {
      const lowSearch = searchQuery.toLowerCase();
      all = all.filter(f => 
        f.name.toLowerCase().includes(lowSearch) ||
        f.tags.some(t => t.toLowerCase().includes(lowSearch)) ||
        f.notes.toLowerCase().includes(lowSearch) ||
        f.aiMetadata?.description.toLowerCase().includes(lowSearch) ||
        f.aiMetadata?.extractedText.toLowerCase().includes(lowSearch) ||
        f.aiMetadata?.keywords.some(k => k.toLowerCase().includes(lowSearch))
      );
    }

    // Sorting
    all.sort((a, b) => {
      let valA = a[sortField] as any;
      let valB = b[sortField] as any;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return all;
  }, [searchQuery, sortField, sortOrder]);

  const totalBytes = useMemo(() => files?.reduce((acc, f) => acc + f.size, 0) || 0, [files]);
  const storageLimit = 100 * 1024 * 1024; // Mock 100MB internal limit for UI
  const storagePercent = Math.min((totalBytes / storageLimit) * 100, 100);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    setIsUploading(true);
    for (const f of Array.from(fileList)) {
      const file = f as File;
      const aiMeta = await analyzeImage(file);
      
      await db.files.add({
        name: file.name,
        type: file.type,
        size: file.size,
        data: file,
        tags: [],
        notes: '',
        createdAt: Date.now(),
        lastModified: Date.now(),
        aiMetadata: aiMeta
      });
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleDownload = (file: FileEntry) => {
    const url = URL.createObjectURL(file.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this file?')) {
      await db.files.delete(id);
      if (selectedFile?.id === id) setSelectedFile(null);
    }
  };

  const handleUpdate = async (id: number, data: Partial<FileEntry>) => {
    await db.files.update(id, data);
    if (selectedFile?.id === id) {
      const updated = await db.files.get(id);
      if (updated) setSelectedFile(updated);
    }
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    files?.forEach(f => f.tags.forEach(t => tags.add(t)));
    return Array.from(tags).slice(0, 10);
  }, [files]);

  return (
    <div className="flex w-full h-screen bg-brand-bg text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-border flex flex-col bg-brand-sidebar shrink-0">
        <div className="p-4 border-b border-brand-border flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-sm">F</div>
          <h1 className="font-semibold tracking-tight text-[13px] text-zinc-200">LOCAL_SYNC v1.0</h1>
        </div>
        
        <nav className="p-2 flex flex-col gap-0.5">
          <div 
            onClick={() => setSearchQuery('')}
            className={`px-3 py-2 rounded text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${!searchQuery ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className={!searchQuery ? 'text-indigo-400' : ''} />
              <span>All Files</span>
            </div>
            <span className="text-[10px] opacity-50">{files?.length || 0}</span>
          </div>
          <div className="px-3 py-2 hover:bg-zinc-800 text-zinc-400 rounded text-xs flex items-center gap-2 cursor-pointer transition-colors">
            <Clock size={14} />
            <span>Recent</span>
          </div>
          <div className="px-3 py-2 hover:bg-zinc-800 text-zinc-400 rounded text-xs flex items-center gap-2 cursor-pointer transition-colors">
            <Pin size={14} />
            <span>Pinned</span>
          </div>
        </nav>

        <div className="mt-4 px-5 py-2">
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {allTags.length > 0 ? allTags.map(tag => (
              <span 
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className={`px-2 py-0.5 border rounded-full text-[10px] cursor-pointer transition-all ${searchQuery === tag ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-800/20 border-zinc-700/50 text-zinc-500 hover:text-zinc-300'}`}
              >
                #{tag}
              </span>
            )) : (
              <p className="text-[10px] text-zinc-600 italic">No tags yet</p>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-brand-border">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter mb-2">STORAGE STATUS</div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mb-1.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              className="bg-indigo-500 h-full" 
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
            <span>{(totalBytes / 1024 / 1024).toFixed(1)}MB used</span>
            <span>IndexedDB</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <header className="h-14 border-b border-brand-border bg-brand-bg flex items-center px-4 justify-between shrink-0">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search filenames and image content (OCR)..." 
              className="w-full bg-zinc-900 border border-brand-border rounded px-9 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-indigo-500/10">
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? 'Uploading...' : 'Upload'}
              <input type="file" multiple onChange={handleUpload} className="hidden" disabled={isUploading} />
            </label>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-2 shrink-0">
            <div className="flex gap-4 text-[11px]">
              <button 
                onClick={() => setViewMode('grid')}
                className={`pb-1 px-1 transition-all border-b-2 ${viewMode === 'grid' ? 'text-indigo-400 font-medium border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              >
                Grid View
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`pb-1 px-1 transition-all border-b-2 ${viewMode === 'list' ? 'text-indigo-400 font-medium border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              >
                List Detail
              </button>
            </div>
            <div className="flex items-center gap-4 text-[9px] text-zinc-600 font-mono tracking-tighter">
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-zinc-400">
                  <span className="uppercase">Sort:</span> {sortField === 'createdAt' ? 'Date' : sortField}
                </button>
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-brand-border rounded p-1 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  {(['name', 'createdAt', 'size'] as const).map(f => (
                    <button key={f} onClick={() => setSortField(f)} className={`block w-full text-left px-2 py-1 rounded hover:bg-zinc-800 ${sortField === f ? 'text-indigo-400' : ''}`}>{f}</button>
                  ))}
                  <div className="h-px bg-zinc-800 my-1"/>
                  {(['asc', 'desc'] as const).map(o => (
                    <button key={o} onClick={() => setSortOrder(o)} className={`block w-full text-left px-2 py-1 rounded hover:bg-zinc-800 ${sortOrder === o ? 'text-indigo-400' : ''}`}>{o.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <span className="opacity-30">|</span>
              <span className="uppercase text-zinc-500">Filter: ALL TYPES</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto high-density-scrollbar pr-1">
            {!files ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500/20" size={32} /></div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-16 h-16 bg-zinc-900 rounded-full border border-brand-border flex items-center justify-center mb-4"><Search size={24} /></div>
                <p className="text-xs uppercase tracking-widest font-bold">No Records Found</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3" : "flex flex-col rounded bg-zinc-900/30 overflow-hidden border border-brand-border/50"}>
                <AnimatePresence mode='popLayout'>
                  {files.map((file, idx) => (
                    <FileCard 
                      key={file.id || idx} 
                      file={file} 
                      viewMode={viewMode}
                      isSelected={selectedFile?.id === file.id}
                      onPreview={setSelectedFile}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onTagClick={setSearchQuery}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quick Preview Panel */}
      <AnimatePresence>
        {selectedFile && (
          <motion.aside 
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 border-l border-brand-border bg-brand-sidebar flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-brand-border flex items-center justify-between shrink-0">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick Preview</h2>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 high-density-scrollbar">
              <div className="aspect-square bg-zinc-900 border border-brand-border rounded-lg flex items-center justify-center mb-5 relative overflow-hidden group">
                {selectedFile.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(selectedFile.data)} 
                    alt={selectedFile.name} 
                    className="w-full h-full object-contain p-2" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center">
                    <FileIcon size={48} className="text-zinc-800 mx-auto mb-2" />
                    <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter">{selectedFile.type}</div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={() => window.open(URL.createObjectURL(selectedFile.data))} className="text-white bg-indigo-600/80 p-2 rounded-full"><Eye size={18} /></button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter block mb-1">Filename</label>
                  <div className="text-[11px] font-mono text-zinc-300 break-all border-b border-brand-border pb-1.5">{selectedFile.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter block mb-1">Created</label>
                    <div className="text-[11px] font-mono text-zinc-400">{new Date(selectedFile.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter block mb-1">Size</label>
                    <div className="text-[11px] font-mono text-zinc-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter block mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedFile.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-[3px] text-[9px] flex items-center gap-1 group/tag">
                        {tag}
                        <button 
                          onClick={() => handleUpdate(selectedFile.id!, { tags: selectedFile.tags.filter(t => t !== tag) })}
                          className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
                        >
                          <X size={8} />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      placeholder="+ Add Tag"
                      className="bg-transparent border-dashed border border-zinc-800 px-2 py-0.5 rounded text-[9px] text-zinc-500 outline-none focus:border-zinc-600 focus:text-zinc-300 w-16 transition-all"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.currentTarget.value || '').trim();
                          if (val && !selectedFile.tags.includes(val)) {
                            handleUpdate(selectedFile.id!, { tags: [...selectedFile.tags, val] });
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter block mb-1">Notes</label>
                  <textarea 
                    className="w-full mt-1 bg-zinc-900/50 border border-brand-border rounded p-2 text-[11px] text-zinc-300 h-28 focus:outline-none focus:border-zinc-700 resize-none placeholder:text-zinc-700" 
                    placeholder="Add archival notes..."
                    value={selectedFile.notes}
                    onChange={e => handleUpdate(selectedFile.id!, { notes: e.target.value })}
                  />
                </div>

                {selectedFile.aiMetadata && (
                  <div className="pt-2">
                    <label className="text-[9px] text-indigo-500/70 font-bold uppercase tracking-tighter block mb-2">AI Extraction Hub</label>
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded p-2.5">
                      <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">{selectedFile.aiMetadata.description}</p>
                      {selectedFile.aiMetadata.extractedText && (
                        <div className="bg-zinc-950/50 p-2 rounded font-mono text-[8px] text-zinc-500 border border-zinc-800/50 max-h-20 overflow-y-auto high-density-scrollbar">
                           {selectedFile.aiMetadata.extractedText}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-brand-border grid grid-cols-2 gap-2 shrink-0">
              <button 
                onClick={() => handleDownload(selectedFile)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium rounded transition-colors text-zinc-200"
              >
                Download
              </button>
              <button 
                onClick={() => handleDelete(selectedFile.id!)}
                className="px-3 py-2 bg-red-900/10 text-red-500 hover:bg-red-900/20 border border-red-900/30 text-[11px] font-medium rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
