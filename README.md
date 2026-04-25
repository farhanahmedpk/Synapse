# Synapse 🧠

Synapse is a premium, high-performance AI chat interface designed for power users who demand speed, depth, and real-time information. Inspired by state-of-the-art AI assistants, Synapse provides a seamless, multimodal experience with integrated web search and deep reasoning capabilities.

![Synapse Preview](https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200)

## 🚀 Core Capabilities

### ⚡ Three Specialized Modes
- **Fast Mode**: Lightning-quick responses for standard tasks and creative writing.
- **Thinking Mode**: Deep reasoning capabilities for complex problem-solving and architectural design.
- **Web Search**: Real-time internet access powered by Gemini, providing up-to-date information and source citations.

### 🎙️ Immersive Interactions
- **Real-time Voice Input**: High-fidelity speech-to-text that updates the chat as you speak.
- **Proactive Thinking States**: Custom "Thinking" and "Synthesizing" indicators that show the AI's cognitive process.
- **Multimodal Attachments**: Drag-and-drop support for images and documents with integrated context analysis.

### 💎 Premium UX Features
- **Smart Link Previews**: Automatic link expansion with metadata and favicons.
- **Advanced Code Rendering**: Syntax highlighting for 50+ languages with copy-to-clipboard functionality.
- **Scientific Notation**: Full LaTeX support via KaTeX for mathematical and technical discussions.
- **Interactive Task Lists**: Check off items directly within markdown-rendered messages.
- **Persistence & Privacy**: LocalStorage-based history with intelligent cleanup to keep your chats fast and private.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Animations**: Framer Motion (via `motion/react`)
- **Backend**: Express.js (Node runtime)
- **AI Orchestration**: OpenRouter (LLM Access), Google Gemini (Search Grounding)
- **Styling**: Modern, responsive design with CSS Variables and Tailwind 4.0 paradigms.

## 🛡️ Security & Architecture

Synapse is built with a "Security-First" approach:
- **SSRF Protection**: Server-side proxying blocks access to internal network ranges and suspicious IP addresses.
- **Resource Guarding**: Built-in limits for file uploads (15MB) and parsing to prevent Denial-of-Wallet attacks.
- **API Integrity**: Encrypted-at-rest pattern for custom API keys and server-side validation of identity roles.

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/synapse.git
   cd synapse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root:
   ```env
   OPENROUTER_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📜 License
Apache-2.0
