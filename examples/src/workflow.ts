/**
 * Workflow Example
 * 
 * This example demonstrates how to use the Nutrient DWS TypeScript Client
 * with the workflow builder pattern for document processing operations.
 */

import { NutrientClient, BuildActions } from 'nutrient-dws-client-typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if API key is provided
if (!process.env.NUTRIENT_API_KEY) {
  console.error('Error: NUTRIENT_API_KEY is not set in .env file');
  process.exit(1);
}

// Initialize the client with API key
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY
});

// Define paths
const assetsDir = path.join(__dirname, '../assets');
const outputDir = path.join(__dirname, '../output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Example 1: Basic document conversion workflow
async function basicConversionWorkflow() {
  console.log('Example 1: Basic document conversion workflow');

  try {
    const docxPath = path.join(assetsDir, 'sample.docx');

    const result = await client
      .workflow()
      .addFilePart(docxPath)
      .outputPdf()
      .execute();

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'workflow-converted-document.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.output!.buffer));

    console.log(`Conversion workflow successful. Output saved to: ${outputPath}`);
    console.log(`MIME type: ${result.output!.mimeType}`);
    return outputPath;
  } catch (error) {
    console.error('Conversion workflow failed:', error);
    throw error;
  }
}

// Example 2: Document merging with watermark
async function mergeWithWatermarkWorkflow() {
  console.log('\nExample 2: Document merging with watermark workflow');

  try {
    const pdfPath = path.join(outputDir, 'workflow-converted-document.pdf');
    const pngPath = path.join(assetsDir, 'sample.png');

    const result = await client
      .workflow()
      .addFilePart(pdfPath)
      .addFilePart(pngPath)
      .applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
        opacity: 0.5,
        fontSize: 48,
        fontColor: '#FF0000'
      }))
      .outputPdf()
      .execute();

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'workflow-merged-watermarked.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.output!.buffer));

    console.log(`Merge with watermark workflow successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Merge with watermark workflow failed:', error);
    throw error;
  }
}

// Example 3: Extract text with JSON output
async function extractTextWorkflow(filePath: string) {
  console.log('\nExample 3: Extract text workflow with JSON output');

  try {
    const result = await client
      .workflow()
      .addFilePart(filePath)
      .outputJson({
        plainText: true,
        structuredText: true,
        keyValuePairs: true,
        tables: true
      })
      .execute();

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'workflow-extracted-text.json');
    fs.writeFileSync(outputPath, JSON.stringify(result.output!.data, null, 2));

    console.log(`Text extraction workflow successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Text extraction workflow failed:', error);
    throw error;
  }
}

// Example 4: Complex multi-step workflow
async function complexWorkflow() {
  console.log('\nExample 4: Complex multi-step workflow');

  try {
    const pdfPath = path.join(outputDir, 'workflow-converted-document.pdf');
    const pngPath = path.join(assetsDir, 'sample.png');

    const result = await client
      .workflow()
      .addFilePart(pdfPath)
      .addFilePart(pngPath)
      .applyActions([
        BuildActions.watermarkText('DRAFT', { 
          opacity: 0.3,
          fontSize: 36,
          fontColor: '#0000FF'
        }),
        BuildActions.rotate(90)
      ])
      .outputPdfUA({
        metadata: {
          title: 'Complex Workflow Example',
          author: 'Nutrient DWS TypeScript Client'
        }
      })
      .execute({
        onProgress: (current: number, total: number) => {
          console.log(`Processing step ${current} of ${total}`);
        }
      });

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'workflow-complex-result.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.output!.buffer));

    console.log(`Complex workflow successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Complex workflow failed:', error);
    throw error;
  }
}

// Example 5: Using sample.pdf directly
async function samplePdfWorkflow() {
  console.log('\nExample 5: Using sample.pdf directly');

  try {
    const pdfPath = path.join(assetsDir, 'sample.pdf');

    const result = await client
      .workflow()
      .addFilePart(pdfPath)
      .applyAction(BuildActions.watermarkText('SAMPLE PDF', {
        opacity: 0.4,
        fontSize: 42,
        fontColor: '#008000'
      }))
      .outputPdf()
      .execute();

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'workflow-sample-pdf-processed.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.output!.buffer));

    console.log(`Sample PDF workflow successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Sample PDF workflow failed:', error);
    throw error;
  }
}

// Run all examples
async function runExamples() {
  try {
    console.log('Starting workflow examples...\n');

    // Run the examples in sequence
    const convertedPdfPath = await basicConversionWorkflow();
    await mergeWithWatermarkWorkflow();
    await extractTextWorkflow(convertedPdfPath);
    await complexWorkflow();
    await samplePdfWorkflow();

    console.log('\nAll workflow examples completed successfully!');
  } catch (error) {
    console.error('\nWorkflow examples failed:', error);
  }
}

// Execute the examples
runExamples();
