---
description: Configure EverPrompt capture settings
arguments:
  - name: action
    description: "Action to perform: status, set, help"
    required: false
---

# EverPrompt Capture Configuration

You are helping the user configure the **EverPrompt Capture** plugin, which automatically sends prompts to their EverPrompt instance for analysis, scoring, and organization.

## Configuration File

Settings are stored in `${CLAUDE_PLUGIN_ROOT}/settings.local.md` as YAML frontmatter.

## Read Current Settings

First, read the current settings file to understand what is configured:

```
Read file: ${CLAUDE_PLUGIN_ROOT}/settings.local.md
```

## Actions

### If the user asks for "status" or runs `/ep-config` with no arguments:

Display the current configuration status in a clear format:

```
EverPrompt Capture — Configuration Status
==========================================
Enabled:          {enabled}
API URL:          {api_url}
API Key:          {api_key prefix}...{last 4 chars} (or "NOT SET" if ep_REPLACE_ME)
Default Project:  {default_project or "none"}
Min Length:        {min_length} characters
Exclude Patterns: {exclude_patterns}
```

If the API key is still `ep_REPLACE_ME` or enabled is `false`, show a setup guide:

> To get started:
> 1. Open your EverPrompt web UI at your configured `api_url`
> 2. Go to **Settings > API Keys**
> 3. Click **Generate New Key** and give it a name like "Claude CLI"
> 4. Copy the key (starts with `ep_`)
> 5. Run `/ep-config set api_key ep_your_key_here`
> 6. Run `/ep-config set api_url https://your-actual-domain.com`
> 7. Run `/ep-config set enabled true`

### If the user asks to "set" a setting:

The user will provide a key and value. Valid keys are:

- **enabled** — `true` or `false`. Whether capture is active.
- **api_url** — The base URL of their EverPrompt instance (no trailing slash).
- **api_key** — Their EverPrompt API key (starts with `ep_`).
- **default_project** — The project slug to assign captured prompts to. Leave empty for no default.
- **min_length** — Minimum prompt length (in characters) to capture. Default: 50.
- **exclude_patterns** — Space-separated list of prefixes to skip (e.g., `/help /clear /config`).

To update the setting, edit the YAML frontmatter in `${CLAUDE_PLUGIN_ROOT}/settings.local.md`. Update only the specified key, preserving all other values.

After updating, confirm the change by showing the updated value.

### If the user asks for "help":

Explain:

**What EverPrompt Capture does:**
- Every prompt you send in Claude CLI is automatically forwarded to your EverPrompt instance
- Prompts shorter than `min_length` characters or matching `exclude_patterns` are skipped
- Captured prompts arrive in your EverPrompt **Inbox** with status `inbox`
- The AI pipeline automatically analyzes each prompt: generates a title, abstract, tags, quality score, and an improved version
- You can review, organize, and search your prompt history from the EverPrompt web UI

**The capture is completely non-blocking:**
- The hook fires in the background and never delays your prompt
- If the API is unreachable, the prompt is silently skipped
- No errors are ever shown to you during normal use

**Example configuration:**

```yaml
---
enabled: true
api_url: https://everprompt.example.com
api_key: ep_abc123def456ghi789jkl012mno345
default_project: my-project
min_length: 50
exclude_patterns: /help /clear /config test hello
---
```

## Important Notes

- Never display the full API key in output. Show only the prefix and last 4 characters.
- The `settings.local.md` file is gitignored by convention (`.local.md` suffix) to protect secrets.
- Changes take effect immediately on the next prompt submission.
