#!/bin/bash
# ThingsBoard Auto Token Manager
#
# Wajib set environment (atau di .env root repo):
#   TB_HOST  contoh: http://<thingsboard-host>:<port>
#   TB_USER
#   TB_PASS
#
# Usage:
#   source scripts/tb_token.sh          -> set $TB_TOKEN di shell session
#   ./scripts/tb_token.sh               -> print token
#   ./scripts/tb_token.sh refresh       -> force refresh pakai refreshToken

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

# Ambil TB_* dari .env jika belum di-set di environment
if [[ -f "$ENV_FILE" ]]; then
  for key in TB_HOST TB_USER TB_PASS; do
    if [[ -z "${!key}" ]]; then
      val=$(grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d'=' -f2- | tr -d '\r' | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
      [[ -n "$val" ]] && export "$key=$val"
    fi
  done
fi

TOKEN_FILE="${TB_TOKEN_FILE:-$HOME/.tb_token}"
REFRESH_FILE="${TB_REFRESH_FILE:-$HOME/.tb_refresh_token}"

require_env() {
  local missing=()
  [[ -z "$TB_HOST" ]] && missing+=(TB_HOST)
  [[ -z "$TB_USER" ]] && missing+=(TB_USER)
  [[ -z "$TB_PASS" ]] && missing+=(TB_PASS)
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: env belum di-set: ${missing[*]}" >&2
    return 1
  fi
}

json_field() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))" 2>/dev/null
}

is_token_valid() {
  local token="$1"
  [[ -z "$token" ]] && return 1

  local payload
  payload=$(echo "$token" | cut -d'.' -f2 | tr '_-' '/+')
  local mod=$((${#payload} % 4))
  [[ $mod -eq 2 ]] && payload="${payload}=="
  [[ $mod -eq 3 ]] && payload="${payload}="

  local exp now
  exp=$(echo "$payload" | base64 -d 2>/dev/null | json_field exp)
  now=$(date +%s)

  # Valid jika belum expired (buffer 60 detik)
  [[ -n "$exp" && "$exp" -gt $((now + 60)) ]]
}

save_tokens() {
  local token="$1" refresh="$2"
  ( umask 077; echo "$token" > "$TOKEN_FILE" )
  [[ -n "$refresh" ]] && ( umask 077; echo "$refresh" > "$REFRESH_FILE" )
  echo "$token"
}

do_login() {
  require_env || return 1
  local resp token refresh
  resp=$(curl -s -X POST "${TB_HOST}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TB_USER}\",\"password\":\"${TB_PASS}\"}")

  token=$(echo "$resp" | json_field token)
  refresh=$(echo "$resp" | json_field refreshToken)

  if [[ -z "$token" ]]; then
    echo "ERROR: Login gagal. Cek TB_HOST / TB_USER / TB_PASS" >&2
    return 1
  fi
  save_tokens "$token" "$refresh"
}

do_refresh() {
  require_env || return 1
  local refresh
  refresh=$(cat "$REFRESH_FILE" 2>/dev/null)
  if [[ -z "$refresh" ]]; then
    do_login
    return
  fi

  local resp token new_refresh
  resp=$(curl -s -X POST "${TB_HOST}/api/auth/token" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"${refresh}\"}")

  token=$(echo "$resp" | json_field token)
  new_refresh=$(echo "$resp" | json_field refreshToken)

  if [[ -z "$token" ]]; then
    do_login   # refreshToken expired -> login ulang
    return
  fi
  save_tokens "$token" "$new_refresh"
}

get_token() {
  local force="${1:-}"
  local cached_token
  cached_token=$(cat "$TOKEN_FILE" 2>/dev/null)

  if [[ "$force" == "refresh" ]]; then
    do_refresh
    return
  fi

  if is_token_valid "$cached_token"; then
    echo "$cached_token"
  elif is_token_valid "$(cat "$REFRESH_FILE" 2>/dev/null)"; then
    do_refresh
  else
    do_login
  fi
}

# Jika di-source, export TB_TOKEN ke shell session
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  if TB_TOKEN=$(get_token "$1"); then
    export TB_TOKEN
    echo "TB_TOKEN exported. Valid token: ${TB_TOKEN:0:30}..."
  fi
else
  get_token "$1"
fi
