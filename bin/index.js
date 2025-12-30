#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  // Bright colors for art
  red: "\x1b[91m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  blue: "\x1b[94m",
  magenta: "\x1b[95m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
};

const brightColors = ["red", "green", "yellow", "blue", "magenta", "cyan"];

function randomColor() {
  return colors[brightColors[Math.floor(Math.random() * brightColors.length)]];
}

// ASCII Animals
const ANIMALS = [
  // Raccoon
  `
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
  ╱══╧════════╧══╲`,
  // Fox
  `
      /\\   /\\
     /  \\_/  \\
    / ●     ● \\
   /    ___    \\
   \\   /   \\   /
    \\_|  ◡  |_/
      |     |
     /|     |\\
    / |_____| \\
   /   \\   /   \\`,
  // Owl
  `
     ___________
    /   _   _   \\
   |  (◉) (◉)  |
   |     <     |
   |   \\___/   |
    \\  |   |  /
     \\_|___|_/
       || ||
      _|| ||_
     (__) (__)`,
  // Cat
  `
      /\\_____/\\
     /  o   o  \\
    ( ==  ^  == )
     )         (
    (           )
   ( (  )   (  ) )
  (__(__)___(__)__)`,
  // Wolf
  `
        /\\      /\\
       /  \\    /  \\
      /    \\__/    \\
     |  ◈       ◈  |
     |      __     |
      \\    /  \\   /
       \\  | ◡◡ | /
        \\_|____|_/
          /    \\
         /      \\`,
  // Bear
  `
     ʕ·͡ᴥ·ʔ━━━━━╗
     │ SCAV  ║
     │ ENGER ║
     ╰━━━━━━━╝
      /|    |\\
     / |    | \\
    (__\\ /\\/__) `,
  // Possum
  `
       _.---._
      /       \\
     | ◕   ◕  |
     |    △   |
      \\ \\___/ /
       '.___.'
      /|     |\\
     (_|     |_)
       \\     /
        \\   /`,
];

const SCAVENGERS_FILE = "scavengers.json";
const DOMAIN = "scavenger.bot";
const VERSION = "0.2.3";

// Find project root (where package.json is)
function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

// Get project name from package.json or fall back to directory name
function getProjectName(projectRoot) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return path.basename(projectRoot);
}

// URL regex patterns
const URL_PATTERNS = [
  /https?:\/\/[^\s"'`<>\]\)]+/g,
  /(?:href|src|url)=["']([^"']+)["']/gi,
];

// File extensions to scan
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".html", ".css", ".env"];
const IGNORE_DIRS = ["node_modules", ".git", ".next", "dist", "build", ".turbo"];

// Scan directory for files
function getFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!IGNORE_DIRS.includes(item)) {
          getFiles(fullPath, files);
        }
      } else if (SCAN_EXTENSIONS.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Skip permission errors
  }
  return files;
}

// Extract URLs from file content
function extractUrls(content) {
  const urls = new Set();
  for (const pattern of URL_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const url = match[1] || match[0];
      if (url && url.startsWith("http")) {
        // Clean up URL
        const cleanUrl = url.replace(/[,;)\]}>'"]+$/, "");
        urls.add(cleanUrl);
      }
    }
  }
  return Array.from(urls);
}

// Scan project for all links
function scanProject(projectRoot) {
  const files = getFiles(projectRoot);
  const links = {
    outbound: {},  // Links going out from this project
    internal: [],  // Internal links within project
    assets: [],    // Asset URLs (images, etc)
  };

  const seenUrls = new Set();

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const urls = extractUrls(content);
      const relativePath = path.relative(projectRoot, file);

      for (const url of urls) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        // Categorize the URL
        if (url.includes("localhost") || url.includes("127.0.0.1")) {
          links.internal.push({ url, source: relativePath });
        } else if (/\.(png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf)(\?|$)/i.test(url)) {
          links.assets.push({ url, source: relativePath });
        } else {
          // Extract domain for grouping
          try {
            const domain = new URL(url).hostname;
            if (!links.outbound[domain]) {
              links.outbound[domain] = [];
            }
            links.outbound[domain].push({ url, source: relativePath });
          } catch {
            // Invalid URL, skip
          }
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  return links;
}

// Create or load scavengers.json (silent mode available)
function loadOrCreateScavengers(projectRoot, silent = false) {
  const scavengersPath = path.join(projectRoot, SCAVENGERS_FILE);

  if (fs.existsSync(scavengersPath)) {
    try {
      return JSON.parse(fs.readFileSync(scavengersPath, "utf8"));
    } catch {
      if (!silent) console.log("  ⚠️  Corrupted scavengers.json, regenerating...");
    }
  }

  // First run - scan and create
  if (!silent) {
    console.log(randomColor() + ANIMALS[0] + colors.reset);
    console.log("  🔍 First run detected! Scanning project for links...\n");
  }

  const links = scanProject(projectRoot);
  const totalOutbound = Object.values(links.outbound).flat().length;

  const scavengers = {
    version: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    project: getProjectName(projectRoot),
    summary: {
      totalOutboundLinks: totalOutbound,
      totalDomains: Object.keys(links.outbound).length,
      totalAssets: links.assets.length,
      totalInternal: links.internal.length,
    },
    links,
  };

  fs.writeFileSync(scavengersPath, JSON.stringify(scavengers, null, 2));

  if (!silent) {
    console.log(`  ✅ Created ${SCAVENGERS_FILE}`);
    console.log(`  📊 Found ${totalOutbound} outbound links across ${Object.keys(links.outbound).length} domains`);
    console.log(`  🖼️  Found ${links.assets.length} asset links`);
    console.log(`  🔗 Found ${links.internal.length} internal links\n`);
  }

  return scavengers;
}

// Show random animal with domain and help hint
function showSplash() {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = randomColor();
  const helpColor = randomColor();

  console.log(color + animal + colors.reset);
  console.log();
  console.log(`  ${colors.bright}${DOMAIN}${colors.reset}`);
  console.log();
  console.log(`  ${helpColor}${colors.bright}Type "scavenger help" for commands${colors.reset}`);
  console.log();
}

// Display link list
function showLinkList(scavengers) {
  const color = randomColor();
  console.log(color + ANIMALS[0] + colors.reset);
  console.log();
  console.log("  SCAVENGER LINK REPORT");
  console.log("  " + "═".repeat(40));
  console.log(`  Project: ${scavengers.project}`);
  console.log(`  Updated: ${scavengers.updated}`);
  console.log();
  console.log("  📊 SUMMARY");
  console.log(`     Outbound Links: ${scavengers.summary.totalOutboundLinks}`);
  console.log(`     Domains: ${scavengers.summary.totalDomains}`);
  console.log(`     Assets: ${scavengers.summary.totalAssets}`);
  console.log(`     Internal: ${scavengers.summary.totalInternal}`);
  console.log();
  console.log("  🌐 OUTBOUND BY DOMAIN");

  const domains = Object.entries(scavengers.links.outbound)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);

  for (const [domain, links] of domains) {
    console.log(`     ${domain}: ${links.length} links`);
  }

  if (Object.keys(scavengers.links.outbound).length > 15) {
    console.log(`     ... and ${Object.keys(scavengers.links.outbound).length - 15} more domains`);
  }
  console.log();
}

// Refresh/farm links
function farmLinks(projectRoot) {
  const color = randomColor();
  console.log(color + ANIMALS[0] + colors.reset);
  console.log();
  console.log("  🌾 LINK FARMING");
  console.log("  " + "═".repeat(40));
  console.log("  Rescanning project for new links...\n");

  const links = scanProject(projectRoot);
  const totalOutbound = Object.values(links.outbound).flat().length;

  const scavengersPath = path.join(projectRoot, SCAVENGERS_FILE);
  let oldScavengers = null;

  if (fs.existsSync(scavengersPath)) {
    try {
      oldScavengers = JSON.parse(fs.readFileSync(scavengersPath, "utf8"));
    } catch {}
  }

  const scavengers = {
    version: "1.0.0",
    created: oldScavengers?.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    project: getProjectName(projectRoot),
    summary: {
      totalOutboundLinks: totalOutbound,
      totalDomains: Object.keys(links.outbound).length,
      totalAssets: links.assets.length,
      totalInternal: links.internal.length,
    },
    links,
  };

  fs.writeFileSync(scavengersPath, JSON.stringify(scavengers, null, 2));

  if (oldScavengers) {
    const diff = totalOutbound - oldScavengers.summary.totalOutboundLinks;
    console.log(`  ✅ Updated ${SCAVENGERS_FILE}`);
    console.log(`  📊 ${diff >= 0 ? "+" : ""}${diff} links since last scan`);
  } else {
    console.log(`  ✅ Created ${SCAVENGERS_FILE}`);
  }

  console.log(`  📊 Total: ${totalOutbound} outbound links`);
  console.log();
}

// Break/remove tracking for specific domain
function breakLinks(projectRoot, target) {
  const color = randomColor();

  if (!target) {
    console.log(color + ANIMALS[0] + colors.reset);
    console.log();
    console.log("  Usage: scavenger link break <domain>");
    console.log("  Example: scavenger link break google.com");
    return;
  }

  const scavengersPath = path.join(projectRoot, SCAVENGERS_FILE);
  if (!fs.existsSync(scavengersPath)) {
    console.log(color + ANIMALS[0] + colors.reset);
    console.log();
    console.log("  ⚠️  No scavengers.json found. Run 'scavenger link farm' first.");
    return;
  }

  const scavengers = JSON.parse(fs.readFileSync(scavengersPath, "utf8"));

  if (scavengers.links.outbound[target]) {
    const count = scavengers.links.outbound[target].length;
    delete scavengers.links.outbound[target];
    scavengers.summary.totalDomains = Object.keys(scavengers.links.outbound).length;
    scavengers.summary.totalOutboundLinks = Object.values(scavengers.links.outbound).flat().length;
    scavengers.updated = new Date().toISOString();

    fs.writeFileSync(scavengersPath, JSON.stringify(scavengers, null, 2));

    console.log(color + ANIMALS[0] + colors.reset);
    console.log();
    console.log(`  ✅ Removed ${count} links from ${target}`);
  } else {
    console.log(color + ANIMALS[0] + colors.reset);
    console.log();
    console.log(`  ⚠️  Domain '${target}' not found in tracked links.`);
  }
}

// Detailed help menu
function showHelp() {
  const color = randomColor();
  console.log(color + ANIMALS[0] + colors.reset);
  console.log();
  console.log(`  ${colors.bright}SCAVENGER CLI v${VERSION}${colors.reset}`);
  console.log(`  ${colors.cyan}${DOMAIN}${colors.reset}`);
  console.log();
  console.log("  " + "═".repeat(50));
  console.log();
  console.log(`  ${colors.bright}${colors.yellow}WHAT IS SCAVENGER?${colors.reset}`);
  console.log();
  console.log("  Scavenger tracks all outbound links in your project.");
  console.log("  Know exactly where your code points to - APIs, CDNs,");
  console.log("  documentation, and third-party services.");
  console.log();
  console.log(`  ${colors.bright}${colors.green}COMMANDS${colors.reset}`);
  console.log();
  console.log(`  ${colors.cyan}scavenger link list${colors.reset}`);
  console.log("      Show all tracked outbound links grouped by domain.");
  console.log("      Displays summary stats and top domains.");
  console.log();
  console.log(`  ${colors.cyan}scavenger link farm${colors.reset}`);
  console.log("      Rescan your entire project for links.");
  console.log("      Updates scavengers.json with new/removed links.");
  console.log("      Run this after adding new dependencies or code.");
  console.log();
  console.log(`  ${colors.cyan}scavenger link break <domain>${colors.reset}`);
  console.log("      Stop tracking a specific domain.");
  console.log("      Example: scavenger link break analytics.google.com");
  console.log();
  console.log(`  ${colors.cyan}scavenger agent${colors.reset} ${colors.yellow}(coming soon)${colors.reset}`);
  console.log("      AI-powered link analysis and recommendations.");
  console.log();
  console.log(`  ${colors.cyan}scavenger sell <price> <volume>${colors.reset} ${colors.yellow}(coming soon)${colors.reset}`);
  console.log("      Marketplace features for link trading.");
  console.log();
  console.log(`  ${colors.bright}${colors.magenta}FILES${colors.reset}`);
  console.log();
  console.log("  scavengers.json    Created in project root on first run.");
  console.log("                     Contains all discovered links.");
  console.log("                     Commit this to track link changes.");
  console.log();
  console.log(`  ${colors.bright}${colors.blue}OPTIONS${colors.reset}`);
  console.log();
  console.log("  --help, -h, help   Show this help message");
  console.log("  --version, -v      Show version number");
  console.log();
}

// Main
const projectRoot = findProjectRoot();

// No command - show splash only
if (!command) {
  loadOrCreateScavengers(projectRoot, true);
  showSplash();
  process.exit(0);
}

// Help command
if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(`scavenger v${VERSION}`);
  process.exit(0);
}

if (command === 'link') {
  if (subcommand === 'list') {
    const scavengers = loadOrCreateScavengers(projectRoot);
    showLinkList(scavengers);
  } else if (subcommand === 'farm') {
    farmLinks(projectRoot);
  } else if (subcommand === 'break') {
    breakLinks(projectRoot, args[2]);
  } else {
    const color = randomColor();
    console.log(color + ANIMALS[0] + colors.reset);
    console.log();
    console.log('  Usage: scavenger link <list|farm|break>');
    console.log();
    console.log('  Run "scavenger help" for more info.');
  }
  process.exit(0);
}

if (command === 'agent') {
  loadOrCreateScavengers(projectRoot, true);
  const color = randomColor();
  console.log(color + ANIMALS[0] + colors.reset);
  console.log();
  console.log(`  ${colors.yellow}[AGENT] Coming soon...${colors.reset}`);
  console.log("  Scavengers are preparing this feature.");
  console.log();
  process.exit(0);
}

if (command === 'sell') {
  const price = args[1];
  const volume = args[2];
  loadOrCreateScavengers(projectRoot, true);
  const color = randomColor();
  console.log(color + ANIMALS[0] + colors.reset);
  console.log();
  if (!price || !volume) {
    console.log('  Usage: scavenger sell <price> <volume>');
  } else {
    console.log(`  ${colors.yellow}[SELL] Coming soon...${colors.reset}`);
    console.log(`  Price: ${price}, Volume: ${volume}`);
  }
  console.log();
  process.exit(0);
}

// Unknown command - show splash with hint
showSplash();
console.log(`  ${colors.red}Unknown command: ${command}${colors.reset}`);
console.log();
