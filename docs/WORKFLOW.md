# Nutrient DWS TypeScript Client Workflow

This document provides detailed information about the workflow system in the Nutrient DWS TypeScript Client.

## Workflow Architecture

The Nutrient DWS TypeScript Client uses a fluent builder pattern with staged interfaces to create document processing workflows. This architecture provides several benefits:

1. **Type Safety**: The staged interface ensures that methods are only available at appropriate stages
2. **Readability**: Method chaining creates readable, declarative code
3. **Discoverability**: IDE auto-completion guides you through the workflow stages
4. **Flexibility**: Complex workflows can be built with simple, composable pieces

## Workflow Stages

The workflow builder follows a staged approach:

### Stage 0: Create Workflow

You have several ways of creating a workflow

```typescript
// Creating Workflow from a client
const workflow = client.workflow()

// Override the client timeout
const workflow = client.workflow(60000)

// Create a workflow without a client
const workflow = new StagedWorkflowBuilder({
  apiKey: "your-api-key",
})
```

### Stage 1: Add Parts

In this stage, you add document parts to the workflow:

```typescript
const workflow = client.workflow()
  .addFilePart('document.pdf')
  .addFilePart('appendix.pdf');
```

Available methods:

#### `addFilePart(file, options?, actions?)`
Adds a file part to the workflow.

**Parameters:**
- `file: FileInput` - The file to add to the workflow. Can be a local file path, Buffer, or URL.
- `options?: object` - Additional options for the file part.
- `actions?: BuildAction[]` - Actions to apply to the file part.

**Returns:** `WorkflowWithPartsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Add a PDF file from a local path
workflow.addFilePart('/path/to/document.pdf');

// Add a file with options and actions
workflow.addFilePart(
  '/path/to/document.pdf',
  { pages: { start: 1, end: 3 } },
  [BuildActions.watermarkText('CONFIDENTIAL')]
);
```

#### `addHtmlPart(html, assets?, options?, actions?)`
Adds an HTML part to the workflow.

**Parameters:**
- `html: FileInput` - The HTML content to add. Can be a file path, Buffer, or URL.
- `assets?: FileInput[]` - Optional array of assets (CSS, images, etc.) to include with the HTML. Only local files or Buffers are supported (not URLs).
- `options?: object` - Additional options for the HTML part.
- `actions?: BuildAction[]` - Actions to apply to the HTML part.

**Returns:** `WorkflowWithPartsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Add HTML content from a file
workflow.addHtmlPart('/path/to/content.html');

// Add HTML with assets and options
workflow.addHtmlPart(
  '/path/to/content.html',
  ['/path/to/style.css', '/path/to/image.png'],
  { layout: { size: 'A4' } }
);
```

#### `addNewPage(options?, actions?)`
Adds a new blank page to the workflow.

**Parameters:**
- `options?: object` - Additional options for the new page, such as page size, orientation, etc.
- `actions?: BuildAction[]` - Actions to apply to the new page.

**Returns:** `WorkflowWithPartsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Add a simple blank page
workflow.addNewPage();

// Add a new page with specific options
workflow.addNewPage(
  { layout: { size: 'A4', orientation: 'portrait' } }
);
```

#### `addDocumentPart(documentId, options?, actions?)`
Adds a document part to the workflow by referencing an existing document by ID.

**Parameters:**
- `documentId: string` - The ID of the document to add to the workflow.
- `options?: object` - Additional options for the document part.
  - `options.layer?: string` - Optional layer name to select a specific layer from the document.
- `actions?: BuildAction[]` - Actions to apply to the document part.

**Returns:** `WorkflowWithPartsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Add a document by ID
workflow.addDocumentPart('doc_12345abcde');

// Add a document with a specific layer and options
workflow.addDocumentPart(
  'doc_12345abcde',
  {
    layer: 'content',
    pages: { start: 0, end: 3 }
  }
);
```

### Stage 2: Apply Actions (Optional)

In this stage, you can apply actions to the document:

```typescript
workflow.applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
  opacity: 0.5,
  fontSize: 48
}));
```

Available methods:

#### `applyAction(action)`
Applies a single action to the workflow.

**Parameters:**
- `action: BuildAction` - The action to apply to the workflow.

**Returns:** `WorkflowWithActionsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Apply a watermark action
workflow.applyAction(
  BuildActions.watermarkText('CONFIDENTIAL', {
    opacity: 0.3,
    rotation: 45
  })
);

// Apply an OCR action
workflow.applyAction(BuildActions.ocr('eng'));
```

#### `applyActions(actions)`
Applies multiple actions to the workflow.

**Parameters:**
- `actions: BuildAction[]` - An array of actions to apply to the workflow.

**Returns:** `WorkflowWithActionsStage` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Apply multiple actions to the workflow
workflow.applyActions([
  BuildActions.watermarkText('DRAFT', { opacity: 0.5 }),
  BuildActions.ocr('eng'),
  BuildActions.flatten()
]);
```

#### Action Types:

#### Document Processing

##### `BuildActions.ocr(language)`
Creates an OCR (Optical Character Recognition) action to extract text from images or scanned documents.

**Parameters:**
- `language: string | string[]` - Language(s) for OCR. Can be a single language or an array of languages.

**Example:**
```typescript
// Basic OCR with English language
workflow.applyAction(BuildActions.ocr('english'));

// OCR with multiple languages
workflow.applyAction(BuildActions.ocr(['english', 'french', 'german']));

// OCR with options (via object syntax)
workflow.applyAction(BuildActions.ocr({
  language: 'english',
  enhanceResolution: true
}));
```

##### `BuildActions.rotate(rotateBy)`
Creates an action to rotate pages in the document.

**Parameters:**
- `rotateBy: 90 | 180 | 270` - Rotation angle in degrees (must be 90, 180, or 270).

**Example:**
```typescript
// Rotate pages by 90 degrees
workflow.applyAction(BuildActions.rotate(90));

// Rotate pages by 180 degrees
workflow.applyAction(BuildActions.rotate(180));
```

##### `BuildActions.flatten(annotationIds?)`
Creates an action to flatten annotations into the document content, making them non-interactive but permanently visible.

**Parameters:**
- `annotationIds?: (string | number)[]` - Optional array of annotation IDs to flatten. If not specified, all annotations will be flattened.

**Example:**
```typescript
// Flatten all annotations
workflow.applyAction(BuildActions.flatten());

// Flatten specific annotations
workflow.applyAction(BuildActions.flatten(['annotation1', 'annotation2']));
```

#### Watermarking

##### `BuildActions.watermarkText(text, options?)`
Creates an action to add a text watermark to the document.

**Parameters:**
- `text: string` - Watermark text content.
- `options?: object` - Watermark options:
  - `width`: Width dimension of the watermark (value and unit, e.g. `{value: 100, unit: '%'}`)
  - `height`: Height dimension of the watermark (value and unit)
  - `top`, `right`, `bottom`, `left`: Position of the watermark (value and unit)
  - `rotation`: Rotation of the watermark in counterclockwise degrees (default: 0)
  - `opacity`: Watermark opacity (0 is fully transparent, 1 is fully opaque)
  - `fontFamily`: Font family for the text (e.g. 'Helvetica')
  - `fontSize`: Size of the text in points
  - `fontColor`: Foreground color of the text (e.g. '#ffffff')
  - `fontStyle`: Text style array ('bold', 'italic', or both)

**Example:**
```typescript
// Simple text watermark
workflow.applyAction(BuildActions.watermarkText('CONFIDENTIAL'));

// Customized text watermark
workflow.applyAction(BuildActions.watermarkText('DRAFT', {
  opacity: 0.5,
  rotation: 45,
  fontSize: 36,
  fontColor: '#FF0000',
  fontStyle: ['bold', 'italic']
}));
```

##### `BuildActions.watermarkImage(image, options?)`
Creates an action to add an image watermark to the document.

**Parameters:**
- `image: FileInput` - Watermark image (file path, Buffer, or URL).
- `options?: object` - Watermark options:
  - `width`: Width dimension of the watermark (value and unit, e.g. `{value: 100, unit: '%'}`)
  - `height`: Height dimension of the watermark (value and unit)
  - `top`, `right`, `bottom`, `left`: Position of the watermark (value and unit)
  - `rotation`: Rotation of the watermark in counterclockwise degrees (default: 0)
  - `opacity`: Watermark opacity (0 is fully transparent, 1 is fully opaque)

**Example:**
```typescript
// Simple image watermark
workflow.applyAction(BuildActions.watermarkImage('/path/to/logo.png'));

// Customized image watermark
workflow.applyAction(BuildActions.watermarkImage('/path/to/logo.png', {
  opacity: 0.3,
  width: { value: 50, unit: '%' },
  height: { value: 50, unit: '%' },
  top: { value: 10, unit: 'px' },
  left: { value: 10, unit: 'px' },
  rotation: 0
}));
```

#### Annotations

##### `BuildActions.applyInstantJson(file)`
Creates an action to apply annotations from an Instant JSON file to the document.

**Parameters:**
- `file: FileInput` - Instant JSON file input (file path, Buffer, or URL).

**Example:**
```typescript
// Apply annotations from Instant JSON file
workflow.applyAction(BuildActions.applyInstantJson('/path/to/annotations.json'));
```

##### `BuildActions.applyXfdf(file, options?)`
Creates an action to apply annotations from an XFDF file to the document.

**Parameters:**
- `file: FileInput` - XFDF file input (file path, Buffer, or URL).
- `options?: object` - Apply XFDF options:
  - `ignorePageRotation?: boolean` - If true, ignores page rotation when applying XFDF data (default: false)
  - `richTextEnabled?: boolean` - If true, plain text annotations will be converted to rich text annotations. If false, all text annotations will be plain text annotations (default: true)

**Example:**
```typescript
// Apply annotations from XFDF file with default options
workflow.applyAction(BuildActions.applyXfdf('/path/to/annotations.xfdf'));

// Apply annotations with specific options
workflow.applyAction(BuildActions.applyXfdf('/path/to/annotations.xfdf', {
  ignorePageRotation: true,
  richTextEnabled: false
}));
```

#### Redactions

##### `BuildActions.createRedactionsText(text, options?, strategyOptions?)`
Creates an action to add redaction annotations based on text search.

**Parameters:**
- `text: string` - Text to search and redact.
- `options?: object` - Redaction options:
  - `content?: object` - Visual aspects of the redaction annotation (background color, overlay text, etc.)
- `strategyOptions?: object` - Redaction strategy options:
  - `includeAnnotations?: boolean` - If true, redaction annotations are created on top of annotations whose content match the provided text (default: true)
  - `caseSensitive?: boolean` - If true, the search will be case sensitive (default: false)
  - `start?: number` - The index of the page from where to start the search (default: 0)
  - `limit?: number` - Starting from start, the number of pages to search (default: to the end of the document)

**Example:**
```typescript
// Create redactions for all occurrences of "Confidential"
workflow.applyAction(BuildActions.createRedactionsText('Confidential'));

// Create redactions with custom appearance and search options
workflow.applyAction(BuildActions.createRedactionsText('Confidential', 
  {
    content: {
      backgroundColor: '#000000',
      overlayText: 'REDACTED',
      textColor: '#FFFFFF'
    }
  },
  {
    caseSensitive: true,
    start: 2,
    limit: 5
  }
));
```

##### `BuildActions.createRedactionsRegex(regex, options?, strategyOptions?)`
Creates an action to add redaction annotations based on regex pattern matching.

**Parameters:**
- `regex: string` - Regex pattern to search and redact.
- `options?: object` - Redaction options:
  - `content?: object` - Visual aspects of the redaction annotation (background color, overlay text, etc.)
- `strategyOptions?: object` - Redaction strategy options:
  - `includeAnnotations?: boolean` - If true, redaction annotations are created on top of annotations whose content match the provided regex (default: true)
  - `caseSensitive?: boolean` - If true, the search will be case sensitive (default: true)
  - `start?: number` - The index of the page from where to start the search (default: 0)
  - `limit?: number` - Starting from start, the number of pages to search (default: to the end of the document)

**Example:**
```typescript
// Create redactions for email addresses
workflow.applyAction(BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'));

// Create redactions with custom appearance and search options
workflow.applyAction(BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  {
    content: {
      backgroundColor: '#FF0000',
      overlayText: 'EMAIL REDACTED'
    }
  },
  {
    caseSensitive: false,
    start: 0,
    limit: 10
  }
));
```

##### `BuildActions.createRedactionsPreset(preset, options?, strategyOptions?)`
Creates an action to add redaction annotations based on a preset pattern.

**Parameters:**
- `preset: string` - Preset pattern to search and redact (e.g. 'email-address', 'credit-card-number', 'social-security-number', etc.)
- `options?: object` - Redaction options:
  - `content?: object` - Visual aspects of the redaction annotation (background color, overlay text, etc.)
- `strategyOptions?: object` - Redaction strategy options:
  - `includeAnnotations?: boolean` - If true, redaction annotations are created on top of annotations whose content match the provided preset (default: true)
  - `start?: number` - The index of the page from where to start the search (default: 0)
  - `limit?: number` - Starting from start, the number of pages to search (default: to the end of the document)

**Example:**
```typescript
// Create redactions for email addresses using preset
workflow.applyAction(BuildActions.createRedactionsPreset('email-address'));

// Create redactions for credit card numbers with custom appearance
workflow.applyAction(BuildActions.createRedactionsPreset('credit-card-number',
  {
    content: {
      backgroundColor: '#000000',
      overlayText: 'FINANCIAL DATA'
    }
  },
  {
    start: 0,
    limit: 5
  }
));
```

##### `BuildActions.applyRedactions()`
Creates an action to apply previously created redaction annotations, permanently removing the redacted content.

**Example:**
```typescript
// First create redactions
workflow.applyAction(BuildActions.createRedactionsPreset('email-address'));

// Then apply them
workflow.applyAction(BuildActions.applyRedactions());
```

### Stage 3: Set Output Format

In this stage, you specify the desired output format:

```typescript
workflow.outputPdf({ 
  optimize: { 
    mrcCompression: true,
    imageOptimizationQuality: 2 
  } 
});
```

Available methods:

#### `outputPdf(options?)`
Sets the output format to PDF.

**Parameters:**
- `options?: object` - Additional options for PDF output, such as compression, encryption, etc.
  - `options.metadata?: object` - Document metadata properties like title, author.
  - `options.labels?: array` - Custom labels to add to the document for organization and categorization.
  - `options.userPassword?: string` - Password required to open the document. When set, the PDF will be encrypted.
  - `options.ownerPassword?: string` - Password required to modify the document. Provides additional security beyond the user password.
  - `options.userPermissions?: array` - Array of permissions granted to users who open the document with the user password.
    Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
  - `options.optimize?: object` - PDF optimization settings to reduce file size and improve performance.
    - `options.optimize.mrcCompression?: boolean` - When true, applies Mixed Raster Content compression to reduce file size.
    - `options.optimize.imageOptimizationQuality?: number` - Controls the quality of image optimization (1-5, where 1 is highest quality).

**Returns:** `WorkflowWithOutputStage<'pdf'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to PDF with default options
workflow.outputPdf();

// Set output format to PDF with specific options
workflow.outputPdf({
  userPassword: 'secret',
  userPermissions: ["printing"],
  metadata: {
    title: 'Important Document',
    author: 'Document System'
  },
  optimize: {
    mrcCompression: true,
    imageOptimizationQuality: 3
  }
});
```

#### `outputPdfA(options?)`
Sets the output format to PDF/A (archival PDF).

**Parameters:**
- `options?: object` - Additional options for PDF/A output.
  - `options.conformance?: string` - The PDF/A conformance level to target. Options include 'pdfa-1b', 'pdfa-1a', 'pdfa-2b', 'pdfa-2a', 'pdfa-3b', 'pdfa-3a'.
    Different levels have different requirements for long-term archiving.
  - `options.vectorization?: boolean` - When true, attempts to convert raster content to vector graphics where possible, improving quality and reducing file size.
  - `options.rasterization?: boolean` - When true, converts vector graphics to raster images, which can help with compatibility in some cases.
  - `options.metadata?: object` - Document metadata properties like title, author.
  - `options.labels?: array` - Custom labels to add to the document for organization and categorization.
  - `options.userPassword?: string` - Password required to open the document. When set, the PDF will be encrypted.
  - `options.ownerPassword?: string` - Password required to modify the document. Provides additional security beyond the user password.
  - `options.userPermissions?: array` - Array of permissions granted to users who open the document with the user password.
    Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
  - `options.optimize?: object` - PDF optimization settings to reduce file size and improve performance.
    - `options.optimize.mrcCompression?: boolean` - When true, applies Mixed Raster Content compression to reduce file size.
    - `options.optimize.imageOptimizationQuality?: number` - Controls the quality of image optimization (1-5, where 1 is highest quality).

**Returns:** `WorkflowWithOutputStage<'pdfa'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to PDF/A with default options
workflow.outputPdfA();

// Set output format to PDF/A with specific options
workflow.outputPdfA({
  conformance: 'pdfa-2b',
  vectorization: true,
  metadata: {
    title: 'Archive Document',
    author: 'Document System'
  },
  optimize: {
    mrcCompression: true
  }
});
```

#### `outputPdfUA(options?)`
Sets the output format to PDF/UA (Universal Accessibility).

**Parameters:**
- `options?: object` - Additional options for PDF/UA output.
  - `options.metadata?: object` - Document metadata properties like title, author.
  - `options.labels?: array` - Custom labels to add to the document for organization and categorization.
  - `options.userPassword?: string` - Password required to open the document. When set, the PDF will be encrypted.
  - `options.ownerPassword?: string` - Password required to modify the document. Provides additional security beyond the user password.
  - `options.userPermissions?: array` - Array of permissions granted to users who open the document with the user password.
    Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
  - `options.optimize?: object` - PDF optimization settings to reduce file size and improve performance.
    - `options.optimize.mrcCompression?: boolean` - When true, applies Mixed Raster Content compression to reduce file size.
    - `options.optimize.imageOptimizationQuality?: number` - Controls the quality of image optimization (1-5, where 1 is highest quality).

**Returns:** `WorkflowWithOutputStage<'pdfua'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to PDF/UA with default options
workflow.outputPdfUA();

// Set output format to PDF/UA with specific options
workflow.outputPdfUA({
  metadata: {
    title: 'Accessible Document',
    author: 'Document System'
  },
  optimize: {
    mrcCompression: true,
    imageOptimizationQuality: 3
  }
});
```

#### `outputImage(format, options?)`
Sets the output format to an image format (PNG, JPEG, WEBP).

**Parameters:**
- `format: 'png' | 'jpeg' | 'jpg' | 'webp'` - The image format to output.
  - PNG: Lossless compression, supports transparency, best for graphics and screenshots
  - JPEG/JPG: Lossy compression, smaller file size, best for photographs
  - WEBP: Modern format with both lossy and lossless compression, good for web use
- `options?: object` - Additional options for image output, such as resolution, quality, etc.
  **Note: At least one of options.width, options.height, or options.dpi must be specified.**
  - `options.pages?: object` - Specifies which pages to convert to images. If omitted, all pages are converted.
    - `options.pages.start?: number` - The first page to convert (0-based index).
    - `options.pages.end?: number` - The last page to convert (0-based index).
  - `options.width?: number` - The width of the output image in pixels. If specified without height, aspect ratio is maintained.
  - `options.height?: number` - The height of the output image in pixels. If specified without width, aspect ratio is maintained.
  - `options.dpi?: number` - The resolution in dots per inch. Higher values create larger, more detailed images.
    Common values: 72 (web), 150 (standard), 300 (print quality), 600 (high quality).

**Returns:** `WorkflowWithOutputStage<format>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to PNG with dpi specified
workflow.outputImage('png', { dpi: 300 });

// Set output format to JPEG with specific options
workflow.outputImage('jpeg', {
  dpi: 300,
  pages: { start: 1, end: 3 }
});

// Set output format to WEBP with specific dimensions
workflow.outputImage('webp', {
  width: 1200,
  height: 800,
  dpi: 150
});
```

#### `outputOffice(format)`
Sets the output format to an Office document format (DOCX, XLSX, PPTX).

**Parameters:**
- `format: 'docx' | 'xlsx' | 'pptx'` - The Office format to output ('docx' for Word, 'xlsx' for Excel, or 'pptx' for PowerPoint).

**Returns:** `WorkflowWithOutputStage<format>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to Word document (DOCX)
workflow.outputOffice('docx');

// Set output format to Excel spreadsheet (XLSX)
workflow.outputOffice('xlsx');

// Set output format to PowerPoint presentation (PPTX)
workflow.outputOffice('pptx');
```

#### `outputHtml(layout)`
Sets the output format to HTML.

**Parameters:**
- `layout: 'page' | 'reflow'` - The layout type to use for conversion to HTML: 
  - 'page' layout keeps the original structure of the document, segmented by page.
  - 'reflow' layout converts the document into a continuous flow of text, without page breaks.

**Returns:** `WorkflowWithOutputStage<'html'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to HTML
workflow.outputHtml('page');
```

#### `outputMarkdown()`
Sets the output format to Markdown.

**Returns:** `WorkflowWithOutputStage<'markdown'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to Markdown with default options
workflow.outputMarkdown();
```

#### `outputJson(options?)`
Sets the output format to JSON content.

**Parameters:**
- `options?: object` - Additional options for JSON output.
  - `options.plainText?: boolean` - When true, extracts plain text content from the document and includes it in the JSON output.
    This provides the raw text without structural information.
  - `options.structuredText?: boolean` - When true, extracts text with structural information (paragraphs, headings, etc.)
    and includes it in the JSON output.
  - `options.keyValuePairs?: boolean` - When true, attempts to identify and extract key-value pairs from the document
    (like form fields, labeled data, etc.) and includes them in the JSON output.
  - `options.tables?: boolean` - When true, attempts to identify and extract tabular data from the document
    and includes it in the JSON output as structured table objects.
  - `options.language?: string | string[]` - Specifies the language(s) of the document content for better text extraction.
    Can be a single language code or an array of language codes for multi-language documents.
    Examples: "english", "french", "german", or ["english", "spanish"].

**Returns:** `WorkflowWithOutputStage<'json-content'>` - The workflow builder instance for method chaining.

**Example:**
```typescript
// Set output format to JSON with default options
workflow.outputJson();

// Set output format to JSON with specific options
workflow.outputJson({
  plainText: true,
  structuredText: true,
  keyValuePairs: true,
  tables: true,
  language: "english"
});

// Set output format to JSON with multiple languages
workflow.outputJson({
  plainText: true,
  tables: true,
  language: ["english", "french", "german"]
});
```

### Stage 4: Execute or Dry Run

In this final stage, you execute the workflow or perform a dry run:

```typescript
const result = await workflow.execute();
```

Available methods:

#### `execute(options?)`
Executes the workflow and returns the result.

**Parameters:**
- `options?: WorkflowExecuteOptions` - Options for workflow execution.
  - `options.onProgress?: (current: number, total: number) => void` - Callback for progress updates.

**Returns:** `Promise<TypedWorkflowResult<TOutput>>` - A promise that resolves to the workflow result.

**Example:**
```typescript
// Execute the workflow with default options
const result = await workflow.execute();

// Execute with progress tracking
const result = await workflow.execute({
  onProgress: (current, total) => {
    console.log(`Processing step ${current} of ${total}`);
  }
});
```

#### `dryRun(options?)`
Performs a dry run of the workflow without generating the final output. This is useful for validating the workflow configuration and estimating processing time.

**Returns:** `Promise<WorkflowDryRunResult>` - A promise that resolves to the dry run result, containing validation information and estimated processing time.

**Example:**
```typescript
// Perform a dry run with default options
const dryRunResult = await workflow
  .addFilePart('/path/to/document.pdf')
  .outputPdf()
  .dryRun();
```

## Workflow Examples

### Basic Document Conversion

```typescript
const result = await client
  .workflow()
  .addFilePart('document.docx')
  .outputPdf()
  .execute();
```

### Document Merging with Watermark

```typescript
const result = await client
  .workflow()
  .addFilePart('document1.pdf')
  .addFilePart('document2.pdf')
  .applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
    opacity: 0.5,
    fontSize: 48
  }))
  .outputPdf()
  .execute();
```

### OCR with Language Selection

```typescript
const result = await client
  .workflow()
  .addFilePart('scanned-document.pdf')
  .applyAction(BuildActions.ocr({
    language: 'english',
    enhanceResolution: true
  }))
  .outputPdf()
  .execute();
```

### HTML to PDF Conversion

```typescript
const result = await client
  .workflow()
  .addHtmlPart('index.html', undefined, {
    layout: {
      size: 'A4',
      margin: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    }
  })
  .outputPdf()
  .execute();
```

### Complex Multi-step Workflow

```typescript
const result = await client
  .workflow()
  .addFilePart('document.pdf', { pages: { start: 0, end: 5 } })
  .addFilePart('appendix.pdf')
  .applyActions([
    BuildActions.ocr({ language: 'english' }),
    BuildActions.watermarkText('CONFIDENTIAL'),
    BuildActions.createRedactionsPreset('email-address', 'apply')
  ])
  .outputPdfA({
    level: 'pdfa-2b',
    optimize: {
      mrcCompression: true
    }
  })
  .execute({
    onProgress: (current, total) => {
      console.log(`Processing step ${current} of ${total}`);
    }
  });
```

## Staged Workflow Builder

For more complex scenarios where you need to build workflows dynamically, you can use the staged workflow builder:

```typescript
// Create a staged workflow
const workflow = client.workflow()

// Add parts
workflow.addFilePart('document.pdf');

// Conditionally add more parts
if (includeAppendix) {
  workflow.addFilePart('appendix.pdf');
}

// Conditionally apply actions
if (needsWatermark) {
  (workflow as WorkflowWithPartsStage).applyAction(BuildActions.watermarkText('CONFIDENTIAL'));
}

// Set output format based on user preference
if (outputFormat === 'pdf') {
  (workflow as WorkflowWithActionsStage).outputPdf();
} else if (outputFormat === 'docx') {
  (workflow as WorkflowWithActionsStage).outputOffice('docx');
} else {
  (workflow as WorkflowWithActionsStage).outputImage('png');
}

// Execute the workflow
const result = await (workflow as WorkflowWithOutputStage).execute();
```

## Error Handling in Workflows

Workflows provide detailed error information:

```typescript
try {
  const result = await client
    .workflow()
    .addFilePart('document.pdf')
    .outputPdf()
    .execute();

  if (!result.success) {
    // Handle workflow errors
    result.errors?.forEach(error => {
      console.error(`Step ${error.step}: ${error.error.message}`);
    });
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Workflow execution failed:', error);
}
```

## Workflow Result Structure

The result of a workflow execution includes:

```typescript
interface WorkflowResult {
  // Overall success status
  success: boolean;

  // Output data (if successful)
  output?: {
    // For File output
    mimeType: string;
    filename: string;
    // For Binary File (PDF, Image, Office)
    buffer: Buffer;
    // For Text File (HTML, Markdown)
    content: string
    // For JSON output:
    data?: any;
  };

  // Error information (if failed)
  errors?: Array<{
    step: string;
    error: {
      message: string;
      code: string;
      details?: any;
    };
  }>;
}
```

## Performance Considerations

For optimal performance with workflows:

1. **Minimize the number of parts**: Combine related files when possible
2. **Use appropriate output formats**: Choose formats based on your needs
3. **Consider dry runs**: Use `dryRun()` to estimate resource usage
4. **Monitor progress**: Use the `onProgress` callback for long-running workflows
5. **Handle large files**: For very large files, consider splitting into smaller workflows
