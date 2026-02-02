#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PLUGIN_DIR = path.join(ROOT_DIR, 'com.jmolund.bf6stats.sdPlugin');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const MANIFEST_PATH = path.join(PLUGIN_DIR, 'manifest.json');

// Read version from manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const version = manifest.Version;
const pluginName = 'com.jmolund.bf6stats';
const outputFile = `${pluginName}.streamDeckPlugin`;
const outputPath = path.join(DIST_DIR, outputFile);

console.log(`Building ${pluginName} v${version}...\n`);

// Create dist directory
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

// Remove old package if exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

// Create the .streamDeckPlugin package
execSync(`cd "${PLUGIN_DIR}" && zip -r "${outputPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });

console.log(`\n✓ Created: dist/${outputFile}`);

// Check if --publish flag is passed
if (process.argv.includes('--publish')) {
  console.log(`\nPublishing release v${version} to GitHub...`);

  const releaseNotes = `## Installation

1. Download \`${outputFile}\`
2. Double-click the file to install
3. The plugin will appear in your Stream Deck app under "BF6 Stats"

## Features
- Display your Battlefield 6 player statistics on Stream Deck`;

  const notesFile = path.join(DIST_DIR, 'release-notes.md');
  fs.writeFileSync(notesFile, releaseNotes);

  try {
    // Check if release already exists
    try {
      execSync(`gh release view v${version}`, { stdio: 'ignore' });
      console.log(`Release v${version} already exists. Deleting...`);
      execSync(`gh release delete v${version} -y`, { stdio: 'inherit' });
    } catch {
      // Release doesn't exist, that's fine
    }

    execSync(`gh release create v${version} "${outputPath}" --title "BF6 Stats v${version}" --notes-file "${notesFile}"`, { stdio: 'inherit' });
    console.log(`\n✓ Published release v${version}`);
  } catch (err) {
    console.error('\nFailed to publish. Make sure gh CLI is installed and authenticated.');
    process.exit(1);
  } finally {
    // Clean up notes file
    if (fs.existsSync(notesFile)) {
      fs.unlinkSync(notesFile);
    }
  }
}
