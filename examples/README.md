# Nutrient DWS TypeScript Client Example

This example project demonstrates how to use the Nutrient DWS TypeScript Client for document processing operations.

## Project Structure

- `assets/` - Contains sample files for processing (PDF, DOCX, PNG)
- `src/` - Contains TypeScript source files
  - `direct_method.ts` - Examples using direct method calls
  - `workflow.ts` - Examples using the workflow builder pattern
- `output/` - Directory where processed files will be saved
- `.env.example` - Example environment variables file

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/pspdfkit-labs/nutrient-dws-client-typescript.git
   cd nutrient-dws-client-typescript
   ```

2. Install dependencies for the main package:
   ```bash
   npm install
   ```

3. Build the main package:
   ```bash
   npm run build
   ```
   
4. Pack the package:
   ```bash
   npm pack
   ```

5. Navigate to the examples directory:
   ```bash
   cd examples
   ```

6. Install dependencies for the example project:
   ```bash
   npm install
   ```

7. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

8. Edit the `.env` file and add your Nutrient DWS Processor API key. You can sign up for a free API key by visiting [Nutrient](https://www.nutrient.io/api/):
   ```
   NUTRIENT_API_KEY=your_api_key_here
   ```

## Running the Examples

### Direct Method Examples

To run the direct method examples:

```bash
npm run start:direct
```

This will:
1. Convert a DOCX file to PDF
2. Extract text from the PDF
3. Add a watermark to the PDF
4. Merge multiple documents

### Workflow Examples

To run the workflow examples:

```bash
npm run start:workflow
```

This will:
1. Perform a basic document conversion workflow
2. Create a document merging with watermark workflow
3. Extract text with JSON output
4. Execute a complex multi-step workflow

## Output

All processed files will be saved to the `output/` directory. You can examine these files to see the results of the document processing operations.

## Documentation

For more information about the Nutrient DWS TypeScript Client, refer to:

- [README.md](../README.md) - Main documentation
- [METHODS.md](../METHODS.md) - Direct methods documentation
- [WORKFLOW.md](../WORKFLOW.md) - Workflow system documentation
