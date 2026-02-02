const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_NAME = 'com.jmolund.bf6stats.sdPlugin';

function getPluginsDirectory() {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'com.elgato.StreamDeck', 'Plugins');
  } else if (platform === 'win32') {
    return path.join(process.env.APPDATA, 'Elgato', 'StreamDeck', 'Plugins');
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const args = process.argv.slice(2);
  const useSymlink = args.includes('--symlink');

  const pluginsDir = getPluginsDirectory();
  const sourcePath = path.join(__dirname, '..', PLUGIN_NAME);
  const destPath = path.join(pluginsDir, PLUGIN_NAME);

  console.log('Stream Deck BF6 Stats Plugin Installer\n');
  console.log(`Source: ${sourcePath}`);
  console.log(`Destination: ${destPath}`);

  // Check if plugins directory exists
  if (!fs.existsSync(pluginsDir)) {
    console.error('\nError: Stream Deck plugins directory not found.');
    console.error('Make sure Stream Deck software is installed.');
    process.exit(1);
  }

  // Remove existing plugin
  if (fs.existsSync(destPath)) {
    console.log('\nRemoving existing plugin...');
    if (fs.lstatSync(destPath).isSymbolicLink()) {
      fs.unlinkSync(destPath);
    } else {
      fs.rmSync(destPath, { recursive: true });
    }
  }

  if (useSymlink) {
    // Create symlink for development
    console.log('\nCreating symlink for development...');
    fs.symlinkSync(sourcePath, destPath, 'dir');
    console.log('Symlink created. Changes to source will reflect immediately.');
  } else {
    // Copy files
    console.log('\nCopying plugin files...');
    copyRecursive(sourcePath, destPath);
    console.log('Plugin files copied.');
  }

  console.log('\n✓ Installation complete!');
  console.log('\nPlease restart Stream Deck to load the plugin.');
  console.log('You can find "BF6 Stats" in the Stream Deck action list.');
}

main();
