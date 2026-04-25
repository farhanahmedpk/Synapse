import { useState, useRef, useEffect, useMemo } from "react";
import { Message } from "../types";
import { useTheme } from "./ThemeContext";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, RotateCw, Edit3, User, Cpu, Zap, Brain, AlertCircle, XCircle, Pin, FileText, Volume2, VolumeX, Sparkles, Paperclip, Terminal, List, Hash } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import hljs from "highlight.js";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ImageModal } from "./ImageModal";
import { LinkPreview } from "./LinkPreview";

interface MessageItemProps {
  key?: string;
  message: Message;
  onEdit: (content: string) => void;
  isLast: boolean;
  onRegenerate: () => void;
  onRetry?: (id: string) => void;
  onToggleTask?: (taskIndex: number) => void;
}

const CodeBlock = ({ children, className }: { children: any, className?: string }) => {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") || "plaintext";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = useMemo(() => {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(String(children), { language: lang }).value;
      }
      return hljs.highlightAuto(String(children)).value;
    } catch (e) {
      return String(children);
    }
  }, [children, lang]);

  return (
    <div className="group relative my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-gray-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-[10px] font-bold transition-all text-gray-500 hover:text-accent"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono custom-scrollbar">
        <code className={`hljs language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
};

export function MessageItem({ message, onEdit, isLast, onRegenerate, onRetry, onToggleTask }: MessageItemProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  const toggleSpeech = () => {
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
    } else {
      const cleanContent = message.content.replace(/[#*`_~]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanContent);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      synth.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (synth) synth.cancel();
    };
  }, []);

  const isUser = message.role === "user";

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);

  const copyToClipboard = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(message.content)
      .then(() => {
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
      })
      .catch(err => console.error("Failed to copy text: ", err));
  };

  const urls = useMemo(() => {
    const regex = /(https?:\/\/[^\s)]+)/g;
    const matches = message.content.match(regex);
    if (!matches) return [];
    return Array.from(new Set(matches)).filter(url => {
        // Simple filter to avoid showing previews for images that are already rendered inline
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url);
        return !isImage;
    }).slice(0, 3); // Limit to 3 previews per message
  }, [message.content]);

  const renderers = {
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono text-accent" {...props}>{children}</code>;
      }
      return <CodeBlock className={className}>{children}</CodeBlock>;
    },
    li({ node, children, checked, ...props }: any) {
        if (checked !== null && checked !== undefined) {
            // Find task index
            let taskIndex = -1;
            if (node.position) {
              // This is a rough estimation since react-markdown doesn't provide easy indexing for tasks
              // We'll rely on the parent index or just the fact it's a checkbox
            }
            
            return (
                <li className="flex items-start gap-3 my-2 list-none group/task">
                    <input 
                        type="checkbox" 
                        checked={checked} 
                        readOnly
                        className="mt-1.5 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent accent-accent cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault();
                            // We need to find which task this is in the content
                            // For simplicity, we search for the n-th checkbox
                            const container = (e.target as HTMLElement).closest('.markdown-body');
                            if (container) {
                                const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                                const index = checkboxes.indexOf(e.target as any);
                                if (index !== -1) {
                                    onToggleTask?.(index);
                                }
                            }
                        }}
                    />
                    <span className={`flex-1 ${checked ? "line-through text-gray-400 opacity-60" : "text-gray-800 dark:text-white/90"}`}>
                        {children}
                    </span>
                </li>
            );
        }
        return <li className="my-2 leading-relaxed" {...props}>{children}</li>;
    },
    ol({ children }: any) {
        return <ol className="list-decimal pl-6 my-4 space-y-2">{children}</ol>;
    },
    ul({ children }: any) {
        return <ul className="list-disc pl-6 my-4 space-y-2">{children}</ul>;
    },
    p({ children }: any) {
        return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
    },
    strong({ children }: any) {
        return <strong className="font-black text-gray-900 dark:text-white underline decoration-accent/20 decoration-2 underline-offset-2">{children}</strong>;
    },
    em({ children }: any) {
        return <em className="italic text-gray-700 dark:text-indigo-200/80">{children}</em>;
    },
    h1({ children }: any) { return <h1 className="text-2xl font-black mb-4 mt-8 pb-2 border-b border-gray-100 dark:border-white/5">{children}</h1> },
    h2({ children }: any) { return <h2 className="text-xl font-black mb-3 mt-6">{children}</h2> },
    h3({ children }: any) { return <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3> },
    blockquote({ children }: any) {
      return <blockquote className="border-l-4 border-accent/30 pl-4 py-1 my-4 italic bg-accent/5 rounded-r-xl">{children}</blockquote>;
    }
  };

  return (
    <motion.div 
      initial={{ x: isUser ? 20 : -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`group flex items-start gap-4 mb-10 w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar Container */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10 overflow-hidden transform group-hover:scale-110 transition-transform">
            <User size={20} className="text-white" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-dark-sidebar flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-none border border-gray-100 dark:border-white/10 overflow-hidden transform group-hover:scale-110 transition-transform">
            <div className="relative">
              <Brain size={22} className="text-accent" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-white dark:border-dark-sidebar animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] font-black uppercase tracking-widest">
            <span className="text-gray-400 dark:text-white/30">
                {isUser ? "Me" : "Synapse"}
            </span>
            {!isUser && message.mode && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                    message.mode === "fast" ? "bg-accent/10 text-accent border border-accent/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                }`}>
                    {message.mode === "fast" ? "⚡ SPEED" : "🧠 REASON"}
                </span>
            )}
        </div>

        <div className={`relative w-full ${
          isUser 
            ? "bg-accent/5 dark:bg-dark-message px-5 py-4 rounded-3xl rounded-tr-none text-gray-900 dark:text-white/90 text-[15px] shadow-xl group-hover:shadow-accent/5 transition-all border border-accent/10" 
            : "bg-white dark:bg-white/5 px-6 py-5 rounded-3xl rounded-tl-none text-gray-800 dark:text-white/90 text-[15px] leading-relaxed shadow-sm dark:shadow-none border border-gray-100 dark:border-white/5"
        } ${isEditing ? "ring-2 ring-accent animate-pulse-slow transition-all" : ""} ${
          message.isError ? "bg-red-500/5 dark:bg-red-500/5 border-red-500/20" : ""
        } ${message.isPinned ? "border-accent/40 shadow-accent/10 shadow-lg" : ""}`}>
          
          {message.isPinned && (
            <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform z-10">
              <Pin size={14} fill="currentColor" />
            </div>
          )}

          {isEditing ? (
            <div className="w-full flex flex-col gap-4 min-w-[280px]">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-accent tracking-widest px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <Edit3 size={10} /> Editing Message
                </div>
                <div className="text-gray-400">Esc to cancel</div>
              </div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onEdit(editContent);
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="bg-transparent w-full outline-none resize-none font-sans text-inherit leading-relaxed focus:ring-0"
                autoFocus
              />
              
              {/* Live Preview Pane */}
              <div className="mt-4 p-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400 dark:text-white/20 tracking-widest mb-3">
                  <Cpu size={10} /> Live Preview
                </div>
                <div className="markdown-body transition-opacity duration-300 opacity-60 text-sm">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]} 
                    components={renderers}
                  >
                    {editContent}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-accent/10">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/5 text-[12px] font-bold transition-all text-gray-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onEdit(editContent);
                    setIsEditing(false);
                  }}
                  className="px-6 py-2 rounded-2xl bg-accent text-white font-black text-[12px] shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full relative">
              {message.isError && (
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-lg shadow-red-500/5">
                    <AlertCircle size={24} className="mt-1 flex-shrink-0 animate-bounce" />
                    <div className="space-y-2">
                        <div className="text-sm font-black uppercase tracking-tighter">Generation Error</div>
                        <div className="text-[13px] font-medium leading-relaxed opacity-90">{message.content}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 px-1">
                    <button 
                        onClick={() => onRetry?.(message.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-[12px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                    >
                        <RotateCw size={14} /> Retry Message
                    </button>
                  </div>
                </div>
              )}

              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-accent tracking-[0.2em] px-1 opacity-60">
                    <Paperclip size={10} /> {message.attachments.length} Successfully Uploaded
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {message.attachments.map((att) => (
                      <div key={att.id} className="group/att relative">
                        <div className="max-w-[220px] min-w-[140px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                          {att.type.startsWith("image/") ? (
                            <img 
                              src={att.data} 
                              alt={att.name} 
                              className="w-full h-auto max-h-[300px] object-contain cursor-pointer transition-transform" 
                              onClick={() => setPreviewImage({ url: att.data, name: att.name })}
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3">
                              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                                <FileText size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{att.name}</div>
                                <div className="text-[10px] opacity-50 uppercase font-black">{(att.size / 1024).toFixed(1)} KB</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-black/20 z-10">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!message.isError && (
                <>
                  <div className="markdown-body transition-opacity duration-300">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]} 
                        components={renderers}
                    >
                        {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Link Previews */}
                  {urls.length > 0 && (
                    <div className="mt-6 flex flex-col gap-1 border-t border-gray-100 dark:border-white/5 pt-4">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400 dark:text-white/20 tracking-widest pl-1 mb-2">
                            <Sparkles size={10} className="text-accent" /> Link Explorations
                        </div>
                        {urls.map(url => <LinkPreview key={url} url={url} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action Bar */}
          {!isEditing && !message.isError && !isUser && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                {message.usage && (
                  <div className="text-[9px] text-gray-400 dark:text-white/20 font-black uppercase tracking-widest flex items-center gap-2">
                    <Zap size={8} /> {message.usage.total_tokens} tokens
                  </div>
                )}
                <div className="text-[9px] text-gray-400 dark:text-white/20 font-black uppercase tracking-widest">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={toggleSpeech}
                  className={`p-2 rounded-xl transition-all transform active:scale-90 ${isSpeaking ? "bg-accent text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/40 hover:bg-accent hover:text-white"}`}
                  title={isSpeaking ? "Stop speaking" : "Read aloud"}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-accent hover:text-white text-gray-400 dark:text-white/40 transition-all transform active:scale-90"
                  title="Copy content"
                >
                  {isCopying ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {isLast && (
                  <button 
                    onClick={onRegenerate}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-accent hover:text-white text-gray-400 dark:text-white/40 transition-all transform active:scale-90"
                    title="Regenerate"
                  >
                    <RotateCw size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {isUser && !isEditing && (
            <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
              <button 
                id={`edit-trigger-${message.id}`}
                onClick={() => setIsEditing(true)}
                className="p-2.5 rounded-2xl bg-white dark:bg-dark-sidebar shadow-xl border border-gray-100 dark:border-white/10 text-gray-400 hover:text-accent transition-all transform hover:scale-110 active:scale-95"
                title="Edit message"
              >
                <Edit3 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ImageModal 
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ""}
        imageName={previewImage?.name || ""}
      />
    </motion.div>
  );
}

