#!/usr/bin/env node

/**
 * generate-pdf.mjs — HTML → PDF via Playwright
 *
 * Usage:
 *   node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4] [--project-root <path>]
 *
 * Requires: @playwright/test (or playwright) installed.
 * Uses Chromium headless to render the HTML and produce a clean, ATS-parseable PDF.
 */

import { chromium } from 'playwright';
import { resolve, dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generatePDF() {
  const args = process.argv.slice(2);

  // Parse arguments
  let inputPath;
  let outputPath;
  let format = 'a4';
  let projectRoot = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1].toLowerCase();
      continue;
    }
    if (arg === '--project-root' && args[i + 1]) {
      projectRoot = resolve(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--project-root=')) {
      projectRoot = resolve(arg.split('=')[1]);
      continue;
    }
    if (!inputPath) {
      inputPath = arg;
    } else if (!outputPath) {
      outputPath = arg;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4] [--project-root path]');
    process.exit(1);
  }

  inputPath = resolve(inputPath);
  outputPath = resolve(outputPath);

  // Validate format
  const validFormats = ['a4', 'letter'];
  if (!validFormats.includes(format)) {
    console.error(`Invalid format "${format}". Use: ${validFormats.join(', ')}`);
    process.exit(1);
  }

  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Format: ${format.toUpperCase()}`);

  // Read HTML to inject font paths as absolute file:// URLs
  let html = await readFile(inputPath, 'utf-8');

  // Resolve font paths relative to project/fonts first, then skill script/fonts.
  const skillFontDir = resolve(__dirname, 'fonts');
  const projectFontDir = join(projectRoot, 'fonts');
  const fontsDir = existsSync(projectFontDir) ? projectFontDir : existsSync(skillFontDir) ? skillFontDir : '';
  if (fontsDir) {
    html = html.replace(
      /url\(['"]?\.\\/fonts\//g,
      `url('file://${fontsDir}/`
    );
    // Close any unclosed quotes from the replacement
    html = html.replace(
      /file:\/\/([^'")]+)\.woff2['"]\)/g,
      `file://$1.woff2')`
    );
  } else {
    console.warn('WARN: fonts directory not found; using HTML-internal font URLs.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set content with file base URL for any relative resources
  await page.setContent(html, {
    waitUntil: 'networkidle',
    baseURL: `file://${dirname(inputPath)}/`,
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: format,
    printBackground: true,
    margin: {
      top: '0.6in',
      right: '0.6in',
      bottom: '0.6in',
      left: '0.6in',
    },
    preferCSSPageSize: false,
  });

  // Write PDF
  const { writeFile } = await import('fs/promises');
  await writeFile(outputPath, pdfBuffer);

  // Count pages (approximate from PDF structure)
  const pdfString = pdfBuffer.toString('latin1');
  const pageCount = (pdfString.match(/\/Type\s*\/Page[^s]/g) || []).length;

  await browser.close();

  console.log(`PDF generated: ${outputPath}`);
  console.log(`Pages: ${pageCount}`);
  console.log(`Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  return { outputPath, pageCount, size: pdfBuffer.length };
}

generatePDF().catch((err) => {
  console.error('PDF generation failed:', err.message);
  process.exit(1);
});
