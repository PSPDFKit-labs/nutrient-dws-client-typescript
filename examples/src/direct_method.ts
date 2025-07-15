/**
 * Direct Method Example
 * 
 * This example demonstrates how to use the Nutrient DWS TypeScript Client
 * with direct method calls for document processing operations.
 */

import { NutrientClient } from 'nutrient-dws-client-typescript';
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

// Example 1: Convert a document
async function convertDocument() {
  console.log('Example 1: Converting DOCX to PDF');

  try {
    const docxPath = path.join(assetsDir, 'sample.docx');
    const result = await client.convert(docxPath, 'pdf');

    // Save the result to the output directory
    const outputPath = path.join(outputDir, 'converted-document.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.buffer));

    console.log(`Conversion successful. Output saved to: ${outputPath}`);
    console.log(`MIME type: ${result.mimeType}`);
    return outputPath;
  } catch (error) {
    console.error('Conversion failed:', error);
    throw error;
  }
}

// Example 2: Extract text from a document
async function extractText(filePath: string) {
  console.log('\nExample 2: Extracting text from PDF');

  try {
    const result = await client.extractText(filePath);

    // Save the extracted text to the output directory
    const outputPath = path.join(outputDir, 'extracted-text.json');
    fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));

    // Display a sample of the extracted text
    const textSample = result.data.pages![0].plainText!.substring(0, 100) + '...';
    console.log(`Text extraction successful. Output saved to: ${outputPath}`);
    console.log(`Text sample: ${textSample}`);
    return outputPath;
  } catch (error) {
    console.error('Text extraction failed:', error);
    throw error;
  }
}

// Example 3: Add a watermark to a document
async function addWatermark(filePath: string) {
  console.log('\nExample 3: Adding watermark to PDF');

  try {
    const result = await client.watermarkText(filePath, 'CONFIDENTIAL', {
      opacity: 0.5,
      fontColor: '#FF0000',
      rotation: 45,
      width: { value: 50, unit: "%" }
    });

    // Save the watermarked document to the output directory
    const outputPath = path.join(outputDir, 'watermarked-document.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.buffer));

    console.log(`Watermarking successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Watermarking failed:', error);
    throw error;
  }
}

// Example 4: Merge multiple documents
async function mergeDocuments() {
  console.log('\nExample 4: Merging documents');

  try {
    // Create a second PDF
    const pdfPath = path.join(assetsDir, 'sample.pdf');

    // Get the converted PDF from Example 1
    const convertedPdfPath = path.join(outputDir, 'converted-document.pdf');

    // Merge the documents
    const result = await client.merge([convertedPdfPath, pdfPath]);

    // Save the merged document to the output directory
    const outputPath = path.join(outputDir, 'merged-document.pdf');
    fs.writeFileSync(outputPath, Buffer.from(result.buffer));

    console.log(`Merging successful. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Merging failed:', error);
    throw error;
  }
}

// Example 5: Process sample.pdf directly
async function processSamplePdf() {
  console.log('\nExample 5: Processing sample.pdf directly');

  try {
    const pdfPath = path.join(assetsDir, 'sample.pdf');

    // Extract text from sample.pdf
    const extractResult = await client.extractText(pdfPath);
    const extractOutputPath = path.join(outputDir, 'sample-pdf-extracted-text.json');
    fs.writeFileSync(extractOutputPath, JSON.stringify(extractResult.data, null, 2));

    const waterMarkImagePath = path.join(assetsDir, 'sample.png')

    // Add watermark to sample.pdf
    const watermarkResult = await client.watermarkImage(pdfPath, waterMarkImagePath, {
      opacity: 0.4,
    });

    const watermarkOutputPath = path.join(outputDir, 'sample-pdf-watermarked.pdf');
    fs.writeFileSync(watermarkOutputPath, Buffer.from(watermarkResult.buffer));

    console.log(`Sample PDF processing successful.`);
    console.log(`Extracted text saved to: ${extractOutputPath}`);
    console.log(`Watermarked PDF saved to: ${watermarkOutputPath}`);

    return watermarkOutputPath;
  } catch (error) {
    console.error('Sample PDF processing failed:', error);
    throw error;
  }
}

// Run all examples
async function runExamples() {
  try {
    console.log('Starting direct method examples...\n');

    // Run the examples in sequence
    const convertedPdfPath = await convertDocument();
    await extractText(convertedPdfPath);
    await addWatermark(convertedPdfPath);
    await mergeDocuments();
    await processSamplePdf();

    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('\nExamples failed:', error);
  }
}

// Execute the examples
runExamples();
