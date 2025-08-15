# Nutrient DWS TypeScript Client Methods

This document provides detailed information about all the methods available in the Nutrient DWS TypeScript Client.

## Client Methods

### NutrientClient

The main client for interacting with the Nutrient DWS Processor API.

#### Constructor

```typescript
new NutrientClient(options: NutrientClientOptions)
```

Options:
- `apiKey` (required): Your API key string or async function returning a token
- `baseUrl` (optional): Custom API base URL (defaults to `https://api.nutrient.io`)
- `timeout` (optional): Request timeout in milliseconds

#### Account Methods

##### getAccountInfo()
Gets account information for the current API key.

**Returns**: `Promise<AccountInfo>` - Promise resolving to account information

```typescript
const accountInfo = await client.getAccountInfo();

// Access subscription information
console.log(accountInfo.subscriptionType);
```

##### createToken(params)
Creates a new authentication token.

**Parameters**:
- `params: CreateAuthTokenParameters` - Parameters for creating the token

**Returns**: `Promise<CreateAuthTokenResponse>` - Promise resolving to the created token information

```typescript
const token = await client.createToken({
  expirationTime: 3600
});
console.log(token.id);

// Store the token for future use
const tokenId = token.id;
const tokenValue = token.token;
```

##### deleteToken(id)
Deletes an authentication token.

**Parameters**:
- `id: string` - ID of the token to delete

**Returns**: `Promise<void>` - Promise resolving when the token is deleted

```typescript
await client.deleteToken('token-id-123');

// Example in a token management function
async function revokeUserToken(tokenId) {
  try {
    await client.deleteToken(tokenId);
    console.log(`Token ${tokenId} successfully revoked`);
    return true;
  } catch (error) {
    console.error(`Failed to revoke token: ${error.message}`);
    return false;
  }
}
```

#### Document Processing Methods

##### sign(file, data?, options?)
Signs a PDF document.

**Parameters**:
- `file: FileInput` - The PDF file to sign
- `data?: CreateDigitalSignature` - Signature data
- `options?: { image?: FileInput; graphicImage?: FileInput }` - Additional options

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the signed PDF file output

```typescript
const result = await client.sign('document.pdf', {
  signature: {
    signatureType: 'cms',
    flatten: false,
    cadesLevel: 'b-lt',
  }
});

// Access the signed PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('signed-document.pdf', Buffer.from(result.buffer));
```

##### createRedactionsAI(file, criteria, redaction_state?, pages?, options?)
Uses AI to redact sensitive information in a document.

**Parameters**:
- `file: FileInput` - The PDF file to redact
- `criteria: string` - AI redaction criteria
- `redaction_state?: 'stage' | 'apply'` - Whether to stage or apply redactions (default: 'stage')
- `pages?: { start?: number; end?: number }` - Optional pages to redact
- `options?: RedactDataOptions` - Optional redaction options

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the redacted document

```typescript
// Stage redactions
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all emails'
);

// Apply redactions immediately
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all PII',
  'apply'
);

// Redact only specific pages
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all emails',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// Redact only the last 3 pages
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all PII',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);

// Access the redacted PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('redacted-document.pdf', Buffer.from(result.buffer));
```

##### ocr(file, language)
Performs OCR (Optical Character Recognition) on a document.

**Parameters**:
- `file: FileInput` - The input file to perform OCR on
- `language: OcrLanguage | OcrLanguage[]` - The language(s) to use for OCR

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the OCR result

```typescript
const result = await client.ocr('scanned-document.pdf', 'english');

// Access the OCR-processed PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('ocr-document.pdf', Buffer.from(result.buffer));
```

##### watermarkText(file, text, options?)
Adds a text watermark to a document.

**Parameters**:
- `file: FileInput` - The input file to watermark
- `text: string` - The watermark text
- `options?: TextWatermarkOptions` - Watermark options

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the watermarked document

```typescript
const result = await client.watermarkText('document.pdf', 'CONFIDENTIAL', {
  opacity: 0.5,
  fontSize: 24
});

// Access the watermarked PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('watermarked-document.pdf', Buffer.from(result.buffer));
```

##### watermarkImage(file, image, options?)
Adds an image watermark to a document.

**Parameters**:
- `file: FileInput` - The input file to watermark
- `image: FileInput` - The watermark image
- `options?: ImageWatermarkOptions` - Watermark options

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the watermarked document

```typescript
const result = await client.watermarkImage('document.pdf', 'watermark.jpg', {
  opacity: 0.5,
  width: { value: 50, unit: "%"},
  height: { value: 50, unit: "%"}
});

// Access the watermarked PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('image-watermarked-document.pdf', Buffer.from(result.buffer));
```

##### convert(file, targetFormat)
Converts a document to a different format.

**Parameters**:
- `file: FileInput` - The input file to convert
- `targetFormat: string` - The target format to convert to

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the specific output type based on the target format

```typescript
// Convert DOCX to PDF
const pdfResult = await client.convert('document.docx', 'pdf');
// Supports formats: pdf, pdfa, pdfua, docx, xlsx, pptx, png, jpeg, jpg, webp, html, markdown

// Access the PDF buffer
const pdfBuffer = pdfResult.buffer;
console.log(pdfResult.mimeType); // 'application/pdf'

// Save the PDF (Node.js example)
const fs = require('fs');
fs.writeFileSync('converted-document.pdf', Buffer.from(pdfResult.buffer));

// Convert PDF to image
const imageResult = await client.convert('document.pdf', 'png');

// Access the PNG buffer
const pngBuffer = imageResult.buffer;
console.log(imageResult.mimeType); // 'image/png'

// Save the image (Node.js example)
fs.writeFileSync('document-page.png', Buffer.from(imageResult.buffer));
```

##### merge(files)
Merges multiple documents into one.

**Parameters**:
- `files: FileInput[]` - The files to merge

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the merged document

```typescript
const result = await client.merge([
  'doc1.pdf',
  'doc2.pdf',
  'doc3.pdf'
]);

// Access the merged PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('merged-document.pdf', Buffer.from(result.buffer));
```

##### extractText(file, pages?)
Extracts text content from a document.

**Parameters**:
- `file: FileInput` - The file to extract text from
- `pages?: { start?: number; end?: number }` - Optional page range to extract text from

**Returns**: `Promise<OutputTypeMap['json-content']>` - Promise resolving to the extracted text data

```typescript
const result = await client.extractText('document.pdf');

// Extract text from specific pages
const result = await client.extractText('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract text from the last page
const result = await client.extractText('document.pdf', { end: -1 }); // Last page

// Extract text from the second-to-last page to the end
const result = await client.extractText('document.pdf', { start: -2 }); // Second-to-last and last page

// Access the extracted text content
const textContent = result.data.pages[0].plainText;

// Process the extracted text
const wordCount = textContent.split(/\s+/).length;
console.log(`Document contains ${wordCount} words`);

// Search for specific content
if (textContent.includes('confidential')) {
  console.log('Document contains confidential information');
}
```

##### extractTable(file, pages?)
Extracts table content from a document.

**Parameters**:
- `file: FileInput` - The file to extract tables from
- `pages?: { start?: number; end?: number }` - Optional page range to extract tables from

**Returns**: `Promise<OutputTypeMap['json-content']>` - Promise resolving to the extracted table data

```typescript
const result = await client.extractTable('document.pdf');

// Extract tables from specific pages
const result = await client.extractTable('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract tables from the last page
const result = await client.extractTable('document.pdf', { end: -1 }); // Last page

// Extract tables from the second-to-last page to the end
const result = await client.extractTable('document.pdf', { start: -2 }); // Second-to-last and last page

// Access the extracted tables
const tables = result.data.pages[0].tables;

// Process the first table if available
if (tables && tables.length > 0) {
  const firstTable = tables[0];

  // Get table dimensions
  console.log(`Table has ${firstTable.rows.length} rows and ${firstTable.columns.length} columns`);

  // Access table cells
  for (let i = 0; i < firstTable.rows.length; i++) {
    for (let j = 0; j < firstTable.columns.length; j++) {
      const cell = firstTable.cells.find(cell => cell.rowIndex === i && cell.columnIndex === j);
      const cellContent = cell?.text || '';
      console.log(`Cell [${i}][${j}]: ${cellContent}`);
    }
  }

  // Convert table to CSV
  let csv = '';
  for (let i = 0; i < firstTable.rows.length; i++) {
    const rowData = [];
    for (let j = 0; j < firstTable.columns.length; j++) {
      const cell = firstTable.cells.find(cell => cell.rowIndex === i && cell.columnIndex === j);
      rowData.push(cell?.text || '');
    }
    csv += rowData.join(',') + '\n';
  }
  console.log(csv);
}
```

##### extractKeyValuePairs(file, pages?)
Extracts key value pair content from a document.

**Parameters**:
- `file: FileInput` - The file to extract KVPs from
- `pages?: { start?: number; end?: number }` - Optional page range to extract KVPs from

**Returns**: `Promise<OutputTypeMap['json-content']>` - Promise resolving to the extracted KVPs data

```typescript
const result = await client.extractKeyValuePairs('document.pdf');

// Extract KVPs from specific pages
const result = await client.extractKeyValuePairs('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract KVPs from the last page
const result = await client.extractKeyValuePairs('document.pdf', { end: -1 }); // Last page

// Extract KVPs from the second-to-last page to the end
const result = await client.extractKeyValuePairs('document.pdf', { start: -2 }); // Second-to-last and last page

// Access the extracted key-value pairs
const kvps = result.data.pages[0].keyValuePairs;

// Process the key-value pairs
if (kvps && kvps.length > 0) {
  // Iterate through all key-value pairs
  kvps.forEach((kvp, index) => {
    console.log(`KVP ${index + 1}:`);
    console.log(`  Key: ${kvp.key}`);
    console.log(`  Value: ${kvp.value}`);
    console.log(`  Confidence: ${kvp.confidence}`);
  });

  // Create a dictionary from the key-value pairs
  const dictionary = {};
  kvps.forEach(kvp => {
    dictionary[kvp.key] = kvp.value;
  });

  // Look up specific values
  console.log(`Invoice Number: ${dictionary['Invoice Number']}`);
  console.log(`Date: ${dictionary['Date']}`);
  console.log(`Total Amount: ${dictionary['Total']}`);
}
```

##### flatten(file, annotationIds?)
Flattens annotations in a PDF document.

```typescript
const result = await client.flatten('annotated-document.pdf');
```

##### rotate(file, angle, pages?)
Rotates pages in a document.

```typescript
const result = await client.rotate('document.pdf', 90);

// Rotate specific pages:
const result = await client.rotate('document.pdf', 90, { start: 1, end: 3 }); // Pages 1, 2, 3

// Rotate the last page:
const result = await client.rotate('document.pdf', 90, { end: -1 }); // Last page

// Rotate from page 2 to the second-to-last page:
const result = await client.rotate('document.pdf', 90, { start: 2, end: -2 });
```

##### passwordProtect(file, userPassword, ownerPassword, permissions?)
Password protects a PDF document.

**Parameters**:
- `file: FileInput` - The file to protect
- `userPassword: string` - Password required to open the document
- `ownerPassword: string` - Password required to modify the document
- `permissions?: PDFUserPermission[]` - Optional array of permissions granted when opened with user password

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the password-protected document

```typescript
const result = await client.passwordProtect('document.pdf', 'user123', 'owner456');

// Or with specific permissions:
const result = await client.passwordProtect('document.pdf', 'user123', 'owner456',
  ['printing', 'extract_accessibility']);

// Access the password-protected PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('protected-document.pdf', Buffer.from(result.buffer));
```

##### setMetadata(file, metadata)
Sets metadata for a PDF document.

```typescript
const result = await client.setMetadata('document.pdf', {
  title: 'My Document',
  author: 'John Doe'
});
```

##### setPageLabels(file, labels)
Sets page labels for a PDF document.

```typescript
const result = await client.setPageLabels('document.pdf', [
  { pages: [0, 1, 2], label: 'Cover' },
  { pages: [3, 4, 5], label: 'Chapter 1' }
]);
```

##### applyInstantJson(file, instantJsonFile)
Applies Instant JSON to a document.

```typescript
const result = await client.applyInstantJson('document.pdf', 'annotations.json');
```

##### applyXfdf(file, xfdfFile, options?)
Applies XFDF to a document.

```typescript
const result = await client.applyXfdf('document.pdf', 'annotations.xfdf');
```

##### createRedactionsPreset(file, preset, redaction_state?, pages?, presetOptions?, options?)
Creates redaction annotations based on a preset pattern.

```typescript
const result = await client.createRedactionsPreset('document.pdf', 'email-address');

// With specific pages
const result = await client.createRedactionsPreset(
  'document.pdf',
  'email-address',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// With the last 3 pages
const result = await client.createRedactionsPreset(
  'document.pdf',
  'email-address',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### createRedactionsRegex(file, regex, redaction_state?, pages?, regexOptions?, options?)
Creates redaction annotations based on a regular expression.

```typescript
const result = await client.createRedactionsRegex('document.pdf', 'Account:\\s*\\d{8,12}');

// With specific pages
const result = await client.createRedactionsRegex(
  'document.pdf',
  'Account:\\s*\\d{8,12}',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// With the last 3 pages
const result = await client.createRedactionsRegex(
  'document.pdf',
  'Account:\\s*\\d{8,12}',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### createRedactionsText(file, text, redaction_state?, pages?, textOptions?, options?)
Creates redaction annotations based on text.

```typescript
const result = await client.createRedactionsText('document.pdf', 'email@example.com');

// With specific pages and options
const result = await client.createRedactionsText(
  'document.pdf',
  'email@example.com',
  'stage',
  { start: 0, end: 4 },  // Pages 0, 1, 2, 3, 4
  { caseSensitive: false, includeAnnotations: true }
);

// Create redactions on the last 3 pages
const result = await client.createRedactionsText(
  'document.pdf',
  'email@example.com',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### applyRedactions(file)
Applies redaction annotations in a document.

```typescript
const result = await client.applyRedactions('document-with-redactions.pdf');
```

##### addPage(file, count?, index?)
Adds blank pages to a document.

```typescript
// Add 2 blank pages at the end
const result = await client.addPage('document.pdf', 2);

// Add 1 blank page after the first page (at index 1)
const result = await client.addPage('document.pdf', 1, 1);
```

##### optimize(file, options?)
Optimizes a PDF document for size reduction.

```typescript
const result = await client.optimize('large-document.pdf', {
  grayscaleImages: true,
  mrcCompression: true,
  imageOptimizationQuality: 2
});
```

##### split(file, pageRanges)
Splits a PDF document into multiple parts based on page ranges.

**Parameters**:
- `file: FileInput` - The PDF file to split
- `pageRanges: { start?: number; end?: number }[]` - Array of page ranges to extract

**Returns**: `Promise<WorkflowOutput[]>` - Promise resolving to an array of PDF documents, one for each page range

```typescript
const results = await client.split('document.pdf', [
  { start: 0, end: 2 },  // Pages 0, 1, 2
  { start: 3, end: 5 }   // Pages 3, 4, 5
]);

// Split using negative indices
const results = await client.split('document.pdf', [
  { start: 0, end: 2 },     // First three pages
  { start: 3, end: -3 },    // Middle pages
  { start: -2, end: -1 }    // Last two pages
]);

// Process each resulting PDF
for (const result of results) {
  // Access the PDF buffer
  const pdfBuffer = result.buffer;

  // Get the MIME type of the output
  console.log(result.mimeType); // 'application/pdf'

  // Save the buffer to a file (Node.js example)
  const fs = require('fs');
  fs.writeFileSync(`split-part-${i}.pdf`, Buffer.from(result.buffer));
}
```

##### duplicatePages(file, pageIndices)
Creates a new PDF containing only the specified pages in the order provided.

**Parameters**:
- `file: FileInput` - The PDF file to extract pages from
- `pageIndices: number[]` - Array of page indices to include in the new PDF (0-based)

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to a new document with only the specified pages

```typescript
// Create a new PDF with only the first and third pages
const result = await client.duplicatePages('document.pdf', [0, 2]);

// Create a new PDF with pages in a different order
const result = await client.duplicatePages('document.pdf', [2, 0, 1]);

// Create a new PDF with duplicated pages
const result = await client.duplicatePages('document.pdf', [0, 0, 1, 1, 0]);

// Create a new PDF with the first and last pages
const result = await client.duplicatePages('document.pdf', [0, -1]);

// Create a new PDF with the last three pages in reverse order
const result = await client.duplicatePages('document.pdf', [-1, -2, -3]);

// Access the PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('duplicated-pages.pdf', Buffer.from(result.buffer));
```

##### deletePages(file, pageIndices)
Deletes pages from a PDF document.

**Parameters**:
- `file: FileInput` - The PDF file to modify
- `pageIndices: number[]` - Array of page indices to delete (0-based)

**Returns**: `Promise<WorkflowOutput>` - Promise resolving to the document with deleted pages

```typescript
// Delete second and fourth pages
const result = await client.deletePages('document.pdf', [1, 3]);

// Delete the last page
const result = await client.deletePages('document.pdf', [-1]);

// Delete the first and last two pages
const result = await client.deletePages('document.pdf', [0, -1, -2]);

// Access the modified PDF buffer
const pdfBuffer = result.buffer;

// Get the MIME type of the output
console.log(result.mimeType); // 'application/pdf'

// Save the buffer to a file (Node.js example)
const fs = require('fs');
fs.writeFileSync('modified-document.pdf', Buffer.from(result.buffer));
```
