const fs = require('fs');
const path = require('path');

// Simple PNG generator using raw pixel data
// Creates basic colored icons for Stream Deck

function createPNG(width, height, bgColor, textColor, text) {
  // PNG file structure
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData));
    return Buffer.concat([length, typeBuffer, data, crc]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Image data - create gradient background
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Simple gradient from bgColor
      const gradientFactor = 1 - (y / height) * 0.3;
      rawData.push(Math.floor(bgColor[0] * gradientFactor));
      rawData.push(Math.floor(bgColor[1] * gradientFactor));
      rawData.push(Math.floor(bgColor[2] * gradientFactor));
    }
  }

  // Compress using zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const imagesDir = path.join(__dirname, '..', 'com.jmolund.bf6stats.sdPlugin', 'images');

// Dark blue/purple background color
const bgColor = [26, 26, 46]; // #1a1a2e

// Create icons at different sizes
const icons = [
  { name: 'action', size: 72 },
  { name: 'action@2x', size: 144 },
  { name: 'category', size: 28 },
  { name: 'category@2x', size: 56 },
  { name: 'plugin', size: 144 },
  { name: 'plugin@2x', size: 288 },
];

icons.forEach(({ name, size }) => {
  const png = createPNG(size, size, bgColor, [0, 212, 255], 'BF6');
  fs.writeFileSync(path.join(imagesDir, `${name}.png`), png);
  console.log(`Created ${name}.png (${size}x${size})`);
});

console.log('\nIcons generated successfully!');
console.log('Note: These are basic placeholder icons. For better visuals,');
console.log('replace them with custom designed PNG icons.');
