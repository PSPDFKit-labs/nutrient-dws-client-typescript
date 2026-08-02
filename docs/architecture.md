# Architecture

Orientation for anyone — human or agent — finding their way around `src/`.

## Layout

| Path | What lives there |
| --- | --- |
| `src/client.ts` | `NutrientClient`, the public entry point. Every client method is on this one class. |
| `src/http.ts` | `sendRequest()` — the **only** HTTP entry point in the library. |
| `src/types/http.ts` | `RequestTypeMap` / `ResponseTypeMap`, plus hand-written types. |
| `src/generated/` | Generated only — see [generated-types.md](generated-types.md). |
| `src/builders/`, `src/workflow.ts`, `src/build.ts` | The fluent workflow builder API. |
| `src/inputs.ts` | File and URL input normalization. |
| `src/errors.ts` | The `NutrientError` hierarchy. |
| `src/index.ts` | The curated public export surface. |

## How a request is made

Every operation routes through `sendRequest()` in `src/http.ts`. Most client methods reach it
indirectly by composing a `/build` call through the workflow builder; a handful — account,
tokens, `sign`, AI redaction, and extraction — call it directly.

`sendRequest` is generic over an HTTP method and an endpoint key, and looks both types up in the
maps in `src/types/http.ts`. **The endpoint key is the literal URL path**: the URL is built as

```ts
`${baseUrl.replace(/\/$/, '')}${endpoint}`
```

so a trailing slash on `baseUrl` is stripped and the endpoint is appended verbatim. There is no
path-parameter substitution layer. An endpoint with a path parameter is expressed as a
template-literal union of the concrete paths — see `AccountUsageEndpoint` in `src/types/http.ts`,
which expands to the five `/account/{product}/usage` paths and keeps the map keys literal.

Adding an endpoint therefore means adding its key to both maps in `src/types/http.ts`. Nothing
in `src/http.ts` needs to change.

## The export surface is curated

`src/index.ts` re-exports a hand-maintained list. `src/types/index.ts` does `export *`, but that
is not the public API — a type absent from the list in `src/index.ts` is not reachable by
consumers, even if it is the declared parameter type of a public method.

When you add a public method, check that every type in its signature is exported. Verify against
the built declarations rather than the source:

```bash
npm run build && grep 'YourType' dist/index.d.ts
```

## Errors

`sendRequest` never returns a non-2xx response; `createHttpError` converts by status —
401/403 to `AuthenticationError`, other 4xx to `ValidationError`, 5xx to `APIError` — and
network and setup failures become `NetworkError`. All carry `statusCode` and a `details` object
holding the parsed error body. The `Authorization` header is stripped before any header set is
attached to an error.
