export type Role = "user" | "assistant" | "system";

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 or text content
  isText?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  mode?: "fast" | "deep" | "search";
  attachments?: Attachment[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  isError?: boolean;
  isPinned?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type ChatMode = "fast" | "deep" | "search";

export interface AppSettings {
  defaultMode: ChatMode;
  systemPrompt: string;
  theme: "dark" | "light";
  apiKeyConfigured: boolean;
  apiKeyValid?: boolean;
  apiStatusMessage?: string;
  apiKeyPrefix?: string;
  customApiKey?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}
