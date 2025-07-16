# Nutrient DWS TypeScript Client

[![npm](https://img.shields.io/npm/v/%40nutrient-sdk/dws-client-typescript)](https://www.npmjs.com/package/@nutrient-sdk/dws-client-typescript)
[![CI](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/ci.yml)
[![Integration Tests](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/integration-tests.yml)
[![Security](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/security.yml/badge.svg)](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js TypeScript client library for [Nutrient Document Web Services (DWS) API](https://nutrient.io/). This library provides a type-safe and ergonomic interface for document processing operations including conversion, merging, compression, watermarking, and text extraction.

> **Note**: This package is published as `nutrient-dws-client-typescript` on NPM. The package provides full TypeScript support and is designed specifically for Node.js environments.

## Features

- 📄 **Powerful document processing**: Convert, OCR, edit, compress, watermark, redact, and digitally sign documents
- 🤖 **LLM friendly**: Built-in support for popular Coding Agents (Claude Code, GitHub Copilot, JetBrains Junie, Cursor, Windsurf) and documentation on Context7
- 🔄 **100% mapping with DWS Processor API**: Complete coverage of all Nutrient DWS Processor API capabilities
- 🛠️ **Convenient functions with sane defaults**: Simple interfaces for common operations with smart default settings
- ⛓️ **Chainable operations**: Build complex document workflows with intuitive method chaining
- 🔐 **Flexible authentication and security**: Support for API keys and async token providers with secure handling
- ✅ **Highly tested**: Comprehensive test suite ensuring reliability and stability
- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 📦 **Multiple module formats**: ESM and CommonJS builds

## Installation

```bash
npm install nutrient-dws-client-typescript
```

or

```bash
yarn add nutrient-dws-client-typescript
```

## Integration with Coding Agents

This package has built-in support with popular coding agents like Claude Code, GitHub Copilot, Cursor, and Windsurf by exposing scripts that will inject rules instructing the coding agents on how to use the package. This ensures that the coding agent doesn't hallucinate documentation, as well as making full use of all the features offered in Nutrient DWS TypeScript Client.

```bash
# Adding code rule to Claude Code
npx dws-add-claude-code-rule

# Adding code rule to GitHub Copilot
npx dws-add-github-copilot-rule

# Adding code rule to Junie (Jetbrains)
npx dws-add-junie-rule

# Adding code rule to Cursor
npx dws-add-cursor-rule

# Adding code rule to Windsurf
npx dws-add-windsurf-rule
```

The documentation for Nutrient DWS TypeScript Client is also available on [Context7](https://context7.com/pspdfkit-labs/nutrient-dws-client-typescript)

## Quick Start

## Authentication

### Direct API Key

Provide your API key directly:

```typescript
const client = new NutrientClient({
  apiKey: 'nutr_sk_your_secret_key'
});
```

### Token Provider

Use an async token provider to fetch tokens from a secure source:

```typescript
const client = new NutrientClient({
  apiKey: async () => {
    const response = await fetch('/api/get-nutrient-token');
    const { token } = await response.json();
    return token;
  }
});
```

## Direct Methods

The client provides numerous methods for document processing:

```typescript
// Convert a document
const pdfResult = await client.convert('document.docx', 'pdf');

// Extract text
const textResult = await client.extractText('document.pdf');

// Add a watermark
const watermarkedDoc = await client.watermarkText('document.pdf', 'CONFIDENTIAL');

// Merge multiple documents
const mergedPdf = await client.merge(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
```

For a complete list of available methods with examples, see the [Methods Documentation](./METHODS.md).


## Workflow System

The client also provide a fluent builder pattern with staged interfaces to create document processing workflows:

```typescript
const result = await client
  .workflow()
  .addFilePart('document.pdf')
  .addFilePart('appendix.pdf')
  .applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
    opacity: 0.5,
    fontSize: 48
  }))
  .outputPdf({ 
    optimize: { 
      mrcCompression: true,
      imageOptimizationQuality: 2 
    } 
  })
  .execute();
```

The workflow system follows a staged approach:
1. Add document parts (files, HTML, pages)
2. Apply actions (optional)
3. Set output format
4. Execute or perform a dry run

For detailed information about the workflow system, including examples and best practices, see the [Workflow Documentation](./WORKFLOW.md).

## Error Handling

The library provides a comprehensive error hierarchy:

```typescript
import { 
  NutrientError,
  ValidationError,
  APIError,
  AuthenticationError,
  NetworkError
} from 'nutrient-dws-client-typescript';

try {
  const result = await client.convert('file.docx', 'pdf');
} catch (error) {
  if (error instanceof ValidationError) {
    // Invalid input parameters
    console.error('Invalid input:', error.message, error.details);
  } else if (error instanceof AuthenticationError) {
    // Authentication failed
    console.error('Auth error:', error.message, error.statusCode);
  } else if (error instanceof APIError) {
    // API returned an error
    console.error('API error:', error.message, error.statusCode, error.details);
  } else if (error instanceof NetworkError) {
    // Network request failed
    console.error('Network error:', error.message, error.details);
  }
}
```

## Testing

The library includes comprehensive unit and integration tests:

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run only unit tests
npm run test:unit

# Run integration tests (requires API key)
NUTRIENT_API_KEY=your_key npm run test:integration
```

The library maintains high test coverage across all API methods, including:
- Unit tests for all public methods
- Integration tests for real API interactions

## Contributing

We welcome contributions to improve the library! Please follow our development standards to ensure code quality and maintainability.

Quick start for contributors:

1. Clone and setup the repository
2. Make changes following atomic commit practices
3. Use conventional commits for clear change history
4. Include appropriate tests for new features

For detailed contribution guidelines, see the [Contributing Guide](./CONTRIBUTING.md).

## Project Structure

```
src/
├── __tests__/   # Test files
├── builders/    # Builder classes
├── generated/   # Generated code
├── types/       # TypeScript interfaces and types
├── build.ts     # Build utilities
├── client.ts    # Main NutrientClient class
├── errors.ts    # Error classes
├── http.ts      # HTTP layer
├── inputs.ts    # Input handling
├── workflow.ts  # WorkflowBuilder class
└── index.ts     # Public exports
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI**: Runs linting, type checking, and tests on every push and PR
- **Integration Tests**: Tests against the real Nutrient API
- **Scheduled Integration Tests**: Daily API compatibility check
- **Security**: Automated security scanning

For security reasons, API keys are stored as GitHub Secrets and Integration tests only run on trusted sources.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/pspdfkit-labs/nutrient-dws-client-typescript/issues).

For questions about the Nutrient DWS Processor API, refer to the [official documentation](https://nutrient.io/docs/).
