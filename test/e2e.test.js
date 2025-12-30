#!/usr/bin/env node
/**
 * E2E Tests for Scavenger CLI
 *
 * Tests that the CLI actually works - not just that it runs,
 * but that it finds the right URLs, creates valid JSON, and
 * all commands produce correct output.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const CLI_PATH = path.join(__dirname, "..", "bin", "index.js");
const FIXTURES_PATH = path.join(__dirname, "fixtures");
const SCAVENGERS_PATH = path.join(FIXTURES_PATH, "scavengers.json");

// Expected URLs that MUST be found in fixtures
const EXPECTED_OUTBOUND = {
  "api.example.com": ["https://api.example.com/v1/users"],
  "docs.example.com": ["https://docs.example.com/getting-started"],
  "github.com": [
    "https://github.com/scavengers/cli",
    "https://github.com/scavengers/cli/issues"
  ],
  "google.com": [
    "https://google.com/search",
    "https://google.com/maps"
  ],
  "api.stripe.com": ["https://api.stripe.com/v1/charges"],
  "api.myservice.com": ["https://api.myservice.com/graphql"],
  "hooks.slack.com": ["https://hooks.slack.com/services/xxx"],
  "cdn.cloudflare.com": ["https://cdn.cloudflare.com/assets"],
  "docs.testproject.com": ["https://docs.testproject.com"],
  "testproject.com": ["https://testproject.com"],
  "api.testproject.com": ["https://api.testproject.com/docs"],
  "support.testproject.com": ["https://support.testproject.com/contact"],
};

const EXPECTED_INTERNAL = [
  "http://localhost:3000/api",
  "http://127.0.0.1:8080/health"
];

const EXPECTED_ASSETS = [
  "https://cdn.example.com/logo.png",
  "https://assets.example.com/intro.mp4"
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function assertContains(arr, item, msg) {
  if (!arr.includes(item)) {
    throw new Error(`${msg}: array does not contain "${item}"`);
  }
}

function assertHasKey(obj, key, msg) {
  if (!(key in obj)) {
    throw new Error(`${msg}: object missing key "${key}"`);
  }
}

function cleanup() {
  if (fs.existsSync(SCAVENGERS_PATH)) {
    fs.unlinkSync(SCAVENGERS_PATH);
  }
}

function runCli(args = "", cwd = FIXTURES_PATH) {
  return execSync(`node "${CLI_PATH}" ${args}`, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
}

// ============================================
// TEST SUITE
// ============================================

console.log("\n🦝 SCAVENGER CLI E2E TESTS\n");
console.log("=" .repeat(50));

// Clean up before tests
cleanup();

// --------------------------------------------
console.log("\n📁 TEST: First Run Detection");
// --------------------------------------------

test("Creates scavengers.json on first run", () => {
  runCli("link farm");
  if (!fs.existsSync(SCAVENGERS_PATH)) {
    throw new Error("scavengers.json was not created");
  }
});

test("scavengers.json is valid JSON", () => {
  const content = fs.readFileSync(SCAVENGERS_PATH, "utf8");
  JSON.parse(content); // Will throw if invalid
});

test("scavengers.json has required structure", () => {
  const data = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  assertHasKey(data, "version", "Missing version");
  assertHasKey(data, "created", "Missing created");
  assertHasKey(data, "updated", "Missing updated");
  assertHasKey(data, "project", "Missing project");
  assertHasKey(data, "summary", "Missing summary");
  assertHasKey(data, "links", "Missing links");
  assertHasKey(data.links, "outbound", "Missing links.outbound");
  assertHasKey(data.links, "internal", "Missing links.internal");
  assertHasKey(data.links, "assets", "Missing links.assets");
});

// --------------------------------------------
console.log("\n🔗 TEST: URL Extraction Accuracy");
// --------------------------------------------

const scavengers = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));

test("Finds all expected domains", () => {
  const foundDomains = Object.keys(scavengers.links.outbound);
  for (const domain of Object.keys(EXPECTED_OUTBOUND)) {
    if (!foundDomains.includes(domain)) {
      throw new Error(`Missing domain: ${domain}`);
    }
  }
});

test("Finds correct URLs for each domain", () => {
  for (const [domain, expectedUrls] of Object.entries(EXPECTED_OUTBOUND)) {
    const foundUrls = scavengers.links.outbound[domain]?.map(l => l.url) || [];
    for (const url of expectedUrls) {
      if (!foundUrls.includes(url)) {
        throw new Error(`Domain ${domain} missing URL: ${url}`);
      }
    }
  }
});

test("Correctly identifies internal URLs", () => {
  const internalUrls = scavengers.links.internal.map(l => l.url);
  for (const url of EXPECTED_INTERNAL) {
    assertContains(internalUrls, url, "Missing internal URL");
  }
});

test("Correctly identifies asset URLs", () => {
  const assetUrls = scavengers.links.assets.map(l => l.url);
  for (const url of EXPECTED_ASSETS) {
    assertContains(assetUrls, url, "Missing asset URL");
  }
});

test("Summary counts are accurate", () => {
  const totalOutbound = Object.values(scavengers.links.outbound).flat().length;
  assertEqual(
    scavengers.summary.totalOutboundLinks,
    totalOutbound,
    "Outbound count mismatch"
  );
  assertEqual(
    scavengers.summary.totalDomains,
    Object.keys(scavengers.links.outbound).length,
    "Domain count mismatch"
  );
  assertEqual(
    scavengers.summary.totalAssets,
    scavengers.links.assets.length,
    "Asset count mismatch"
  );
  assertEqual(
    scavengers.summary.totalInternal,
    scavengers.links.internal.length,
    "Internal count mismatch"
  );
});

// --------------------------------------------
console.log("\n📋 TEST: link list Command");
// --------------------------------------------

test("link list shows project name", () => {
  const output = runCli("link list");
  if (!output.includes("test-project")) {
    throw new Error("Output doesn't show project name");
  }
});

test("link list shows summary stats", () => {
  const output = runCli("link list");
  if (!output.includes("Outbound Links:")) {
    throw new Error("Output missing outbound links count");
  }
  if (!output.includes("Domains:")) {
    throw new Error("Output missing domains count");
  }
});

test("link list shows domain breakdown", () => {
  const output = runCli("link list");
  if (!output.includes("github.com")) {
    throw new Error("Output missing github.com domain");
  }
});

// --------------------------------------------
console.log("\n🌾 TEST: link farm Command");
// --------------------------------------------

test("link farm updates timestamp", () => {
  const before = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  const beforeTime = new Date(before.updated).getTime();

  // Wait a bit to ensure timestamp changes
  execSync("sleep 1");

  runCli("link farm");

  const after = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  const afterTime = new Date(after.updated).getTime();

  if (afterTime <= beforeTime) {
    throw new Error("Timestamp was not updated");
  }
});

test("link farm preserves created timestamp", () => {
  const before = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  runCli("link farm");
  const after = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));

  assertEqual(before.created, after.created, "Created timestamp changed");
});

// --------------------------------------------
console.log("\n🔨 TEST: link break Command");
// --------------------------------------------

test("link break removes domain", () => {
  const before = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  if (!before.links.outbound["google.com"]) {
    throw new Error("google.com not in outbound links to test removal");
  }

  runCli("link break google.com");

  const after = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  if (after.links.outbound["google.com"]) {
    throw new Error("google.com was not removed");
  }
});

test("link break updates counts", () => {
  const data = JSON.parse(fs.readFileSync(SCAVENGERS_PATH, "utf8"));
  const actualTotal = Object.values(data.links.outbound).flat().length;

  assertEqual(
    data.summary.totalOutboundLinks,
    actualTotal,
    "Outbound count not updated after break"
  );
  assertEqual(
    data.summary.totalDomains,
    Object.keys(data.links.outbound).length,
    "Domain count not updated after break"
  );
});

test("link break handles non-existent domain gracefully", () => {
  const output = runCli("link break nonexistent.fake.domain");
  if (!output.includes("not found")) {
    throw new Error("Should report domain not found");
  }
});

// --------------------------------------------
console.log("\n🎯 TEST: Edge Cases");
// --------------------------------------------

test("Handles help flag", () => {
  const output = runCli("--help");
  if (!output.includes("SCAVENGER CLI")) {
    throw new Error("Help output missing CLI title");
  }
});

test("Handles version flag", () => {
  const output = runCli("--version");
  if (!output.includes("scavenger v")) {
    throw new Error("Version output incorrect");
  }
});

test("Handles unknown command", () => {
  const output = runCli("unknowncommand");
  if (!output.includes("Usage:")) {
    throw new Error("Should show usage for unknown command");
  }
});

// ============================================
// RESULTS
// ============================================

console.log("\n" + "=".repeat(50));
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);

// Cleanup
cleanup();

if (failed > 0) {
  process.exit(1);
}
