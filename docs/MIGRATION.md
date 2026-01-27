# Migration Guide

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
const result = await client.sign(buffer, { data: { signatureType: 'cms' } });
```

### 3) `sign()` no longer accepts URLs

`sign()` only accepts local inputs (file path, Buffer, or Uint8Array). For remote files, fetch first and pass a buffer.
