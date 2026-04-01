#!/usr/bin/env bash
# ==============================================================================
# EverPrompt Capture Hook — capture-prompt.sh
#
# Fires on user-prompt-submit. Reads the prompt from stdin and sends it to the
# EverPrompt API for ingestion. Runs fire-and-forget so it never blocks the
# user's prompt flow. Always exits 0.
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
SETTINGS_FILE="${PLUGIN_ROOT}/settings.local.md"

# ---------------------------------------------------------------------------
# Read prompt body from stdin (non-blocking, with timeout)
# ---------------------------------------------------------------------------
PROMPT_BODY=""
if [ -t 0 ]; then
  # stdin is a terminal — nothing piped in
  exit 0
fi
PROMPT_BODY="$(cat)" || true

# If empty, nothing to capture
if [ -z "${PROMPT_BODY}" ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Parse settings from YAML frontmatter in settings.local.md
#
# The file uses YAML frontmatter delimited by --- lines. We extract key-value
# pairs with portable tools (sed/grep/awk). No dependency on yq or python.
# ---------------------------------------------------------------------------
parse_setting() {
  local key="$1"
  local default="$2"
  local value

  if [ ! -f "${SETTINGS_FILE}" ]; then
    echo "${default}"
    return
  fi

  # Extract YAML frontmatter (between first pair of --- lines)
  # Then grep for the key and extract the value after the colon
  value="$(sed -n '/^---$/,/^---$/p' "${SETTINGS_FILE}" \
    | grep -E "^${key}:" \
    | head -1 \
    | sed "s/^${key}:[[:space:]]*//" \
    | sed 's/[[:space:]]*$//' \
    | sed 's/^["'"'"']//;s/["'"'"']$//')" || true

  if [ -z "${value}" ]; then
    echo "${default}"
  else
    echo "${value}"
  fi
}

# Read all settings
ENABLED="$(parse_setting "enabled" "false")"
API_URL="$(parse_setting "api_url" "")"
API_KEY="$(parse_setting "api_key" "")"
DEFAULT_PROJECT="$(parse_setting "default_project" "")"
MIN_LENGTH="$(parse_setting "min_length" "50")"
EXCLUDE_PATTERNS="$(parse_setting "exclude_patterns" "")"

# ---------------------------------------------------------------------------
# Guard: plugin disabled
# ---------------------------------------------------------------------------
if [ "${ENABLED}" != "true" ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Guard: API URL or API key not configured
# ---------------------------------------------------------------------------
if [ -z "${API_URL}" ] || [ "${API_URL}" = "https://everprompt.yourdomain.com" ]; then
  exit 0
fi

if [ -z "${API_KEY}" ] || [ "${API_KEY}" = "ep_REPLACE_ME" ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Guard: curl must be available
# ---------------------------------------------------------------------------
if ! command -v curl >/dev/null 2>&1; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Guard: prompt too short
# ---------------------------------------------------------------------------
PROMPT_LENGTH="${#PROMPT_BODY}"
if [ "${PROMPT_LENGTH}" -lt "${MIN_LENGTH}" ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Guard: prompt matches an exclude pattern
#
# exclude_patterns is a space-separated list of patterns. If the prompt
# starts with any of them, skip capture.
# ---------------------------------------------------------------------------
if [ -n "${EXCLUDE_PATTERNS}" ]; then
  # Trim leading/trailing whitespace from prompt for pattern matching
  PROMPT_TRIMMED="$(echo "${PROMPT_BODY}" | sed 's/^[[:space:]]*//')"
  for pattern in ${EXCLUDE_PATTERNS}; do
    case "${PROMPT_TRIMMED}" in
      "${pattern}"*) exit 0 ;;
    esac
  done
fi

# ---------------------------------------------------------------------------
# Build JSON payload
#
# We use printf + sed to escape the prompt body for JSON. This avoids a
# dependency on jq for the common case.
# ---------------------------------------------------------------------------
json_escape() {
  local s="$1"
  # Escape backslashes first, then other special chars
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  # Replace literal newlines with \n
  s="$(printf '%s' "$s" | awk '
    BEGIN { ORS="" }
    NR==1 { printf "%s", $0; next }
    { printf "\\n%s", $0 }
  ')"
  # Replace tabs with \t
  s="${s//$'\t'/\\t}"
  # Replace carriage returns
  s="${s//$'\r'/\\r}"
  printf '%s' "$s"
}

ESCAPED_BODY="$(json_escape "${PROMPT_BODY}")"

# Capture Claude session ID if available
SESSION_ID="${CLAUDE_SESSION_ID:-}"

PAYLOAD="{\"body_original\":\"${ESCAPED_BODY}\",\"source\":\"plugin\""

if [ -n "${DEFAULT_PROJECT}" ]; then
  PAYLOAD="${PAYLOAD},\"project_slug\":\"${DEFAULT_PROJECT}\""
fi

if [ -n "${SESSION_ID}" ]; then
  PAYLOAD="${PAYLOAD},\"session_id\":\"${SESSION_ID}\""
fi

PAYLOAD="${PAYLOAD}}"

# ---------------------------------------------------------------------------
# Send to EverPrompt API (fire-and-forget)
#
# We background the curl call and disown it so the hook returns immediately.
# Output is discarded — we never block the user or show errors.
# ---------------------------------------------------------------------------
(
  curl -s -o /dev/null -w "" \
    --max-time 10 \
    --connect-timeout 5 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "${PAYLOAD}" \
    "${API_URL}/api/v1/prompts/ingest" \
    2>/dev/null || true
) &
disown 2>/dev/null || true

exit 0
