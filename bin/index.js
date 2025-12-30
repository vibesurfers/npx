#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

const RACCOON = `
       /\\     /\\
      /  \\___/  \\
     / ◈ ═══ ◈  \\
    /  ╔═════╗   \\
   │   ║ ▼▼▼ ║   │
   │   ╚══●══╝   │
    \\    ═══    /
     ╲_________╱
    ╱│░░░░░░░░│╲
   ╱ │▓▓▓▓▓▓▓▓│ ╲
  ╱══╧════════╧══╲
`;

const HELP = `
${RACCOON}
  SCAVENGER CLI v0.1.0

  Usage: scavenger <command> [options]

  Commands:
    link list              List all tracked links
    link farm              Start link farming
    link break             Break/untrack links
    agent                  Start scavenger agent
    sell <price> <vol>     Sell at price/volume

  Options:
    --help, -h             Show this help
    --version, -v          Show version

  Coming Soon...
`;

function showComingSoon(cmd) {
  console.log(RACCOON);
  console.log(`  [${cmd.toUpperCase()}] Coming soon...`);
  console.log(`  Scavengers are preparing this feature.`);
  console.log();
}

if (!command || command === '--help' || command === '-h') {
  console.log(HELP);
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log('scavenger v0.1.0');
  process.exit(0);
}

if (command === 'link') {
  if (subcommand === 'list') {
    showComingSoon('link list');
  } else if (subcommand === 'farm') {
    showComingSoon('link farm');
  } else if (subcommand === 'break') {
    showComingSoon('link break');
  } else {
    console.log(RACCOON);
    console.log('  Usage: scavenger link <list|farm|break>');
  }
  process.exit(0);
}

if (command === 'agent') {
  showComingSoon('agent');
  process.exit(0);
}

if (command === 'sell') {
  const price = args[1];
  const volume = args[2];
  const type = args[3];
  console.log(RACCOON);
  if (!price || !volume) {
    console.log('  Usage: scavenger sell <price> <volume> [type]');
  } else {
    console.log(`  [SELL] Coming soon...`);
    console.log(`  Price: ${price}, Volume: ${volume}${type ? `, Type: ${type}` : ''}`);
  }
  process.exit(0);
}

// Unknown command - show help
console.log(HELP);
