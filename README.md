# browser-agents-lab

Four ways to let an LLM agent drive a browser, measured on identical tasks against a local web app.

| Contestant | What the model gets | Package |
|---|---|---|
| `mcp` | The official Playwright MCP server's tools, unchanged | `@playwright/mcp` |
| `pw-cli` | One bash tool + Microsoft's `playwright-cli` and its skill file | `@playwright/cli` |
| `pw-script` | One bash tool; it writes and runs Playwright scripts | `playwright` |
| `cua` | Screenshots in, mouse and keyboard out (Anthropic computer toolset) | `computer_toolset_20260801` |
| `stagehand` | `navigate` / `act` / `observe` / `extract` backed by Stagehand v4 | `@browserbasehq/stagehand` |

All five share one model loop (`harness/loop.mjs`), one system prompt core, one task text and the same limits
(`harness/config.mjs`). The target is `app/server.mjs`, a dependency-free "Backoffice" app whose state is rebuilt
from a seed for every run. Scoring reads the app's in-memory state directly (`tasks/tasks.mjs`), never an LLM judge.

```bash
npm install
npx playwright install chromium
npm run selftest          # no model calls: scripted solution passes, scripted mistake fails, no-op fails
node harness/run.mjs --tasks 03,07 --contestants mcp,pw-cli,pw-script,cua,stagehand --model claude-haiku-5-5 --tag pilot --budget 1
node harness/report.mjs --tag pilot
```

Keys live in a git-ignored `.env` (`ANTHROPIC_API_KEY`). Shell-driving agents run inside a macOS seatbelt sandbox
(`harness/sandbox.mjs`): no API keys in their environment, no writes under `/Users`, no reads of the home folder
beyond `node_modules`, Node and Playwright's browser cache, no network beyond localhost.

Results append to `results/runs.jsonl`; full transcripts are under `results/raw/<run_id>/`.
