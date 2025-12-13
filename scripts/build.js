#!/usr/bin/env node

/**
 * Custom build script that filters out baseline-browser-mapping warnings
 */

const { spawn } = require('child_process');

// Run next build with webpack (not turbopack) for production
const build = spawn('next', ['build', '--webpack'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Filter function to remove baseline-browser-mapping warnings
const filterLine = (line) => {
  const lowerLine = line.toLowerCase();
  // Skip lines containing baseline-browser-mapping warnings
  if (lowerLine.includes('baseline-browser-mapping') ||
      lowerLine.includes('the data in this module is over two months old')) {
    return false;
  }
  return true;
};

// Process stdout
build.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line && filterLine(line)) {
      process.stdout.write(line + '\n');
    }
  });
});

// Process stderr
build.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line && filterLine(line)) {
      process.stderr.write(line + '\n');
    }
  });
});

// Handle process completion
build.on('close', (code) => {
  if (code === 0) {
    console.log('\n✓ Build completed successfully!');
  }
  process.exit(code);
});

// Handle errors
build.on('error', (err) => {
  console.error('Build error:', err);
  process.exit(1);
});
