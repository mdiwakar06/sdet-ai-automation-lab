# 🚀 TraceRCA: Automated Failure Root-Cause Analysis CLI & CI Reporter
## Finalized Design Plan

This document outlines the finalized implementation blueprint to upgrade the basic `flaky-test-analyzer` into **TraceRCA**—an enterprise-grade automated failure root-cause analysis CLI and Playwright custom reporter. 

This plan incorporates advanced SDET, QA Architect, and Tech Lead perspectives, addressing security, CI performance, LLM costs, prompt injection, and version drift.

---

## ⚡ System Architecture & Workflow

TraceRCA runs in two decoupled phases to prevent blocking the core test execution:
1. **Collector Phase (Playwright Reporter)**: Quickly intercepts failures during execution, extracts metadata and traces, cleans/scrubs data locally, and stores them in a local cache (`.tracerca/runs/`).
2. **Analysis Phase (CLI)**: Processes the cached failures, invokes the Gemini LLM with structured schemas to categorize and analyze failures, and dispatches Slack/GitHub comments.

```mermaid
graph TD
    subgraph Test Execution (Non-Blocking)
        PW[Playwright Test Runner] -->|Failure| Reporter[TraceRCA Custom Reporter]
        Reporter -->|Extract & Sanitize| TraceParser[Trace & Network Parser]
        TraceParser -->|Save raw state| LocalCache[(.tracerca/runs/)]
    end

    subgraph Post-Run Diagnostic Engine
        CLI[TraceRCA CLI: analyze] -->|Read| LocalCache
        CLI -->|Apply Cap & Retry Rules| Orchestrator[Analysis Orchestrator]
        Orchestrator -->|Structured Gemini Call| Gemini[Gemini API responseSchema]
        Gemini -->|JSON Analysis Result| ReportBuilder[Report Builder]
    end

    subgraph Stakeholder Alerting
        ReportBuilder -->|Terminal Output| Console[CLI Console]
        ReportBuilder -->|Static HTML| Dashboard[HTML Dashboard]
        ReportBuilder -->|Webhook Card| Slack[Slack Channel]
        ReportBuilder -->|Inline Comments| GitHub[GitHub PR / Summary]
    end
```

---

## 1. Playwright Trace Parsing & Robust Fallbacks

### A. Programmatic Trace Parsing
We stream and extract files from `trace.zip` without spawning the Playwright GUI viewer.
* **`trace.playwright-trace` (NDJSON)**: We read the event stream to extract the final 10 user action steps (clicks, inputs) leading to failure, console logs (`warning` and `error` events), and application exceptions.
* **`trace.network`**: We extract the HTTP request/response exchange details.
* **Hashed Resources**: If a network call fails ($\ge 400$), we resolve the response body by reading the corresponding hashed resource file inside the trace's `resources/` folder.

### B. Graceful Fallback Mode (Anti-Version Drift)
Because Playwright's trace schema is private and changes between releases:
* **Detection**: The parser checks `@playwright/test` version in `package.json` and logs a compatibility warning if it exceeds tested boundaries.
* **Fallback**: If `trace.zip` is corrupted or parses with schema errors, the parser **automatically falls back** to extracting information from Playwright's stable public Reporter APIs:
  - `result.errors` (stack traces and assertions).
  - `result.stdout` and `result.stderr` (browser console dumps).
  - It constructs a reduced context payload so the LLM analysis still succeeds.

---

## 2. Multi-Tier PII & Data Sanitization Strategy

To ensure data privacy compliance (GDPR/HIPAA), TraceRCA cleanses all telemetry *locally* before any network call to the LLM.

```
[Raw Telemetry JSON] 
       │
       ▼
 1. URL Parameter Stripper (Clears token/session query params)
       │
       ▼
 2. AST-based JSON Scrubber (Traverses headers & bodies, redacting by key name)
       │
       ▼
 3. Regex Scrubber (Masks standard strings: JWTs, Emails, Credit Cards in raw logs)
       │
       ▼
[Sanitized Diagnostic Payload]
```

### A. Configuration (`tracerca.config.json`)
Driven by a customizable config:
* `sensitiveHeaders`: List of HTTP headers to redact (e.g., `authorization`, `cookie`, `x-api-key`).
* `sensitiveKeys`: List of JSON keys to mask recursively (e.g., `password`, `ssn`, `email`, `creditCard`).
* `customRegexPatterns`: Standard rules for unformatted text (JWT tokens, credit cards, emails).

### B. AST-based Scrubber
For structured HTTP payloads, we avoid fragile regex matching. The scrubber parses them as JSON and traverses the tree, matching keys case-insensitively and replacing values with `[REDACTED_BY_TRACERCA]`.

---

## 3. Prompt Engineering & Prompt Injection Protection

To guarantee clean, predictable data returns and prevent prompt injection from application logs, we enforce strict structures.

### A. Strict Schema Enforcement
We use Gemini's native **Structured Outputs (`responseSchema`)** configuration. This forces the model to respond *only* with valid JSON aligning with our target interface, preventing any prompt injection from hijacking the execution or outputting arbitrary text.

### B. Target Output JSON Schema
```json
{
  "type": "OBJECT",
  "properties": {
    "classification": {
      "type": "STRING",
      "enum": ["App Bug", "Test Bug", "Infra Flake"]
    },
    "confidence": {
      "type": "STRING",
      "enum": ["High", "Medium", "Low"]
    },
    "summary": { "type": "STRING" },
    "detailedAnalysis": { "type": "STRING" },
    "recommendedFix": { "type": "STRING" }
  },
  "required": ["classification", "confidence", "summary", "detailedAnalysis", "recommendedFix"]
}
```

### C. System Prompt Blueprint
```
You are TraceRCA, an expert automated QA Failure Investigator.
Analyze the provided diagnostic data from a failed Playwright test run and categorize the failure.

[CLASSIFICATION RULES]
- 'App Bug': Code/API/Interface bug in the app. (e.g., 500 API responses, JS uncaught errors, wrong text).
- 'Test Bug': Flaws/Flakiness in the test code. (e.g., dynamic selectors, visibility timeouts, wrong assertions).
- 'Infra Flake': System/Environment degradation. (e.g., browser crash, socket hangup, 504 Gateway Timeouts).

[INPUT TELEMETRY]
Test: <test_name>
Error: <sanitized_error_stack>
Console Logs: <sanitized_console_logs>
Failed Requests: <sanitized_http_calls>

Strictly adhere to the output JSON schema. Do not include markdown codeblocks or notes.
```

---

## 4. Performance, Cost & Rate Limit Orchestration

To keep CI builds fast and affordable:
* **Triage Capping (`--max-analyses <number>`)**: In the event of a massive system outage where 100+ tests fail, TraceRCA will stop running LLM analyses after **5 failed tests** (configurable) to prevent massive billing spikes and rate limit exhaustions.
* **Retry Exhaustion**: We only run LLM triage on the *final retry failure* of a test, ignoring intermediate failures.
* **Token Pruning**: Console logs are truncated to the last 20 lines, and stack traces/HTTP bodies are capped at 1000 characters.
* **Exponential Backoff**: Built-in HTTP client retries handle temporary rate limiting (429 status codes).

---

## 5. Directory & Code Layout

We will refactor the existing project under [flaky-test-analyzer-typescript](file:///Users/diwakarreddym/MyProjects/sdet-ai-automation-lab/flaky-test-analyzer-typescript):

```
flaky-test-analyzer-typescript/
├── src/
│   ├── index.ts                      # CLI router (analyze, report, notify)
│   ├── types.ts                      # Unified typings for results and AI diagnostics
│   ├── analyzer.ts                   # Retained flakiness score logic
│   ├── parsers/
│   │   ├── index.ts                  # Parser registry
│   │   ├── junit.ts                  # JUnit parser
│   │   ├── playwright-json.ts        # Playwright JSON report parser
│   │   └── trace.ts                  # Playwright trace.zip parser & stable fallback (NEW)
│   ├── sanitization/                 # Security Scrubber (NEW)
│   │   ├── index.ts                  # Scrubber coordinator
│   │   └── scrubber.ts               # AST JSON traverser + regex matcher
│   ├── ai/                           # AI Diagnostic Client (NEW)
│   │   ├── client.ts                 # Gemini API connection (structured outputs schema)
│   │   └── prompt.ts                 # Context stringifier & prompt compiler
│   ├── reporters/
│   │   ├── index.ts                  # Report coordinator
│   │   ├── console.ts                # ANSI terminal formatter
│   │   ├── html.ts                   # HTML dashboard generator
│   │   ├── slack.ts                  # Slack block payload generator
│   │   └── github.ts                 # GitHub PR commentator
│   └── playwright-reporter.ts        # Custom Playwright Reporter entry point (NEW)
├── tracerca.config.json              # Local configuration config (NEW)
├── package.json                      # Dependency manager (cli binary "tracerca")
└── tsconfig.json                     # TS compiler config
```

---

## 🛠️ Phase 1 Implementation Plan

We will start with **Phase 1: CLI Refactoring, Configuration, and the Zip Trace Parser**.
1. Create the `tracerca.config.json` with default sanitization rules.
2. Initialize typescript files for scrubbing (`src/sanitization/scrubber.ts`) and trace parsing (`src/parsers/trace.ts`).
3. Set up parser logic to extract actions, console logs, and network failures, returning a structured `RawDiagnosticContext`.
4. Implement the stable fallback logic in `trace.ts` in case zip unzipping fails.
