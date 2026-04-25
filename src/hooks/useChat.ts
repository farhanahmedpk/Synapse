import { useState, useRef, useEffect, useCallback } from "react";
import { Message, Conversation, Role, ChatMode, Attachment as MessageAttachment, AppSettings } from "../types";

import { generateId } from "../lib/utils";

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem("conversations");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse conversations from localStorage", e);
      return [];
    }
  });
  
  const [activeId, setActiveId] = useState<string | null>(() => {
    const lastActive = localStorage.getItem("activeConversationId");
    return lastActive || null;
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    // Avoid saving massive base64 strings to localStorage to prevent QuotaExceededError
    const saveToLocalStorage = () => {
      try {
        const conversationsToSave = conversations.map(conv => ({
          ...conv,
          messages: conv.messages.map(msg => ({
            ...msg,
            // Strip heavy data from attachments when persisting
            attachments: msg.attachments?.map(att => ({
              ...att,
              data: att.isText ? att.data : "[REMOVED_FOR_STORAGE]"
            }))
          }))
        })).slice(0, 50); // Limit to top 50 conversations

        localStorage.setItem("conversations", JSON.stringify(conversationsToSave));
      } catch (e) {
        console.error("Failed to save conversations to localStorage:", e);
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          // If we hit quota, try an even more aggressive cleanup
          try {
            const ultraCleaned = conversations.slice(0, 10).map(conv => ({
              ...conv,
              messages: conv.messages.slice(-10).map(msg => ({ ...msg, attachments: [] }))
            }));
            localStorage.setItem("conversations", JSON.stringify(ultraCleaned));
          } catch (innerE) {
            console.error("Critical failure saving to localStorage", innerE);
          }
        }
      }
    };

    saveToLocalStorage();
  }, [conversations]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem("activeConversationId", activeId);
    }
  }, [activeId]);

  const createNewChat = useCallback(() => {
    const newId = generateId();
    const newConv: Conversation = {
      id: newId,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newId);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
    }
  }, [activeId]);

  const processFile = async (file: File): Promise<MessageAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isText = file.type.startsWith("text/") || 
                     file.name.endsWith(".ts") || 
                     file.name.endsWith(".tsx") || 
                     file.name.endsWith(".js") || 
                     file.name.endsWith(".json") || 
                     file.name.endsWith(".md");

      reader.onload = () => {
        resolve({
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
          isText
        });
      };
      reader.onerror = reject;
      
      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const sendMessage = async (content: string, mode: ChatMode, settings: AppSettings, attachments?: any[]) => {
    try {
      setIsThinking(true); // Set thinking true early to show UI feedback
      let processedAttachments: MessageAttachment[] | undefined;
      
      if (attachments && attachments.length > 0) {
        processedAttachments = await Promise.all(
          attachments.map(async (a) => {
            try {
              if (!a.file) {
                console.warn("Attachment missing file object", a);
                return null;
              }
              return await processFile(a.file);
            } catch (e) {
              console.error("Failed to process file:", a.file?.name, e);
              return null;
            }
          })
        ).then(results => results.filter((r): r is MessageAttachment => r !== null));
      }

      if (!activeId) {
        const newId = generateId();
        const newConv: Conversation = {
          id: newId,
          title: content.slice(0, 30) + (content.length > 30 ? "..." : "") || "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveId(newId);
        return _sendToApi(newId, content, mode, settings, [], processedAttachments);
      }

      const currentConv = conversations.find(c => c.id === activeId);
      if (!currentConv) return;

      if (currentConv.messages.length === 0) {
        setConversations(prev => prev.map(c => c.id === activeId ? { ...c, title: content.slice(0, 30) + (content.length > 30 ? "..." : "") || "New Chat" } : c));
      }

      await _sendToApi(activeId, content, mode, settings, currentConv.messages, processedAttachments);
    } catch (error: any) {
      console.error("SendMessage error:", error);
      // We don't have a direct way to show a toast here easily without adding more state, 
      // but the _sendToApi has its own error handling which is usually where API calls fail.
      // This catch is for pre-API processing errors (like file reading).
    }
  };

  const _sendToApi = async (convId: string, content: string, mode: ChatMode, settings: AppSettings, history: Message[], attachments?: MessageAttachment[]) => {
    const { systemPrompt, customApiKey, temperature, maxTokens, topP } = settings;
    const userMsgId = generateId();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content,
      timestamp: Date.now(),
      attachments
    };

    const assistantMsgId = generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      mode
    };

    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      
      // Safety: deduplicate by ID just in case
      const existingIds = new Set(c.messages.map(m => m.id));
      if (existingIds.has(userMsgId) || existingIds.has(assistantMsgId)) {
        return c;
      }

      return { 
        ...c, 
        messages: [...c.messages, userMsg, assistantMsg],
        updatedAt: Date.now()
      };
    }));

    setIsThinking(true);
    abortControllerRef.current = new AbortController();

    // Consolidated API implementation (handles fast, deep, and search modes)
    try {
      const messagesForApi = [
        { role: "system", content: systemPrompt || "You are Synapse, a helpful and precise assistant." },
        ...history.map(m => ({ 
          role: m.role, 
          content: m.content, 
          attachments: m.attachments 
        })),
        { role: "user", content, attachments }
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messagesForApi, 
          mode, 
          customKey: customApiKey,
          temperature,
          maxTokens,
          topP,
          systemPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("The Synapse engine encountered an issue connecting to the network. Please check your connection or try again later.");

      setIsThinking(false);
      setIsStreaming(true);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let streamedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") break;

          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.content !== undefined) {
              streamedContent += (data.content || "");
              setConversations(prev => prev.map(c => c.id === convId ? {
                ...c,
                messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: streamedContent } : m)
              } : c));
            }
            if (data.usage) {
              setConversations(prev => prev.map(c => c.id === convId ? {
                ...c,
                messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, usage: data.usage } : m)
              } : c));
            }
          } catch (e) {
            console.warn("Error parsing chunk", e);
            // Non-fatal, just continue
          }
        }
      }

      if (history.length === 0) {
        fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            messages: [
              { role: "user", content },
              { role: "assistant", content: streamedContent }
            ], 
            customKey: customApiKey 
          })
        }).then(res => res.json()).then(data => {
          if (data.title) {
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: data.title } : c));
          }
        }).catch(e => console.error("Title gen error:", e));
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream aborted");
      } else {
        const errorMessage = err.message || "An unexpected error occurred. Please try again.";
        setConversations(prev => prev.map(c => c.id === convId ? {
          ...c,
          messages: c.messages.map(m => m.id === assistantMsgId ? { 
            ...m, 
            content: m.content ? `${m.content}\n\n**[Connection Interrupted]**\n${errorMessage}` : errorMessage, 
            isError: true 
          } : m)
        } : c));
      }
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const regenerate = async (mode: ChatMode, settings: AppSettings) => {
    if (!activeId || isStreaming) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv || conv.messages.length < 2) return;

    const lastUserMsgIndex = [...conv.messages].reverse().findIndex(m => m.role === "user");
    if (lastUserMsgIndex === -1) return;

    const actualIndex = conv.messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = conv.messages[actualIndex];
    const previousHistory = conv.messages.slice(0, actualIndex);

    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: conv.messages.slice(0, actualIndex)
    } : c));

    await _sendToApi(activeId, lastUserMsg.content, mode, settings, previousHistory, lastUserMsg.attachments);
  };

  const editAndResubmit = async (messageId: string, newContent: string, mode: ChatMode, settings: AppSettings) => {
    if (!activeId || isStreaming) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const previousMessages = conv.messages.slice(0, msgIndex);
    
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: previousMessages
    } : c));

    await sendMessage(newContent, mode, settings);
  };

  const togglePin = useCallback((messageId: string) => {
    setConversations(prev => prev.map(conv => {
      const msgExists = conv.messages.some(m => m.id === messageId);
      if (!msgExists) return conv;
      return {
        ...conv,
        messages: conv.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m),
        updatedAt: Date.now()
      };
    }));
  }, []);

  const toggleTask = useCallback((messageId: string, taskIndex: number) => {
    setConversations(prev => prev.map(conv => {
      const msg = conv.messages.find(m => m.id === messageId);
      if (!msg) return conv;

      let count = 0;
      const newContent = msg.content.replace(/(- \[( |x|X)\] )/g, (match) => {
        if (count === taskIndex) {
          count++;
          const isChecked = match.includes('[x]') || match.includes('[X]');
          return isChecked ? '- [ ] ' : '- [x] ';
        }
        count++;
        return match;
      });

      return {
        ...conv,
        messages: conv.messages.map(m => m.id === messageId ? { ...m, content: newContent } : m),
        updatedAt: Date.now()
      };
    }));
  }, []);

  const retryMessage = async (messageId: string, mode: ChatMode, settings: AppSettings) => {
    if (!activeId || isStreaming) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    const messageIndex = conv.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Find the last user message before this error
    let userMsgIndex = -1;
    for (let i = messageIndex; i >= 0; i--) {
      if (conv.messages[i].role === "user") {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex === -1) return;

    const userMsg = conv.messages[userMsgIndex];
    const previousHistory = conv.messages.slice(0, userMsgIndex);

    // Remove the failed assistant response
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: conv.messages.slice(0, userMsgIndex + 1)
    } : c));

    await _sendToApi(activeId, userMsg.content, mode, settings, previousHistory, userMsg.attachments);
  };

  return {
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
  };
}
