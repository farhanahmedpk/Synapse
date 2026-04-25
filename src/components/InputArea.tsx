import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Paperclip, X, FileText, Image as ImageIcon, Mic, MicOff, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generateId } from "../lib/utils";

interface Attachment {
  id: string;
  file: File;
  previewUrl?: string;
  type: string;
  isUploading?: boolean;
  progress?: number;
}

interface InputAreaProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function InputArea({ onSend, isStreaming, onStop }: InputAreaProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseContentRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let sessionTranscript = "";
          for (let i = 0; i < event.results.length; ++i) {
            sessionTranscript += event.results[i][0].transcript;
          }
          
          const newContent = baseContentRef.current + 
            (baseContentRef.current && !baseContentRef.current.endsWith(" ") ? " " : "") + 
            sessionTranscript;
            
          setContent(newContent);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      baseContentRef.current = content;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const processFiles = (files: FileList | null | File[]) => {
    if (!files) return;
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit per file
    const fileList = Array.from(files).filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setUploadStatus(`File ${file.name} is too large (>15MB)`);
        setTimeout(() => setUploadStatus(null), 3000);
        return false;
      }
      return true;
    });

    if (fileList.length === 0) return;

    const newAttachments: Attachment[] = fileList.map((file) => ({
      id: generateId(),
      file,
      type: file.type || 'application/octet-stream',
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      isUploading: true,
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Simulate upload for each file
    newAttachments.forEach(att => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 40;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, isUploading: false, progress: 100 } : a));
        } else {
          setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, progress: Math.floor(currentProgress) } : a));
        }
      }, 100);
    });
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const filtered = prev.filter(a => a.id !== id);
      const removed = prev.find(a => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
  };

  const handleSubmit = () => {
    const isUploadingAny = attachments.some(a => a.isUploading);
    if (isUploadingAny) {
      setUploadStatus("Please wait for files to finish processing...");
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }

    if ((content.trim() || attachments.length > 0) && !isStreaming) {
      onSend(content.trim(), attachments);
      setContent("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isUploadingAny = attachments.some(a => a.isUploading);

  return (
    <div 
      className="flex flex-col gap-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isUploadingAny && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 z-50 pointer-events-none"
          >
            <div className="w-2 h-2 rounded-full bg-accent-foreground animate-pulse" /> Processing files...
          </motion.div>
        )}

        {uploadStatus && !isUploadingAny && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 z-50 pointer-events-none"
          >
            <Check size={12} strokeWidth={3} /> {uploadStatus}
          </motion.div>
        )}

        {isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-0 -top-20 bottom-0 z-50 flex flex-col items-center justify-center bg-accent/10 border-2 border-dashed border-accent rounded-3xl backdrop-blur-[2px] pointer-events-none"
          >
            <div className="bg-white dark:bg-dark-message p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent animate-bounce">
                <Paperclip size={24} />
              </div>
              <div className="text-sm font-black uppercase tracking-widest text-accent">Drop files here</div>
            </div>
          </motion.div>
        )}
        
        {attachments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-2 px-2"
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div key={att.id} className="relative group animate-in zoom-in-95 duration-200">
                  <div className={`w-16 h-16 rounded-xl border border-accent/30 dark:border-accent/40 bg-white dark:bg-dark-message overflow-hidden flex items-center justify-center shadow-md ring-2 ring-accent/5 ${att.isUploading ? 'opacity-70' : ''}`}>
                    {att.previewUrl ? (
                      <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <FileText size={20} className="text-accent" />
                        <span className="text-[8px] font-black uppercase text-accent/60 px-1 truncate w-12 text-center">{att.file.name.split('.').pop()}</span>
                      </div>
                    )}
                    
                    {att.isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 relative">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <circle
                              className="text-white/20"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="transparent"
                              r="16"
                              cx="18"
                              cy="18"
                            />
                            <motion.circle
                              className="text-accent"
                              strokeWidth="3"
                              strokeDasharray={100}
                              initial={{ strokeDashoffset: 100 }}
                              animate={{ strokeDashoffset: 100 - (att.progress || 0) }}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="16"
                              cx="18"
                              cy="18"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                            {att.progress}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!att.isUploading && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-dark-message z-10 animate-in fade-in zoom-in duration-300">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                  
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gray-500/80 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-colors z-20 backdrop-blur-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-1">
              {attachments.map((att) => (
                <div key={`status-${att.id}`} className="flex items-center gap-2 text-[10px] font-bold tracking-tight px-1">
                  {att.isUploading ? (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-white/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Uploading <span className="text-gray-700 dark:text-white/60">{att.file.name}</span>... {att.progress}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-500 animate-in fade-in slide-in-from-left-1 duration-500">
                      <Check size={10} strokeWidth={4} />
                      <span className="text-gray-700 dark:text-white/60">{att.file.name}</span> upload complete!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative group shadow-2xl shadow-accent/5 rounded-2xl border transition-all ${
        isDragging 
          ? "border-accent ring-4 ring-accent/10 scale-[1.01]" 
          : "border-gray-200 dark:border-white/10 focus-within:border-accent/40"
      } bg-white dark:bg-dark-message p-2 pl-4`}>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-gray-400 hover:text-accent hover:bg-accent/10 transition-all"
            title="Attach files"
          >
            <Paperclip size={20} />
          </button>

          <button 
            onClick={toggleListening}
            className={`p-2 rounded-xl transition-all ${isListening ? "text-red-500 bg-red-500/10 animate-pulse" : "text-gray-400 hover:text-accent hover:bg-accent/10"}`}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Synapse..."
            className="flex-1 max-h-[200px] min-h-[44px] py-2 bg-transparent outline-none resize-none font-sans text-sm md:text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20"
            rows={1}
          />
          
          <div className="flex items-center">
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.button
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={onStop}
                  className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg shadow-red-500/20"
                >
                  <Square size={18} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={handleSubmit}
                  disabled={(!content.trim() && attachments.length === 0) || isUploadingAny}
                  className={`ml-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    (content.trim() || attachments.length > 0) && !isUploadingAny
                      ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" 
                      : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 cursor-not-allowed"
                  }`}
                >
                  <Send size={18} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
