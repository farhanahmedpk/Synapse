import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Link Preview API
  app.get("/api/link-preview", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const targetUrl = new URL(url);
      
      // Basic SSRF Protection: Ensure protocol is http or https
      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      // Block local/private IP ranges (simple check)
      const hostname = targetUrl.hostname.toLowerCase();
      const blacklisted = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254"];
      if (blacklisted.includes(hostname) || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
        return res.status(400).json({ error: "Access to private network is restricted" });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html"
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      // Defense against large files: check content-length
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 1024 * 1024 * 5) { // 5MB limit
        throw new Error("File too large");
      }

      const html = await response.text();
      // If text() was huge and content-length was missing, truncate it for parsing
      const truncatedHtml = html.slice(0, 500000); // Max 0.5MB for parsing
      
      const $ = cheerio.load(truncatedHtml);

      const metadata = {
        title: $('meta[property="og:title"]').attr("content") || $("title").text() || url,
        description: $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "",
        image: $('meta[property="og:image"]').attr("content") || "",
        siteName: $('meta[property="og:site_name"]').attr("content") || new URL(url).hostname,
        url
      };

      res.json(metadata);
    } catch (error: any) {
      console.error("Link Preview Error:", error.message);
      res.status(500).json({ error: "Failed to fetch link preview" });
    }
  });

  // Initialize Gemini if key is present
  const geminiApiKey = process.env.GEMINI_API_KEY;
  // @ts-ignore - fixing type mismatch in dev environment
  const genAI = geminiApiKey ? new GoogleGenAI(geminiApiKey) : null;

  app.post("/api/status", async (req, res) => {
    const { customKey } = req.body;
    const key = (customKey || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
    const isPresent = !!key && key !== "your_openrouter_api_key_here" && key !== "your_gemini_api_key_here";
    
    let isValid = false;
    let statusMessage = "";

    if (isPresent) {
      try {
        const testRes = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { 
            "Authorization": `Bearer ${key}`,
            "Accept": "application/json"
          }
        });
        isValid = testRes.ok;
        if (!isValid) {
          const errData = await testRes.json().catch(() => ({}));
          statusMessage = errData.error?.message || `OpenRouter returned ${testRes.status}`;
        }
      } catch (e) {
        statusMessage = "Connection error while verifying key.";
      }
    } else {
      statusMessage = "OPENROUTER_API_KEY is not set in environment variables.";
    }

    res.json({ 
      configured: isPresent,
      valid: isValid,
      statusMessage,
      keyLength: key?.length || 0,
      keyPrefix: key && key.length > 10 ? `${key.slice(0, 10)}...` : "unknown"
    });
  });

  // API Route for OpenRouter Chat completions with streaming
  app.post("/api/chat", async (req, res) => {
    const { messages, mode, customKey } = req.body;
    const API_KEY = (customKey || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY)?.trim();

    if (!API_KEY || API_KEY === "your_openrouter_api_key_here") {
      return res.status(500).json({ error: "API Key is not configured. Please set it in your environment." });
    }

    // Diagnostics (internal only)
    if (process.env.NODE_ENV !== "production") {
      console.log(`Using API Key starting with: ${API_KEY.slice(0, 10)}... (Length: ${API_KEY.length})`);
    }

    // Mode-specific parameters
    const isSearch = mode === "search";
    const isDeepThink = mode === "deep";
    const temperature = req.body.temperature ?? (isDeepThink ? 0.6 : 0.2);
    const max_tokens = req.body.maxTokens ?? 4096;
    const top_p = req.body.topP ?? (isDeepThink ? 0.9 : 0.7);

    // Handle Gemini search mode
    if (isSearch) {
      if (!genAI) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      try {
        // @ts-ignore
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          systemInstruction: req.body.systemPrompt || "You are a research assistant with search capabilities. Be precise and ground your answers in the search results provided."
        });

        // Convert messages to Gemini format
        const contents = messages.slice(1).map((m: any) => {
          const parts: any[] = [{ text: m.content || "" }];
          
          if ((m.role === "user" || m.role === "model") && m.attachments && m.attachments.length > 0) {
            m.attachments.forEach((att: any) => {
              if (att.isText) {
                parts[0].text += `\n\n--- Content of ${att.name} ---\n${att.data}\n--- End of ${att.name} ---`;
              } else if (att.data && att.data.includes("base64,")) {
                parts.push({
                  inlineData: {
                    data: att.data.split("base64,")[1],
                    mimeType: att.type
                  }
                });
              }
            });
          }
          
          return {
            role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : m.role,
            parts
          };
        });

        const result = await model.generateContentStream({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: max_tokens,
            topP: top_p,
          },
          tools: [{ googleSearch: {} }]
        } as any);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
          }
        }

        res.write("data: [DONE]\n\n");
        return res.end();
      } catch (err: any) {
        console.error("Gemini Search Error:", err);
        return res.write(`data: ${JSON.stringify({ error: err.message || "Gemini Search failed" })}\n\n`);
      }
    }

    const enrichedMessages = messages.map((m: any) => {
      // Handle User Messages with attachments
      if (m.role === "user" && m.attachments && m.attachments.length > 0) {
        const contentArray: any[] = [{ type: "text", text: m.content }];
        
        m.attachments.forEach((att: any) => {
          if (att.type.startsWith("image/")) {
            contentArray.push({
              type: "image_url",
              image_url: {
                url: att.data // data is already a DataURL (base64)
              }
            });
          } else if (att.isText) {
            // For text files, append content to the message
            contentArray[0].text += `\n\n--- Content of ${att.name} ---\n${att.data}\n--- End of ${att.name} ---`;
          } else {
            // For other files, just append info
            contentArray[0].text += `\n\n[Attached File: ${att.name}]`;
          }
        });

        return { role: "user", content: contentArray };
      }
      
      // Standard messages or assistant messages
      return { role: m.role, content: m.content };
    });

    if (isDeepThink) {
      const systemMessage = enrichedMessages.find(m => m.role === "system");
      if (systemMessage) {
        if (!systemMessage.content.includes("Think step by step.")) {
          systemMessage.content += " Think step by step.";
        }
      } else {
        enrichedMessages.unshift({ role: "system", content: "Think step by step." });
      }
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Authorization": `Bearer ${API_KEY}`,
          "HTTP-Referer": "https://ais-dev.run.app",
          "X-Title": "AI Studio Chatbot",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: enrichedMessages,
          temperature,
          max_tokens,
          top_p,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error?.message || `OpenRouter API error: ${response.status}`;
        
        if (response.status === 401) {
          errorMessage = "Unauthorized (401): The OpenRouter API key is invalid or has expired. Please check your key in the AI Studio Secrets panel.";
        } else if (response.status === 404) {
          errorMessage = "Model not found (404): The requested OpenRouter model is currently unavailable.";
        }
        
        throw new Error(errorMessage);
      }

      // Set headers for SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get reader from response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const json = JSON.parse(dataStr);
              const content = json.choices[0]?.delta?.content || "";
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
              
              // Handle finish reason and usage if present
              if (json.choices[0]?.finish_reason === "stop" && json.usage) {
                res.write(`data: ${JSON.stringify({ usage: json.usage })}\n\n`);
              }
            } catch (e) {
              console.error("Error parsing JSON chunk:", e);
            }
          }
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat API error:", error);
      if (!res.headersSent) {
        res.status(500);
      }
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/generate-title", async (req, res) => {
    const { messages, customKey } = req.body;
    const API_KEY = (customKey || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY)?.trim();

    if (!API_KEY) return res.status(401).json({ error: "No API key" });

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [
            ...messages,
            { role: "user", content: "Summarize this conversation into a short, descriptive 3-5 word title. Return ONLY the title text. Do not use quotes or punctuation." }
          ],
          temperature: 0.1,
          max_tokens: 20
        }),
      });

      const data = await response.json();
      const title = data.choices[0]?.message?.content?.trim() || "New Chat";
      res.json({ title });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate title" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
