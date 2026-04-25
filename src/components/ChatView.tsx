import { useRef, useEffect, useState, useMemo } from "react";
import { Message, Conversation, ChatMode } from "../types";
import { MessageItem } from "./MessageItem";
import { InputArea } from "./InputArea";
import { Zap, Brain, Sparkles, ChevronDown, Download, Copy, Edit3, RotateCw, Pin, PinOff, Search, X, MessageSquarePlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatViewProps {
  conversation: Conversation | null;
  isStreaming: boolean;
  isThinking: boolean;
  onSendMessage: (content: string, attachments?: any[]) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onEdit: (id: string, content: string) => void;
  onTogglePin: (id: string) => void;
  onToggleTask: (messageId: string, taskIndex: number) => void;
  onRetry?: (id: string) => void;
  onNewChat?: () => void;
  mode: ChatMode;
  onModeToggle: (mode: ChatMode) => void;
}

export function ChatView({
  conversation,
  isStreaming,
  isThinking,
  onSendMessage,
  onStop,
  onRegenerate,
  onEdit,
  onTogglePin,
  onToggleTask,
  onRetry,
  onNewChat,
  mode,
  onModeToggle
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, messageId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredMessages = useMemo(() => {
    if (!conversation) return [];
    if (!searchTerm.trim()) return conversation.messages;
    
    return conversation.messages.filter(m => 
      m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversation, searchTerm]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    if (isStreaming || isThinking) {
      scrollToBottom();
    }
  }, [conversation?.messages, isStreaming, isThinking]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 300);
  };

  const quickPrompts = [
    { label: "Summarize this", text: "Summarize the major points of our discussion." },
    { label: "Explain code", text: "Can you explain how this code works in detail?" },
    { label: "Debug this", text: "Help me find and fix the issue in this snippet." },
    { label: "Write a story", text: "Write a short creative story about " }
  ];

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-md z-10 sticky top-0 transition-colors">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50">
          <span className="font-medium truncate max-w-[120px] md:max-w-none">
            {conversation ? conversation.title : "Synapse AI"}
          </span>
          <ChevronDown size={14} />
        </div>
        
        <div className="bg-gray-100 dark:bg-dark-sidebar p-1 rounded-full border border-gray-200 dark:border-white/10 flex items-center">
          <button
            onClick={() => onModeToggle("fast")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === "fast" 
                ? "bg-gray-200 dark:bg-dark-message text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 dark:text-white/40 hover:text-white"
            }`}
          >
            <span>⚡</span> <span className="hidden sm:inline">Fast</span>
          </button>
          <button
            onClick={() => onModeToggle("deep")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === "deep" 
                ? "bg-gray-200 dark:bg-dark-message text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 dark:text-white/40 hover:text-white"
            }`}
          >
            <span>🧠</span> <span className="hidden sm:inline">Thinking</span>
          </button>
          <button
            onClick={() => onModeToggle("search")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === "search" 
                ? "bg-accent/20 text-accent shadow-sm" 
                : "text-gray-500 dark:text-white/40 hover:text-white"
            }`}
          >
            <span>🌐</span> <span className="hidden sm:inline">Web Search</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative overflow-hidden"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Search chat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs outline-none focus:border-accent transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-lg transition-colors ${isSearchOpen ? "bg-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 dark:text-white/40"}`}
            title="Search conversation"
          >
            <Search size={18} />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />

          <button 
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-all active:scale-95 group"
            title="Start new conversation"
          >
            <MessageSquarePlus size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold hidden md:inline">New Chat</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 dark:text-white/40 transition-colors">
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth"
      >
        <div className="max-w-[720px] mx-auto px-4 py-10 md:py-16 w-full min-h-full flex flex-col">
          {!conversation || conversation.messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6"
              >
                <Sparkles size={32} className="text-accent" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight text-gray-900 dark:text-white">How can I help you today?</h2>
              <p className="text-gray-500 dark:text-white/30 mb-10 max-w-sm mx-auto text-sm">
                Start a conversation with Synapse using the input below or try a quick prompt.
              </p>
            </div>
          ) : (
            <div className="flex-1">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
                    }}
                  >
                    <MessageItem 
                      message={msg} 
                      onEdit={(content) => onEdit(msg.id, content)}
                      isLast={conversation?.messages[conversation.messages.length - 1]?.id === msg.id}
                      onRegenerate={onRegenerate}
                      onRetry={onRetry}
                      onToggleTask={(taskIndex) => onToggleTask(msg.id, taskIndex)}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Search size={24} className="mb-2 opacity-20" />
                  <p className="text-sm">No messages match "{searchTerm}"</p>
                </div>
              )}
              {isThinking && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 mb-16"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-dark-sidebar flex items-center justify-center shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden relative group">
                    <Brain size={22} className="text-accent/50 animate-pulse" />
                    <div className="absolute inset-0 bg-accent/5 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-white/20 px-1">
                      Synapse is thinking
                    </div>
                    <div className="flex gap-1.5 px-1 py-2">
                       {[0, 1, 2].map((i) => (
                         <motion.div
                           key={i}
                           animate={{ 
                             scale: [1, 1.4, 1],
                             opacity: [0.2, 0.5, 0.2]
                           }}
                           transition={{ 
                             repeat: Infinity, 
                             duration: 1.2, 
                             delay: i * 0.2 
                           }}
                           className="w-1.5 h-1.5 rounded-full bg-accent"
                         />
                       ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {isStreaming && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-5 bg-white dark:bg-white/[0.03] w-fit rounded-[2rem] border border-gray-100 dark:border-white/5 mt-8 mb-16 shadow-2xl shadow-accent/5 backdrop-blur-xl group"
                >
                  <div className="relative">
                    <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-accent/20 overflow-hidden">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 4,
                          ease: "linear"
                        }}
                        className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]"
                      />
                      <Brain size={18} className="relative z-10" />
                      
                      {/* Internal Glow */}
                      <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-white/20 blur-md"
                      />
                    </div>

                    {/* Outer Rings */}
                    <div className="absolute -inset-1 rounded-2xl border border-accent/20 animate-pulse" />
                    <motion.div 
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -inset-2 rounded-2xl border border-accent/10"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Synapse Core</span>
                      <motion.div
                        animate={{ width: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="h-px bg-accent/30"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white/80">
                      <span className="tracking-tight">Synthesizing response</span>
                      <div className="flex gap-1 ml-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 1, 0.3]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1, 
                              delay: i * 0.2,
                              ease: "easeInOut"
                            }}
                            className="w-1 h-1 rounded-full bg-accent"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

        </div>

        {/* Custom Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ top: contextMenu.y, left: contextMenu.x }}
                className="fixed z-[101] min-w-[160px] bg-white dark:bg-dark-sidebar border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 backdrop-blur-xl"
              >
                <button 
                  onClick={() => {
                    const msg = conversation?.messages.find(m => m.id === contextMenu.messageId);
                    if (msg) navigator.clipboard.writeText(msg.content);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Copy size={14} className="text-gray-400" /> Copy Content
                </button>
                <button 
                  onClick={() => {
                    // Logic to trigger edit on specific message
                    const trigger = document.getElementById(`edit-trigger-${contextMenu.messageId}`);
                    trigger?.click();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Edit3 size={14} className="text-gray-400" /> Edit Message
                </button>
                <button 
                  onClick={() => {
                    onTogglePin(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors border-t border-gray-100 dark:border-white/5 mt-1 pt-2"
                >
                  {conversation?.messages.find(m => m.id === contextMenu.messageId)?.isPinned ? (
                    <><PinOff size={14} className="text-accent" /> Unpin Message</>
                  ) : (
                    <><Pin size={14} className="text-gray-400" /> Pin Message</>
                  )}
                </button>
                {conversation?.messages.findIndex(m => m.id === contextMenu.messageId) === conversation!.messages.length - 1 && (
                  <button 
                    onClick={() => {
                      onRegenerate();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <RotateCw size={14} className="text-gray-400" /> Regenerate
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Input Bar Section */}
      <div className="w-full flex justify-center pb-10 px-4 z-10">
        <div className="w-full max-w-[720px]">
          <div className="relative mb-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-fade-edges">
              {quickPrompts.map((p) => (
                <motion.button
                  key={p.label}
                  whileHover={{ y: -2 }}
                  onClick={() => onSendMessage(p.text)}
                  className="group relative px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/5 text-[11px] font-bold text-gray-500 dark:text-white/40 cursor-pointer hover:bg-white/10 hover:text-accent dark:hover:text-white shrink-0 transition-all overflow-hidden"
                >
                  <span className="relative z-10">{p.label}</span>
                  <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  
                  {/* Visual Cue */}
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles size={8} className="text-accent" />
                  </div>
                </motion.button>
              ))}
            </div>
            {/* Fade effect styling would be in CSS, but I'll add inline style for mask if possible or just rely on class */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-light-bg dark:from-dark-bg to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-light-bg dark:from-dark-bg to-transparent z-10" />
          </div>

          <InputArea 
            onSend={onSendMessage} 
            isStreaming={isStreaming} 
            onStop={onStop} 
          />

          <div className="text-center mt-3 text-[10px] text-gray-400 dark:text-white/20 font-medium">
            Synapse can make mistakes. Check important info.
          </div>
        </div>
        
        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              onClick={scrollToBottom}
              className="absolute -top-12 right-1/2 translate-x-1/2 p-2 rounded-full bg-white dark:bg-dark-message shadow-xl border border-gray-200 dark:border-white/10 text-accent hover:scale-110 transition-transform"
            >
              <ChevronDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden lg:flex absolute bottom-6 left-6 text-[10px] text-gray-300 dark:text-white/10 gap-4 font-mono pointer-events-none">
        <span>Ctrl + N: New Chat</span>
        <span>Ctrl + K: Focus</span>
        <span>Esc: Stop</span>
      </div>
    </div>
  );
}

// Add ChevronDown to imports if needed
