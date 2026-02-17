# Custom Pipeline Guidelines

## When to Build a New Script

Build a custom script when the user needs:
- Multiple actions in one run (for example OCR + redact + watermark + optimize)
- Conditional logic around extraction results
- Organization-specific defaults or output layout

## Preferred Construction Order

1. Validate CLI inputs and parse options.
2. Create client with `NUTRIENT_API_KEY`.
3. Build workflow using either:
   - Direct methods for single operation
   - `client.workflow()` for multi-step actions
4. Execute and write outputs to deterministic paths.
5. Print file outputs and exit non-zero on failures.

## Script Quality Requirements

- Keep scripts non-interactive.
- Accept all runtime values by args/env vars.
- Avoid hard-coded secrets and absolute local paths.
- Emit structured output files (PDF/JSON/TXT) instead of console-only output.
