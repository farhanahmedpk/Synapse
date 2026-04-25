import { motion, AnimatePresence } from "motion/react";
import { X, Key, Shield, Layout, Palette, Trash2, Github } from "lucide-react";
import { AppSettings, ChatMode } from "../types";
import { useTheme } from "./ThemeContext";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (settings: Partial<AppSettings>) => void;
  onClearHistory: () => void;
}

export function SettingsPanel({ isOpen, onClose, settings, onUpdate, onClearHistory }: SettingsPanelProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white dark:bg-dark-sidebar shadow-2xl p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl dark:text-white font-bold tracking-tight">Settings</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full dark:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-10">
              {/* API Security Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-accent font-bold uppercase text-xs tracking-widest">
                  <Shield size={14} />
                  Security
                </div>
                <div className="p-5 rounded-3xl bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-accent" />
                      <span className="text-sm font-bold dark:text-white">OpenRouter API Key</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] uppercase font-black tracking-tighter ${
                      settings.apiKeyValid ? "text-green-500" : (settings.apiKeyConfigured ? "text-orange-500" : "text-red-500")
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        settings.apiKeyValid ? "bg-green-500" : (settings.apiKeyConfigured ? "bg-orange-500" : "bg-red-500")
                      }`} />
                      {settings.apiKeyValid ? "Active" : (settings.apiKeyConfigured ? "Invalid" : "Missing")}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="password"
                        value={settings.customApiKey || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdate({ customApiKey: val });
                        }}
                        placeholder="sk-or-v1-..."
                        className={`w-full bg-light-bg dark:bg-dark-sidebar border-2 rounded-2xl px-4 py-3 text-sm transition-all outline-none dark:text-white ${
                          !settings.customApiKey 
                            ? "border-transparent" 
                            : settings.customApiKey.startsWith("sk-or-v1-") && settings.customApiKey.length > 20
                              ? "border-green-500/30 focus:border-green-500"
                              : "border-red-500/30 focus:border-red-500"
                        }`}
                      />
                      {settings.customApiKey && !settings.customApiKey.startsWith("sk-or-v1-") && (
                        <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-medium italic">
                          Format error: Key should start with 'sk-or-v1-'
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] leading-relaxed text-gray-500 dark:text-white/20">
                      {settings.apiKeyConfigured 
                        ? `System is using a pre-configured key, but your custom key will take priority.`
                        : "Required to enable chat. Your key is only sent to the local proxy server."}
                    </p>
                    
                    {settings.apiStatusMessage && !settings.apiKeyValid && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-mono leading-tight">
                        {settings.apiStatusMessage}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Preferences Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-accent font-bold uppercase text-xs tracking-widest">
                  <Layout size={14} />
                  Preferences
                </div>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold dark:text-white">Temperature</div>
                      <div className="text-xs font-mono text-accent">{settings.temperature}</div>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1" 
                      value={settings.temperature}
                      onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold dark:text-white">Max Tokens</div>
                      <div className="text-xs font-mono text-accent">{settings.maxTokens}</div>
                    </div>
                    <input 
                      type="range" 
                      min="256" 
                      max="8192" 
                      step="256" 
                      value={settings.maxTokens}
                      onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold dark:text-white">Default Model Mode</div>
                      <div className="text-xs text-gray-500">Choose your preferred initial mode</div>
                    </div>
                    <select 
                      value={settings.defaultMode}
                      onChange={(e) => onUpdate({ defaultMode: e.target.value as ChatMode })}
                      className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm p-2 outline-none dark:text-white"
                    >
                      <option value="fast">⚡ Fast</option>
                      <option value="deep">🧠 Thinking</option>
                      <option value="search">🌐 Web Search</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold dark:text-white">Custom System Prompt</div>
                    <textarea
                      value={settings.systemPrompt}
                      onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                      placeholder="You are Synapse..."
                      className="w-full min-h-[120px] bg-gray-100 dark:bg-gray-800 border-none rounded-2xl text-sm p-4 outline-none resize-none focus:ring-1 focus:ring-accent dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </section>

              {/* Data Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-accent font-bold uppercase text-xs tracking-widest">
                  <Palette size={14} />
                  Appearance & Data
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold dark:text-white">Dark Mode</div>
                      <div className="text-xs text-gray-500">Switch between light and dark themes</div>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className={`w-12 h-6 rounded-full relative transition-colors ${theme === "dark" ? "bg-accent" : "bg-gray-300"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === "dark" ? "right-1" : "left-1"}`} />
                    </button>
                  </div>

                  <button 
                    onClick={onClearHistory}
                    className="flex items-center gap-2 w-full p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-semibold text-sm"
                  >
                    <Trash2 size={16} />
                    Clear All Conversations
                  </button>
                </div>
              </section>

              {/* External Links */}
              <footer className="pt-10 flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Github size={14} />
                  Project GitHub
                </div>
                <span>v1.0.0</span>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
