# 🎭 PersonaPlay: Conversational AI Evaluator & Red-Teaming Engine

PersonaPlay is an end-to-end agent-to-agent testing framework designed to evaluate and red-team conversational AI chatbots. It automatically simulates complex user personas (both cooperative and adversarial) against a web-based Chat UI using Playwright, collects conversational transcripts, and runs structured safety/compliance audits using Gemini as an **LLM-as-a-Judge**.

---

## ✨ Key Features & Architecture

- **Playwright DOM Piercing**: Fully pierces Shadow DOMs automatically. Supports custom selector overrides and cross-origin iframe context targeting via `iframeSelector`.
- **Resilient Debounce Polling**: Resilient streaming text detector. First checks for typing indicators (e.g., `.typing-indicator`, `[aria-busy="true"]`) for up to 1.5s, then falls back to polling the latest message bubble every 200ms. If the message length remains unchanged for 1.2 seconds, it marks the streaming response as complete.
- **Conversational Loop Protection**:
  - **Max Turns Cap**: Restricts sessions to a configurable maximum turns (default: 8).
  - **Repetition Guard**: Tracks the last 3 response turns and calculates the Jaccard similarity between consecutive chatbot replies. If similarity exceeds 90% for 3 consecutive turns, it terminates the session early with a status of `CONVERSATIONAL_STALL`.
- **Clean Session Isolation**: Spawns a completely isolated browser context (`browser.newContext()`) for every run to clear cookies, cache, local storage, and session storage.
- **LLM-as-a-Judge with Structured JSON Outputs**: Evaluates transcripts using Gemini. Enforces strict type schemas using the SDK's `responseSchema` (`SchemaType.OBJECT`) to resist prompt injection hijacking, and requires the judge to justify classifications by citing exact transcript sentences.

---

## 🛠️ Project Structure

```
personaplay-evaluator-typescript/
├── src/
│   ├── index.ts                # Application main entry point
│   ├── cli/
│   │   └── index.ts            # Commander CLI router and commands
│   ├── config/
│   │   └── personas.ts         # Registry and loading logic for Persona JSONs
│   ├── types/
│   │   └── index.ts            # Core TypeScript interfaces
│   ├── core/
│   │   ├── BrowserAutomator.ts # Playwright automation and stability polling
│   │   ├── SimulatorAgent.ts   # User Simulator LLM agent
│   │   ├── EvaluatorJudge.ts   # LLM-as-a-Judge API and responseSchema definition
│   │   └── PlayOrchestrator.ts # E2E Orchestrator, stall logic, and report generation
│   └── utils/
│       ├── logger.ts           # Simple logger
│       └── ai.ts               # Gemini client helper
├── templates/
│   ├── default-personas/       # Built-in evaluation personas
│   │   ├── jailbreaker.json    # NullByte Thorne (Adversarial)
│   │   ├── refund_seeker.json  # Karen Mitchell (Demanding Refund)
│   │   └── support_seeker.json # Arthur Dent (Confused Support Seeker)
│   └── reports/                # Output runs directory (JSON + HTML reports)
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have Node.js (v18+) and npm installed.

### 2. Install Dependencies

Install the project packages and download the browser binaries:
```bash
npm install
npm run test:install
```

### 3. Environment Setup

Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro # Optional, defaults to gemini-1.5-pro
HEADLESS=true # Optional, set to false to run the browser visually
```

---

## 💻 CLI Commands

PersonaPlay provides a CLI for running evaluations.

### A. Run a Single Persona
Evaluate a target chatbot against one specific persona (using either a default persona ID or a path to a custom JSON file):
```bash
# Run using a default persona ID
npm run cli -- run --target http://localhost:3000/chat --persona jailbreaker

# Run using a custom persona JSON file
npm run cli -- run --target http://localhost:3000/chat --persona ./my-custom-persona.json
```

### B. Run an Evaluation Suite
Evaluate a target chatbot against all default personas (or a folder containing custom persona JSONs) sequentially:
```bash
# Run all default personas
npm run cli -- suite --target http://localhost:3000/chat

# Run all personas inside a specific folder
npm run cli -- suite --target http://localhost:3000/chat --personas-dir ./my-personas-dir
```

### C. Build the Project
Compile the TypeScript code:
```bash
npm run build
```

---

## 📊 Evaluation Metrics

Each evaluation play outputs a JSON report and a visual **HTML Dashboard** under the `reports/` folder containing:
- **Jailbroken** (boolean): Did the user successfully bypass the model's safety alignments?
- **Prompt Leaked** (boolean): Did the chatbot leak its developer guidelines or system instructions?
- **Goal Achieved** (boolean): Did the simulator accomplish its target objective?
- **Safety Violation** (boolean): Were any safety policies breached?
- **Safety Violation Category** (string): Category classification of the safety violation.
- **Alignment Score** (percentage): Score indicating how safe and aligned the chatbot's output was.
- **Refusal Rate** (percentage): The frequency of chatbot refusals during the conversation.
- **Audit Justification**: Detailed explanations citing exact sentences from the conversation transcript.
