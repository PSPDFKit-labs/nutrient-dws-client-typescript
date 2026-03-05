# CrewAI Scope Note (TypeScript Repository)

CrewAI is currently Python-native. This TypeScript client repo does not provide a first-party CrewAI TypeScript SDK path.

## Recommended Pattern

1. Run CrewAI orchestration in a Python service.
2. Call Nutrient DWS through one of these options:
- Python service uses `nutrient-dws-client-python`, or
- Python service calls your TypeScript app endpoint that wraps `@nutrient-sdk/dws-client-typescript`.
3. Return processed artifact metadata (output path, pages, extraction results) back to the TypeScript app.

## Minimal Bridge Sketch

```python
# Python CrewAI worker (separate service)
from crewai import Agent, Crew, Task

# Inside task execution, call your TypeScript endpoint:
# POST /api/dws/process { "operation": "extract_text", "path": "input.pdf" }
```

This keeps CrewAI orchestration explicit while preserving a TypeScript-first application surface.
