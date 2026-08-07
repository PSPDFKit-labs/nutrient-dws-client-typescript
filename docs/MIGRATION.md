# Migration Guide

## 3.0.0

### 1) `getAccountInfo()` deprecated in favor of `getUsage(product)`

DWS meters several independent credit pools (`processor`, `viewer`, `signing_workflow`, `accessibility`, `data_extraction`). The old `/account/info` endpoint returned one flat credit total, which can no longer represent account usage now that products are billed separately. `getAccountInfo()` still works and still returns data, but it's deprecated, warns on every call, and only reflects `processor` credits.

```ts
// v2.x
const info = await client.getAccountInfo();
console.log(info.usage?.totalCredits, info.usage?.usedCredits);

// v3.0.0+
const usage = await client.getUsage('processor');
console.log(usage.subscription?.type, usage.subscription?.status);

for (const counter of usage.usage?.counters ?? []) {
  // `used` and `total` are decimal STRINGS (or `null`), not numbers.
  // Convert explicitly if you need to do arithmetic.
  const used = counter.used === null || counter.used === undefined ? null : Number(counter.used);
  const total =
    counter.total === null || counter.total === undefined ? null : Number(counter.total);
  console.log(counter.code, counter.unit, used, '/', total);
}
```

`getUsage(product)` rejects a product your organization isn't entitled to in one of two ways, and which one you get depends on the product — handle both:

- **`ValidationError`, `statusCode === 404`** — `details.error` is `'product_not_found'` for a real product you aren't entitled to, or `'unknown_product'` for an unrecognized slug. Observed for `signing_workflow`.
- **`AuthenticationError`, `statusCode === 401`** — observed against the live API for `viewer`, `accessibility` and `data_extraction`. This response is byte-identical to the one an invalid API key produces, so a 401 here is *not* evidence that your key is wrong.

```ts
import { ValidationError, AuthenticationError } from '@nutrient-sdk/dws-client-typescript';

try {
  const usage = await client.getUsage('data_extraction');
  // …
} catch (err) {
  if (err instanceof ValidationError && err.statusCode === 404) {
    // definitively not entitled, or the slug is wrong
  } else if (err instanceof AuthenticationError) {
    // either not entitled to this product, or the key is invalid — indistinguishable
  } else {
    throw err;
  }
}
```

### 2) `apiKeys` removed from the account info response

The upstream `/account/info` endpoint no longer returns `apiKeys`. If you read `accountInfo.apiKeys` to enumerate or manage authentication tokens, use `createToken()` / `deleteToken()` instead.

```ts
// v2.x
const info = await client.getAccountInfo();
console.log(info.apiKeys);

// v3.0.0+
const token = await client.createToken({ expirationTime: 3600 });
if (!token.id) {
  throw new Error('Token creation did not return an id');
}
console.log(token.id);

await client.deleteToken(token.id);
```

### 3) `OcrLanguage` no longer accepts 14 full-word values

The upstream spec's `OcrLanguage` enum already carried both full English names and ISO 639-2 codes for the same languages (e.g. both `arabic` and `ara`). The 1.15.1 spec bump removed 13 of those full-name duplicates — leaving only the ISO code — plus a stray, undocumented `sp1` value that never appeared in the API's own language-support table. This affects `client.ocr()` and `BuildActions.ocr()`.

```ts
// v2.x
const result = await client.ocr('scanned-document.pdf', 'arabic');

// v3.0.0+
const result = await client.ocr('scanned-document.pdf', 'ara');
```

Full old → new mapping:

| OLD value | NEW value |
|---|---|
| `afrikaans` | `afr` |
| `albanian` | `sqi` |
| `arabic` | `ara` |
| `armenian` | `hye` |
| `azerbaijani` | `aze` |
| `basque` | `eus` |
| `belarusian` | `bel` |
| `bengali` | `ben` |
| `bosnian` | `bos` |
| `bulgarian` | `bul` |
| `catalan` | `cat` |
| `welsh` | `cym` |
| `chinese` | **UNMAPPED.** No single successor — the spec now requires picking `chi_sim` (Simplified) or `chi_tra` (Traditional), optionally `chi_sim_vert` / `chi_tra_vert` for vertical text. Consult the API docs and pick explicitly; do not guess. |
| `sp1` | **UNMAPPED.** Not a real language — absent from the spec's own language-support table in both the old and new spec. Treat as dead-value cleanup; there is no equivalent. |

All other full-word values (`english`, `german`, `french`, `spanish`, `croatian`, `czech`, `danish`, `dutch`, `finnish`, `indonesian`, `italian`, `malay`, `norwegian`, `polish`, `portuguese`, `serbian`, `slovak`, `slovenian`, `swedish`, `turkish`) are unaffected and continue to work.

### 4) `sign()`: `signatureType` / `cadesLevel` removed, and the client no longer supplies a default

Two changes to `client.sign()`, both from the same upstream `CreateDigitalSignature` schema change:

**a) `signatureType` and `cadesLevel` no longer exist on the type.** Code that sets either field no longer compiles.

```ts
// v2.x
const result = await client.sign('document.pdf', {
  signatureType: 'cades',
  cadesLevel: 'b-lt',
  flatten: false,
});

// v3.0.0+ — the fields simply don't exist; drop them
const result = await client.sign('document.pdf', {
  flatten: false,
});
```

**b) Behavioral, no type error:** calling `sign(pdf)` with *no* `data` argument at all used to send a client-side default of `{ signatureType: 'cades', cadesLevel: 'b-lt' }`. That default is gone — the request now sends an empty `data` object and the server's own documented default applies instead (`flatten: false`, an invisible signature, no CAdES level forced).

```ts
// v2.x — implicitly signed CAdES B-LT
const result = await client.sign('document.pdf');

// v3.0.0+ — the identical call now gets the server's default signature
// instead (flatten: false, invisible, no CAdES level). Nothing throws and
// nothing warns — the output is simply a different kind of signature.
const result = await client.sign('document.pdf');
```

Because `signatureType` and `cadesLevel` no longer exist on the `data` type at all (see 4a), there is no longer a supported way to request CAdES B-LT — or any other specific signature type — through `client.sign()`'s typed `data` parameter. The fields that remain are `flatten`, `formFieldName`, `appearance`, and `position`, none of which control signature type. If your workflow specifically requires CAdES (or another) signature type, consult the current `/sign` API reference for whether and how it's still requestable, and verify your signed output rather than assuming parity with the old default.

## 2.0.0

### 1) URL inputs now use `FileInputWithUrl`

`FileInput` no longer includes URLs. If you need to pass URLs, use `FileInputWithUrl`.

```ts
import type { FileInputWithUrl } from '@nutrient-sdk/dws-client-typescript';

const input: FileInputWithUrl = 'https://example.com/doc.pdf';
const result = await client.convert(input, 'docx');
```

### 2) `processRemoteFileInput` removed

If you previously used `processRemoteFileInput`, fetch the remote file yourself and pass a buffer.

```ts
// v1.x (no longer available)
import { processRemoteFileInput } from '@nutrient-sdk/dws-client-typescript';

// v2.0.0+
const res = await fetch('https://example.com/doc.pdf');
const buffer = Buffer.from(await res.arrayBuffer());
const result = await client.sign(buffer, { flatten: false });
```

### 3) `sign()` no longer accepts URLs

`sign()` only accepts local inputs (file path, Buffer, or Uint8Array). For remote files, fetch first and pass a buffer.
