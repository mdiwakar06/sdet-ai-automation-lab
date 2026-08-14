# SDET AI Automation Lab

A hands-on repository documenting practical SDET AI automation experiments, patterns, and lessons learned through real-world practice.

## Projects

| Project | Language | Description |
|---------|----------|-------------|
| [testdata-generator-python](./testdata-generator-python) | Python | CLI tool for generating realistic test data (users, addresses, payments, etc.) in JSON, CSV, SQL formats |
| [flaky-test-analyzer-typescript](./flaky-test-analyzer-typescript) | TypeScript | Analyze test results across multiple runs to identify flaky tests with flakiness scoring and LLM root cause analysis |
| [personaplay-evaluator-typescript](./personaplay-evaluator-typescript) | TypeScript | E2E agent-to-agent Conversational AI Evaluator & Red-Teaming Engine using Playwright and Gemini as an LLM-as-a-Judge |
| [driftguard-contract-engine-typescript](./driftguard-contract-engine-typescript) | TypeScript | Zero-Config Observation-Driven API Contract Drift Engine & OpenAPI 3.1 Comparator |

## Repository Structure

```
sdet-ai-automation-lab/
├── testdata-generator-python/        # Test data generation tool
├── flaky-test-analyzer-typescript/   # Flaky test detection & TraceRCA tool
├── personaplay-evaluator-typescript/ # Conversational AI Evaluator & Red-Teaming Engine
├── driftguard-contract-engine-typescript/ # Zero-Config API Contract Drift Engine
├── driftguard_plan.md                # Planning document for DriftGuard
├── personaplay_plan.md               # Planning document for PersonaPlay
├── trace_rca_plan.md                 # Planning document for TraceRCA
└── README.md                         # This file
```

## Contributing

This is a learning repository. Feel free to:
- Open issues for bugs or suggestions
- Submit PRs with improvements
- Share your own SDET patterns and experiments

## License

MIT License - feel free to use and modify for your own testing needs.

