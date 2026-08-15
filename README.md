# SDET AI Automation Lab

A hands-on repository documenting practical SDET AI automation experiments, patterns, and lessons learned through real-world practice.

## Projects

| Project | Language | Test Suite Status | Description |
|---------|----------|:-----------------:|-------------|
| [flaky-test-analyzer-typescript](./flaky-test-analyzer-typescript) | TypeScript | [✅ 5/5 Passed (110 assertions)](./flaky-test-analyzer-typescript/TEST_RESULTS.md) | AI-powered Playwright Trace Root Cause Analyzer (TraceRCA) & Historical Flakiness Scorer |
| [personaplay-evaluator-typescript](./personaplay-evaluator-typescript) | TypeScript | [✅ 5/5 Passed (93 assertions)](./personaplay-evaluator-typescript/TEST_RESULTS.md) | E2E Agent-to-Agent Conversational AI Evaluator & Red-Teaming Engine with LLM-as-a-Judge Audits |
| [driftguard-contract-engine-typescript](./driftguard-contract-engine-typescript) | TypeScript | [✅ 5/5 Passed (53 assertions)](./driftguard-contract-engine-typescript/TEST_RESULTS.md) | Zero-Config Observation-Driven API Contract Drift Engine & OpenAPI 3.1 Comparator |
| [synthdb-relational-seeder-typescript](./synthdb-relational-seeder-typescript) | TypeScript | [✅ 5/5 Passed (1,180 assertions)](./synthdb-relational-seeder-typescript/TEST_RESULTS.md) | High-Fidelity Deterministic Relational Synthetic Database Seeder & Topological DAG Generator |
| [testdata-generator-python](./testdata-generator-python) | Python | ✅ Standalone Utility | CLI tool for generating realistic test data (users, addresses, payments, etc.) in JSON, CSV, SQL formats |

## Repository Structure

```
sdet-ai-automation-lab/
├── testdata-generator-python/        # Test data generation tool
├── flaky-test-analyzer-typescript/   # Flaky test detection & TraceRCA tool
├── personaplay-evaluator-typescript/ # Conversational AI Evaluator & Red-Teaming Engine
├── driftguard-contract-engine-typescript/ # Zero-Config API Contract Drift Engine
├── synthdb-relational-seeder-typescript/  # PII-Safe Relational Test Database Seeder
├── synthdb_plan.md                   # Planning document for SynthDB
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

