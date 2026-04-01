# EverPrompt Capture — Claude CLI Plugin

Automatically captures prompts from Claude CLI to your EverPrompt instance for analysis, scoring, and organization.

## What It Does

Every prompt you send in Claude CLI is transparently forwarded to your EverPrompt server. The AI pipeline then:

- Generates a title and abstract
- Assigns tags and a category
- Scores prompt quality (0-100) with a quality band (A/B/C/D)
- Creates an improved version
- Makes the prompt searchable (keyword + semantic)

Captured prompts appear in your EverPrompt **Inbox** for review and organization.

The capture is **completely non-blocking** — it runs in the background and never delays your prompt. If the API is unreachable, the prompt is silently skipped. No errors are ever surfaced during normal use.

## Installation

Copy the plugin folder to your Claude CLI plugins directory:

```bash
cp -r everprompt-capture ~/.claude/plugins/everprompt-capture
```

Or create a symlink for development:

```bash
ln -s /path/to/everprompt-capture ~/.claude/plugins/everprompt-capture
```

Claude CLI will automatically discover the plugin on next launch.

## Configuration

### 1. Generate an API Key

1. Open your EverPrompt web UI (e.g., `https://everprompt.example.com`)
2. Navigate to **Settings > API Keys**
3. Click **Generate New Key**
4. Give it a name like "Claude CLI"
5. Copy the key (it starts with `ep_`)

### 2. Configure the Plugin

Use the built-in slash command:

```
/ep-config set api_url https://everprompt.example.com
/ep-config set api_key ep_your_key_here
/ep-config set enabled true
```

Or edit `settings.local.md` directly in the plugin folder:

```yaml
---
enabled: true
api_url: https://everprompt.example.com
api_key: ep_abc123def456ghi789jkl012mno345
default_project: my-project
min_length: 50
exclude_patterns: /help /clear /config
---
```

### 3. Verify

Run `/ep-config` (or `/ep-config status`) in Claude CLI to see your current configuration.

## Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Master switch for capture | `false` |
| `api_url` | Base URL of your EverPrompt instance | `https://everprompt.yourdomain.com` |
| `api_key` | API key from EverPrompt web UI | `ep_REPLACE_ME` |
| `default_project` | Project slug to assign to captured prompts | (empty) |
| `min_length` | Minimum character length to capture a prompt | `50` |
| `exclude_patterns` | Space-separated prefixes to skip | `/help /clear /config` |

## How It Works

```
You write a prompt in Claude CLI
  -> Hook "user-prompt-submit" fires
  -> capture-prompt.sh receives the prompt text via stdin
  -> Guards check: enabled? configured? long enough? not excluded?
  -> POST /api/v1/prompts/ingest sent in background (fire-and-forget)
  -> EverPrompt saves with status=inbox, triggers AI pipeline
  -> Prompt appears in your Inbox with title, tags, score
```

## Plugin Structure

```
everprompt-capture/
  plugin.json              Plugin manifest
  hooks/
    capture-prompt.sh      Hook script (user-prompt-submit)
  commands/
    ep-config.md           Slash command for configuration
  settings.local.md        User settings (YAML frontmatter, gitignored)
  README.md                This file
```

## Troubleshooting

### Prompts are not appearing in EverPrompt

1. **Check enabled status:** Run `/ep-config` and verify `enabled` is `true`
2. **Check API URL:** Ensure `api_url` is correct and reachable from your machine
3. **Check API key:** Ensure `api_key` is valid and starts with `ep_`
4. **Check min_length:** Your prompt might be shorter than the configured minimum (default: 50 characters)
5. **Check exclude_patterns:** Your prompt might start with an excluded prefix
6. **Check curl:** The hook requires `curl` to be available on your PATH

### Manual test

You can test the connection manually:

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ep_your_key_here" \
  -d '{"body":"Test prompt from CLI plugin","source":"plugin"}' \
  https://everprompt.example.com/api/v1/prompts/ingest
```

### Hook script syntax check

```bash
bash -n ~/.claude/plugins/everprompt-capture/hooks/capture-prompt.sh && echo "OK"
```

### The plugin does not load

- Ensure `plugin.json` is valid JSON: `cat plugin.json | jq .`
- Ensure the plugin is in `~/.claude/plugins/` (or your configured plugins directory)
- Restart Claude CLI after adding the plugin

## Security Notes

- The `settings.local.md` file contains your API key. The `.local.md` suffix is gitignored by convention.
- API keys should have minimal permissions — `ingest` is sufficient for the capture plugin.
- The hook never logs or displays prompt content or API keys.
- All API communication uses HTTPS with Bearer token authentication.

## License

Part of the EverPrompt project.
