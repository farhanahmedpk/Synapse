import { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, Settings, Download, Moon, Sun, Key, Search, X } from "lucide-react";
import { Conversation } from "../types";
import { useTheme } from "./ThemeContext";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onExport: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onOpenSettings,
  onExport
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Logo Area */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <MessageSquare size={18} className="text-dark-sidebar" fill="currentColor" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">Synapse</span>
        </div>
        
        <button
          onClick={onNewChat}
          className="w-full py-3 px-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-accent/10 mb-6"
        >
          <Plus size={16} strokeWidth={3} />
          New Chat
        </button>

        {/* Search Bar */}
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-accent/30 rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 px-3 overflow-y-auto no-scrollbar">
        {(() => {
          const sorted = [...filteredConversations].sort((a, b) => b.updatedAt - a.updatedAt);
          const groups: { [key: string]: Conversation[] } = {
            "Today": [],
            "Yesterday": [],
            "Past Week": [],
            "Older": []
          };

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const startOfYesterday = startOfToday - 86400000;
          const startOfPastWeek = startOfToday - 86400000 * 7;

          sorted.forEach(conv => {
            if (conv.updatedAt >= startOfToday) groups["Today"].push(conv);
            else if (conv.updatedAt >= startOfYesterday) groups["Yesterday"].push(conv);
            else if (conv.updatedAt >= startOfPastWeek) groups["Past Week"].push(conv);
            else groups["Older"].push(conv);
          });

          const activeGroups = Object.entries(groups).filter(([_, items]) => items.length > 0);

          if (activeGroups.length === 0) {
            return (
              <div className="text-center py-10 opacity-30 text-xs">
                {searchQuery ? "No matches found" : "No history yet"}
              </div>
            );
          }

          return activeGroups.map(([groupName, items]) => (
            <div key={groupName} className="mb-6">
              <div className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] px-3 mb-2">
                {groupName}
              </div>
              <div className="space-y-1">
                {items.map((conv) => (
                  <motion.div
                    layout
                    key={conv.id}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm border ${
                      activeId === conv.id
                        ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-lg shadow-accent/5 border-accent/20"
                        : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-white/60"
                    }`}
                    onClick={() => onSelect(conv.id)}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeId === conv.id ? "bg-accent scale-125 shadow-[0_0_8px_var(--color-accent)]" : "bg-gray-300 dark:bg-white/10"}`} />
                    <span className={`flex-1 truncate font-semibold tracking-tight ${activeId === conv.id ? "text-gray-900 dark:text-white" : ""}`}>{conv.title}</span>
                    <div className="flex items-center gap-1">
                      <AnimatePresence mode="wait">
                        {confirmDeleteId === conv.id ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1 bg-red-500/10 rounded-md p-0.5"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(conv.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-red-500 hover:text-red-600 p-1 text-[10px] font-black uppercase"
                            >
                              Del
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="text-gray-400 hover:text-white p-1"
                            >
                              <X size={10} />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="delete"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 mt-auto border-t border-gray-200 dark:border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-orange-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white/20">
              JD
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-white/70 truncate">Jane Doe</span>
          </div>
          <button 
            onClick={onOpenSettings}
            className="text-gray-400 dark:text-white/40 hover:text-accent transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
          >
            <Settings size={16} />
          </button>
        </div>

        <button
          onClick={onExport}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-xs text-gray-500 dark:text-white/40 transition-all font-medium"
        >
          <Download size={16} />
          Export Chats
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-xs text-gray-500 dark:text-white/40 transition-all font-medium"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          Theme: {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-xs text-gray-500 dark:text-white/40 transition-all font-medium"
        >
          <Key size={16} />
          API Config
        </button>
      </div>
    </div>
  );
}
