/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { SettingsPanel } from "./components/SettingsPanel";
import { useChat } from "./hooks/useChat";
import { AppSettings, ChatMode } from "./types";

import { Component, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("ErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400">The application encountered an unexpected error. We've saved your progress.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-accent text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("fast");
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("appSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return {
          ...parsed,
          defaultMode: parsed.defaultMode || "fast",
          temperature: parsed.temperature ?? 0.7,
          maxTokens: parsed.maxTokens ?? 4096,
          topP: parsed.topP ?? 0.7
        };
      }
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
    return {
      defaultMode: "fast",
      systemPrompt: "You are Synapse, a helpful and precise assistant. You provide high-quality responses that are accurate and helpful.",
      apiKeyConfigured: true,
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.7
    };
  });

  const {
    conversations,
    activeConversation,
    activeId,
    setActiveId,
    createNewChat,
    deleteConversation,
    sendMessage,
    isStreaming,
    isThinking,
    stopStreaming,
    regenerate,
    editAndResubmit,
    togglePin,
    retryMessage,
    toggleTask
  } = useChat();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customKey: settings.customApiKey })
      })
        .then(res => res.json())
        .then(data => {
          setSettings(prev => ({ 
            ...prev, 
            apiKeyConfigured: data.configured,
            apiKeyValid: data.valid,
            apiStatusMessage: data.statusMessage,
            apiKeyPrefix: data.keyPrefix
          }));
        })
        .catch(err => console.error("Error checking API status:", err));
    }, 1000);

    return () => clearTimeout(timer);
  }, [settings.customApiKey]);

  useEffect(() => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
    setMode(settings.defaultMode);
  }, [settings]);

  const handleModeToggle = (newMode: ChatMode) => {
    setMode(newMode);
  };

  const handleExport = () => {
    if (!activeConversation) return;
    const content = activeConversation.messages.map(m => `--- ${m.role.toUpperCase()} ---\n${m.content}\n`).join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synapse-chat-${activeConversation.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to delete all chat history? This cannot be undone.")) {
      localStorage.removeItem("conversations");
      window.location.reload();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            createNewChat();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case 'k':
            e.preventDefault();
            // Focus logic if needed
            document.querySelector('textarea')?.focus();
            break;
        }
      }
      if (e.key === 'Escape') {
        if (isStreaming) stopStreaming();
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat, isStreaming, stopStreaming, isSettingsOpen]);

  return (
    <Layout
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuChange={setIsMobileMenuOpen}
      sidebar={
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setIsMobileMenuOpen(false);
          }}
          onNewChat={() => {
            createNewChat();
            setIsMobileMenuOpen(false);
          }}
          onDelete={deleteConversation}
          onOpenSettings={() => {
            setIsSettingsOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onExport={handleExport}
        />
      }
    >
      <ChatView
        conversation={activeConversation}
        isStreaming={isStreaming}
        isThinking={isThinking}
        onSendMessage={(content, attachments) => sendMessage(content, mode, settings, attachments)}
        onStop={stopStreaming}
        onRegenerate={() => regenerate(mode, settings)}
        onEdit={(id, content) => editAndResubmit(id, content, mode, settings)}
        onTogglePin={togglePin}
        onToggleTask={toggleTask}
        onNewChat={createNewChat}
        onRetry={(id) => retryMessage(id, mode, settings)}
        mode={mode}
        onModeToggle={handleModeToggle}
      />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={(newSettings) => {
          setSettings({ ...settings, ...newSettings });
          if (newSettings.theme) {
            // Handled by ThemeContext, but we sync state
          }
        }}
        onClearHistory={handleClearHistory}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
