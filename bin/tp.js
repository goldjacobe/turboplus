#!/usr/bin/env node

const { runTurboCommand } = require('../dist/index');

// Get the command from command line arguments
const command = process.argv[2];

if (!command) {
  console.error('Error: No command specified');
  console.log('Usage: tp <command>');
  console.log('Example: tp build');
  process.exit(1);
}

// Run the turbo command with the package selector
runTurboCommand(command).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});