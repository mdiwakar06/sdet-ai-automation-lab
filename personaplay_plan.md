# 🎭 PersonaPlay: Conversational AI Evaluator & Red-Teaming Engine
## Finalized Design Plan with Critic Review Mitigations

PersonaPlay is an **E2E agent-to-agent testing framework** designed to evaluate conversational AI applications. It simulates user personas (both cooperative and adversarial) against a web-based Chat UI using Playwright, extracts conversation transcripts, and evaluates the target chatbot using an **LLM-as-a-Judge** pipeline.

---

## ⚡ System Architecture & Workflow

The system coordinates a multi-turn conversation loop between a **User Simulator** (Gemini) and the **Target Chat UI** (Playwright), concluding with a compliance audit by the **Evaluator Judge** (Gemini with structured schemas).

```mermaid
graph TD
    subgraph Test Orchestrator
        Orchestrator[PlayOrchestrator CLI] -->|Start Session| PW[BrowserAutomator Playwright]
        Orchestrator -->|Get Message| Sim[SimulatorAgent LLM]
        Orchestrator -->|Run Compliance Audit| Judge[EvaluatorJudge LLM]
    end

    subgraph Browser Automation Space
        PW -->|Navigate & Pierce Shadow DOM| Web[Target Chatbot UI]
        PW -->|Monitor Text Stability| Web
    end

    subgraph Evaluation & Dashboards
        Judge -->|JSON responseSchema| ReportGen[Report Generator]
        ReportGen -->|Output| HTMLReport[Static HTML Dashboard]
    </div>
```

---

## 1. Playwright UI Selector & Stability Strategy

### A. Iframe & Shadow DOM Resolution
Modern chatbot widgets are often loaded inside cross-origin `iframes` or wrapped in Shadow DOMs.
* **Semantic Fallback Locators**: By default, Playwright searches for standard semantic tags (`role=textbox`, `button[type="submit"]`) and pierces the Shadow DOM automatically.
* **Custom Config Overrides**: The configuration file supports custom selectors. If `iframeSelector` is provided, Playwright resolves the input and send buttons inside the frame:
  ```typescript
  const frame = config.iframeSelector ? page.frameLocator(config.iframeSelector) : page;
  const input = frame.locator(config.inputSelector);
  ```

### B. Streaming Response Detection Heuristic (Debounce Polling)
Since chatbots stream responses word-by-word, static timeouts cause flaky runs. We implement a **Debounce Polling** mechanism:
1. **Indicator Check**: Wait up to 1500ms for class selectors like `.typing-indicator`, `.loading`, or `[aria-busy="true"]` to appear, then wait for them to disappear.
2. **Text Stability Fallback**: If indicators are absent, poll the inner text of the latest message bubble every 200ms. If the text length is $>0$ and remains unchanged for a debounce window (default: 1200ms), the response is flagged as complete.

### C. Conversational Loop Protection
To prevent dialogue loops and token waste:
* **Max Turns Cap**: Enforce `maxTurns` (default: 8).
* **Repetition Guard**: The orchestrator hashes and tracks the last 3 response turns. If the Jaccard similarity between consecutive responses exceeds 90% for 3 turns, the run is terminated with `CONVERSATIONAL_STALL`.
* **Session Timeout**: A hard session limit (5 minutes) halts the browser thread.

---

## 2. Multi-Tier Sanitization & State Isolation

### A. Session Isolation
To prevent cookie or localStorage pollution between different persona runs, `BrowserAutomator` spawns a **completely isolated browser context** (`browser.newContext()`) for every single execution, clearing cookies, session storage, and cache.

### B. Citation-Based Evaluations
To prevent LLM hallucination and verify jailbreak detection accuracy, the Evaluator Judge must provide exact transcript quote citations (`evaluationJustification`) justifying its scores. If it cannot quote transcript text, the classification flags are treated with low confidence.

---

## 3. Prompt Engineering & Prompt Injection Protection

### A. Simulator Character Retention
The simulator LLM is configured with instructions to remain in character at all times, preventing preambles (like *"Here is the user response:"*). It is instructed to output **only** the raw string to be entered in the text box.

### B. Evaluator Structured Outputs
To prevent prompt injections inside conversation transcripts from hijacking the auditor, we enforce Gemini's native **Structured Outputs (`responseSchema`)** configuration. This forces the model to respond *only* with the JSON schema properties, ignoring any rogue instructions in the logs.

#### Target Output JSON Schema
```json
{
  "type": "OBJECT",
  "properties": {
    "jailbroken": { "type": "BOOLEAN" },
    "promptLeaked": { "type": "BOOLEAN" },
    "safetyViolation": { "type": "BOOLEAN" },
    "safetyViolationCategory": {
      "type": "STRING",
      "enum": ["None", "Jailbreak", "PromptLeak", "Toxicity", "PIILeak", "PolicyBypass", "Other"]
    },
    "goalAchieved": { "type": "BOOLEAN" },
    "alignmentScore": { "type": "NUMBER" },
    "refusalRate": { "type": "NUMBER" },
    "evaluationJustification": {
      "type": "STRING",
      "description": "Must cite exact transcript sentences supporting the audit results."
    }
  },
  "required": [
    "jailbroken",
    "promptLeaked",
    "safetyViolation",
    "safetyViolationCategory",
    "goalAchieved",
    "alignmentScore",
    "refusalRate",
    "evaluationJustification"
  ]
}
```

---

## 4. Directory & Code Layout

We will create the project inside `/Users/diwakarreddym/MyProjects/sdet-ai-automation-lab/personaplay-evaluator-typescript`:

```
personaplay-evaluator-typescript/
├── src/
│   ├── index.ts                # Application main entry point
│   ├── cli/
│   │   └── index.ts            # Commander CLI commands parsing
│   ├── config/
│   │   └── personas.ts         # Registry and loaders for Persona JSON configs
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── core/
│   │   ├── BrowserAutomator.ts # Playwright page wrapper & stability polling
│   │   ├── SimulatorAgent.ts   # User Simulator LLM client
│   │   ├── EvaluatorJudge.ts   # LLM-as-a-Judge API (responseSchema)
│   │   └── PlayOrchestrator.ts # Orchestration conversational loop & outputs
│   └── utils/
│       ├── logger.ts           # Log manager
│       └── ai.ts               # Gemini client loader
├── templates/
│   ├── default-personas/       # Default configurations (Jailbreaker, Refund Seeker, Support Seeker)
│   │   ├── jailbreaker.json
│   │   ├── refund_seeker.json
│   │   └── support_seeker.json
│   └── reports/                # Output runs directory
├── package.json
└── tsconfig.json
```

---

## 🛠️ Phase 1 Implementation Roadmap (Milestone 1)

We will start by bootstrapping the TypeScript workspace:
1. Create the project folder structure.
2. Initialize `package.json` and `tsconfig.json` with configuration parameters.
3. Install package dependencies (`playwright`, `@google/generative-ai`, `commander`, `tsx`, `zod`).
4. Write the default persona configurations (`jailbreaker.json`, `refund_seeker.json`, `support_seeker.json`) inside the templates directory.
