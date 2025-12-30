# @_scavengers/cli

Scavenger CLI - Track and manage all backlinks in your project.

## Usage

```bash
npx @_scavengers/cli
```

## Commands

```
scavenger link list              List all tracked links
scavenger link farm              Scan project and update scavengers.json
scavenger link break <domain>    Remove domain from tracking
scavenger agent                  Start scavenger agent (coming soon)
scavenger sell <price> <vol>     Sell command (coming soon)
```

## How It Works

On first run, Scavenger scans your entire project for outbound links and creates a `scavengers.json` file in your project root containing:

- **Outbound links** - All external URLs grouped by domain
- **Internal links** - localhost/127.0.0.1 references
- **Asset links** - Images, videos, PDFs, etc.

## Example Output

```
  SCAVENGER LINK REPORT
  ════════════════════════════════════════
  Project: my-project
  Updated: 2025-12-30T03:14:11.458Z

  📊 SUMMARY
     Outbound Links: 30
     Domains: 18
     Assets: 0
     Internal: 3

  🌐 OUTBOUND BY DOMAIN
     github.com: 5 links
     example.com: 3 links
     ...
```

## The Raccoon

```
       /\     /\
      /  \___/  \
     / ◈ ═══ ◈  \
    /  ╔═════╗   \
   │   ║ ▼▼▼ ║   │
   │   ╚══●══╝   │
    \    ═══    /
     ╲_________╱
    ╱│░░░░░░░░│╲
   ╱ │▓▓▓▓▓▓▓▓│ ╲
  ╱══╧════════╧══╲
```

## Coming Soon

More scavenger features...

---

Made with trash by scavengers.
