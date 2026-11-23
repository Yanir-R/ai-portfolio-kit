#!/usr/bin/env bash
# Hygiene check: fails when a tracked text file contains something that must
# never be published. Every check matches a shape, never a name.
#
#   a) private paths          home and user directories, the workspace root
#   b) private IPv4           private and shared (CGNAT) address ranges
#   c) internal hostnames     internal-only suffixes, in URL or host context
#   d) internal identifiers   UUID-shaped strings
#   e) credential shapes      API keys, tokens, private keys, quoted secrets
#
# Usage, from anywhere:  bash .github/scripts/check_hygiene.sh
# Exceptions:            .github/hygiene-allowlist.txt (one ERE per line)
# Requires:              bash 5, GNU grep, git
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

self='.github/scripts/check_hygiene.sh'
allowlist='.github/hygiene-allowlist.txt'

git rev-parse --is-inside-work-tree > /dev/null

# --- files: tracked only, minus this script and the allowlist ---------------

files=()
while IFS= read -r -d '' path; do
  if [ "$path" = "$self" ] || [ "$path" = "$allowlist" ]; then
    continue
  fi
  # A tracked file can be deleted in the working tree.
  if [ ! -f "$path" ]; then
    continue
  fi
  files+=("$path")
done < <(git ls-files -z)

if [ "${#files[@]}" -eq 0 ]; then
  echo "Hygiene check passed."
  exit 0
fi

# --- allowlist: one ERE per line, blank lines and # comments ignored --------

allow=()
skip_re='^[[:space:]]*(#|$)'
if [ -f "$allowlist" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ $skip_re ]]; then
      continue
    fi
    allow+=("$line")
  done < "$allowlist"
fi

# --- scanning ----------------------------------------------------------------

pending=''
report=''

# collect <s|i> <pattern>...
# Greps every file for the patterns (s: case-sensitive, i: case-insensitive),
# drops allowlisted hits and appends the rest to $pending.
collect() {
  local mode="$1"
  shift
  local opts=(-I -H -n -E)
  if [ "$mode" = i ]; then
    opts+=(-i)
  fi
  local pattern
  for pattern in "$@"; do
    opts+=(-e "$pattern")
  done

  # grep exits 1 when nothing matches, which is the normal case here.
  local hits
  hits="$(printf '%s\0' "${files[@]}" | xargs -0 grep "${opts[@]}" -- || true)"

  local entry
  for entry in "${allow[@]}"; do
    if [ -z "$hits" ]; then
      break
    fi
    hits="$(printf '%s\n' "$hits" | grep -v -E -e "$entry" || true)"
  done

  if [ -n "$hits" ]; then
    pending+="$hits"$'\n'
  fi
}

# flush <label>: moves $pending into the report under its check label.
flush() {
  if [ -n "$pending" ]; then
    report+="== $1 =="$'\n'"$pending"$'\n'
  fi
  pending=''
}

# --- a) private paths --------------------------------------------------------

collect s \
  '(^|[^A-Za-z0-9_])/(home|Users)/[A-Za-z0-9_][A-Za-z0-9_.-]*' \
  '(^|[^A-Za-z0-9_.-])/(workspace)(/|[^A-Za-z0-9_.-]|$)' \
  '[A-Za-z]:\\+(Users)\\'
flush 'private paths'

# --- b) private IPv4 ---------------------------------------------------------
# Loopback and the unspecified address are outside every range below.

octet='[0-9]{1,3}'
before='(^|[^0-9.])'
after='([^0-9]|$)'
tail="\\.${octet}\\.${octet}${after}"

collect s \
  "${before}10\\.${octet}${tail}" \
  "${before}192\\.168${tail}" \
  "${before}172\\.(1[6-9]|2[0-9]|3[01])${tail}" \
  "${before}100\\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])${tail}"
flush 'private IPv4'

# --- c) internal hostnames ---------------------------------------------------
# Only after "://" or "@", so file names that merely contain one of these
# suffixes are not hosts and do not match.

host_end='([^A-Za-z0-9._-]|$)'

collect i \
  "(://|@)[A-Za-z0-9._-]*\\.(internal|local|lan|corp|intranet|home\\.arpa)${host_end}" \
  "(://|@)([A-Za-z0-9_-]+\\.)+ts\\.net${host_end}"
flush 'internal hostnames'

# --- d) internal identifiers -------------------------------------------------

hex='[0-9A-Fa-f]'

collect s \
  "(^|[^0-9A-Fa-f-])${hex}{8}-${hex}{4}-${hex}{4}-${hex}{4}-${hex}{12}([^0-9A-Fa-f-]|\$)"
flush 'internal identifiers'

# --- e) credential shapes ----------------------------------------------------

collect s \
  'sk-ant-[A-Za-z0-9_-]{10,}' \
  '(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}' \
  'gh[pos]_[A-Za-z0-9]{30,}' \
  'github_pat_[A-Za-z0-9_]{20,}' \
  '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}' \
  '(^|[^A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}' \
  'xox[abprs]-[A-Za-z0-9-]{10,}' \
  '-{5}BEGIN [A-Z ]*PRIVATE KEY'

# A secret-named key assigned to a quoted literal of 12+ characters, no spaces.
quote="[\"']"
collect i \
  "(password|passwd|secret|api_key|apikey|token)${quote}?[[:space:]]*[:=][[:space:]]*${quote}[^\"'[:space:]]{12,}${quote}"
flush 'credential shapes'

# --- result ------------------------------------------------------------------

if [ -n "$report" ]; then
  echo "Hygiene check failed. Remove or replace these, or add an entry with a"
  echo "reason comment to $allowlist:"
  echo
  printf '%s' "$report"
  exit 1
fi

echo "Hygiene check passed."
exit 0
