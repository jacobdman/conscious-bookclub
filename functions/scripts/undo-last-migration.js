#!/usr/bin/env node

/**
 * Safe script to undo only the last migration
 * Shows which migration will be undone and requires confirmation
 */

const { execSync } = require('child_process');
const path = require('path');

// Get the functions directory (parent of scripts)
const functionsDir = path.resolve(__dirname, '..');

// Get the last migration file name
const getLastMigration = () => {
  try {
    const statusOutput = execSync('npx sequelize-cli db:migrate:status', {
      cwd: functionsDir,
      encoding: 'utf8',
    });

    // Parse the output to find the last "up" migration
    const lines = statusOutput.split('\n');
    let lastMigration = null;

    for (const line of lines) {
      if (line.startsWith('up ')) {
        const match = line.match(/up\s+(\d+-\S+\.js)/);
        if (match) {
          lastMigration = match[1];
        }
      }
    }

    return lastMigration;
  } catch (error) {
    console.error('Error getting migration status:', error.message);
    process.exit(1);
  }
};

const main = () => {
  console.log('Checking migration status...\n');

  const lastMigration = getLastMigration();

  if (!lastMigration) {
    console.log('No migrations found to undo.');
    process.exit(0);
  }

  console.log('⚠️  WARNING: This will undo the following migration:');
  console.log(`   ${lastMigration}\n`);
  console.log('This action cannot be undone. Make sure you have a database backup.\n');

  // Use readline for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Do you want to proceed? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log(`\nUndoing migration: ${lastMigration}...\n`);
      try {
        // Use the standard undo command - it should undo the last one
        // The warning above shows which one will be undone
        execSync('npx sequelize-cli db:migrate:undo', {
          cwd: functionsDir,
          stdio: 'inherit',
        });
        console.log('\n✅ Migration undone successfully.');
      } catch (error) {
        console.error('\n❌ Error undoing migration:', error.message);
        process.exit(1);
      }
    } else {
      console.log('\nCancelled.');
    }
    rl.close();
  });
};

main();

