#! /usr/bin/env node
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'LLM_DOC.md');
const documentation = fs.readFileSync(docPath, 'utf8');
const typePath = path.join(__dirname, '../dist', 'index.d.ts');

// Use process.cwd() as the actual root of the user's project
const userProjectRoot = process.cwd();
const outputDirectory = path.join(userProjectRoot, '.cursor/rules');
const outputFile = path.join(outputDirectory, 'nutrient-dws-doc.mdc');

const relativeTypePath = path.relative(userProjectRoot, typePath);

try {
  const rule = `
---
description: This rule explains how to use the Nutrient DWS TypeScript Client for operations with document processing operations including conversion, merging, compression, watermarking, signage, and text extraction.
globs: 
alwaysApply: false
---
> The TypeScript Type Definitions can be found at: ${relativeTypePath}

${documentation}
`
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  fs.writeFileSync(outputFile, `${rule}`);
  console.log(`📄 Updated Cursor Rules to point to Nutrient DWS documentation at \`${outputFile}\`.`);
} catch (err) {
  console.error('Failed to update Cursor Rule:', err.message);
}