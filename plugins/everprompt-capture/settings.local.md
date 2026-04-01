---
enabled: false
api_url: https://everprompt.yourdomain.com
api_key: ep_REPLACE_ME
default_project:
min_length: 50
exclude_patterns: /help /clear /config
---

# EverPrompt Capture Settings

This file configures the EverPrompt Capture plugin for Claude CLI.

## Setup

1. Set `api_url` to your EverPrompt instance URL
2. Generate an API key from **Settings > API Keys** in the EverPrompt web UI
3. Set `api_key` to your generated key
4. Set `enabled` to `true`

## Settings Reference

| Key | Description | Default |
|-----|-------------|---------|
| `enabled` | Whether capture is active | `false` |
| `api_url` | Base URL of your EverPrompt instance | `https://everprompt.yourdomain.com` |
| `api_key` | Your EverPrompt API key (starts with `ep_`) | `ep_REPLACE_ME` |
| `default_project` | Project slug for captured prompts | (empty) |
| `min_length` | Minimum prompt length to capture (chars) | `50` |
| `exclude_patterns` | Space-separated prefixes to skip | `/help /clear /config` |

Use `/ep-config` in Claude CLI to manage these settings interactively.
