#!/usr/bin/env bash
set -euo pipefail

# career-ops batch runner — OpenClaw-friendly standalone orchestrator
# Reads batch-input.tsv, runs worker commands, tracks state in batch-state.tsv for resumability.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# CLI + env defaults
WORKER_COMMAND="${CAREER_OPS_BATCH_WORKER_COMMAND:-}"
PROJECT_DIR="${CAREER_OPS_PROJECT_ROOT:-$(pwd)}"

if [[ -n "${CAREER_OPS_PROJECT_ROOT:-}" && -d "$CAREER_OPS_PROJECT_ROOT" ]]; then
  PROJECT_DIR="$(cd "$CAREER_OPS_PROJECT_ROOT" && pwd)"
fi

set_paths() {
  if [[ -d "$PROJECT_DIR/batch" ]]; then
    BATCH_DIR="$PROJECT_DIR/batch"
  else
    BATCH_DIR="$SCRIPT_DIR"
  fi
  INPUT_FILE="$BATCH_DIR/batch-input.tsv"
  STATE_FILE="$BATCH_DIR/batch-state.tsv"
  PROMPT_FILE="$BATCH_DIR/batch-prompt.md"
  LOGS_DIR="$BATCH_DIR/logs"
  TRACKER_DIR="$BATCH_DIR/tracker-additions"
  REPORTS_DIR="$PROJECT_DIR/reports"
  LOCK_FILE="$BATCH_DIR/batch-runner.pid"
}

set_paths

# Defaults
PARALLEL=1
DRY_RUN=false
RETRY_FAILED=false
START_FROM=0
MAX_RETRIES=2

usage() {
  cat <<'USAGE'
career-ops batch runner — process job offers in batch via external worker command

Usage: batch-runner.sh [OPTIONS]

Options:
  --project-root PATH   Optional project root (default: CAREER_OPS_PROJECT_ROOT or cwd)
  --parallel N          Number of parallel workers (default: 1)
  --dry-run             Show what would be processed, don't execute
  --retry-failed        Only retry offers marked as "failed" in state
  --start-from N        Start from offer ID N (skip earlier IDs)
  --max-retries N       Max retry attempts per offer (default: 2)
  -h, --help            Show this help

Note:
  Set CAREER_OPS_BATCH_WORKER_COMMAND to the executable used per offer.
  The worker command must accept the generated prompt text as its first argument.
  A recommended pattern is to point it at a wrapper script that runs your
  OpenClaw-native skill flow with the provided arguments.

Environment:
  CAREER_OPS_BATCH_WORKER_COMMAND  Required. Worker executable for one offer.
  CAREER_OPS_PROJECT_ROOT          Optional. Project directory containing data/ and batch/.

Files:
  batch/batch-input.tsv      Input offers (id, url, source, notes)
  batch/batch-state.tsv      Processing state (auto-managed)
  batch/batch-prompt.md      Prompt template for workers
  logs/                     Per-offer logs
  tracker-additions/        Tracker lines for post-batch merge
USAGE
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_DIR="$(cd "$2" && pwd)"
      set_paths
      shift 2
      ;;
    --parallel) PARALLEL="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --retry-failed) RETRY_FAILED=true; shift ;;
    --start-from) START_FROM="$2"; shift 2 ;;
    --max-retries) MAX_RETRIES="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# Ensure root/batch can resolve to a deterministic runtime directory
if [[ ! -f "$PROJECT_DIR/cv.md" ]] && [[ ! -f "$PROJECT_DIR/data/applications.md" ]] && [[ ! -d "$PROJECT_DIR/templates" ]]; then
  if [[ -f "$SCRIPT_DIR/batch-input.tsv" ]]; then
    # fallback to bundled scripts batch folder if this is a clean standalone run
    PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
    set_paths
  fi
fi

if [[ -d "$PROJECT_DIR/batch" ]]; then
  BATCH_DIR="$PROJECT_DIR/batch"
else
  BATCH_DIR="$SCRIPT_DIR"
fi

# Recompute after possible PROJECT_DIR fallback
set_paths

# Lock file to prevent double execution
acquire_lock() {
  if [[ -f "$LOCK_FILE" ]]; then
    local old_pid
    old_pid=$(cat "$LOCK_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "ERROR: Another batch-runner is already running (PID $old_pid)"
      echo "If this is stale, remove $LOCK_FILE"
      exit 1
    else
      echo "WARN: Stale lock file found (PID $old_pid not running). Removing."
      rm -f "$LOCK_FILE"
    fi
  fi
  echo $$ > "$LOCK_FILE"
}

release_lock() {
  rm -f "$LOCK_FILE"
}

trap release_lock EXIT

check_worker_command() {
  if [[ -z "$WORKER_COMMAND" ]]; then
    echo "ERROR: CAREER_OPS_BATCH_WORKER_COMMAND is not set."
    echo "Set it to a worker executable (script or command) that performs one offer."
    echo "Example:"
    echo "  export CAREER_OPS_BATCH_WORKER_COMMAND=\"/path/to/worker.sh\""
    return 1
  fi

  local first_token
  read -r -a worker_parts <<< "$WORKER_COMMAND"
  first_token="${worker_parts[0]}"
  if ! command -v "$first_token" &>/dev/null; then
    echo "ERROR: Worker command not found on PATH: $first_token"
    return 1
  fi
  return 0
}

# Validate prerequisites
check_prerequisites() {
  if [[ ! -f "$INPUT_FILE" ]]; then
    echo "ERROR: $INPUT_FILE not found. Add offers first."
    exit 1
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: $PROMPT_FILE not found."
    exit 1
  fi

  if ! check_worker_command; then
    echo "Batch processing paused until worker command is configured."
    exit 1
  fi

  mkdir -p "$LOGS_DIR" "$TRACKER_DIR" "$REPORTS_DIR"
}

# Initialize state file if it doesn't exist
init_state() {
  if [[ ! -f "$STATE_FILE" ]]; then
    printf 'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n' > "$STATE_FILE"
  fi
}

# Get status of an offer from state file
get_status() {
  local id="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "none"
    return
  fi
  local status
  status=$(awk -F'\t' -v id="$id" '$1 == id { print $3 }' "$STATE_FILE")
  echo "${status:-none}"
}

# Get retry count for an offer
get_retries() {
  local id="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "0"
    return
  fi
  local retries
  retries=$(awk -F'\t' -v id="$id" '$1 == id { print $9 }' "$STATE_FILE")
  echo "${retries:-0}"
}

# Calculate next report number
next_report_num() {
  local max_num=0
  if [[ -d "$REPORTS_DIR" ]]; then
    for f in "$REPORTS_DIR"/*.md; do
      [[ -f "$f" ]] || continue
      local basename
      basename=$(basename "$f")
      local num="${basename%%-*}"
      num=$((10#$num))
      if (( num > max_num )); then
        max_num=$num
      fi
    done
  fi
  if [[ -f "$STATE_FILE" ]]; then
    while IFS=$'\t' read -r _ _ _ _ _ rnum _ _ _; do
      [[ "$rnum" == "report_num" || "$rnum" == "-" || -z "$rnum" ]] && continue
      local n=$((10#$rnum))
      if (( n > max_num )); then
        max_num=$n
      fi
    done < "$STATE_FILE"
  fi
  printf '%03d' $((max_num + 1))
}

# Update or insert state for an offer
update_state() {
  local id="$1" url="$2" status="$3" started="$4" completed="$5" report_num="$6" score="$7" error="$8" retries="$9"

  if [[ ! -f "$STATE_FILE" ]]; then
    init_state
  fi

  local tmp="$STATE_FILE.tmp"
  local found=false

  head -1 "$STATE_FILE" > "$tmp"

  while IFS=$'\t' read -r sid surl sstatus sstarted scompleted sreport sscore serror sretries; do
    [[ "$sid" == "id" ]] && continue
    if [[ "$sid" == "$id" ]]; then
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$id" "$url" "$status" "$started" "$completed" "$report_num" "$score" "$error" "$retries" >> "$tmp"
      found=true
    else
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$sid" "$surl" "$sstatus" "$sstarted" "$scompleted" "$sreport" "$sscore" "$serror" "$sretries" >> "$tmp"
    fi
  done < "$STATE_FILE"

  if [[ "$found" == "false" ]]; then
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$id" "$url" "$status" "$started" "$completed" "$report_num" "$score" "$error" "$retries" >> "$tmp"
  fi

  mv "$tmp" "$STATE_FILE"
}

# Process a single offer
process_offer() {
  local id="$1" url="$2" source="$3" notes="$4"

  local report_num
  report_num=$(next_report_num)
  local date
  date=$(date +%Y-%m-%d)
  local started_at
  started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local retries
  retries=$(get_retries "$id")
  local jd_file="/tmp/batch-jd-${id}.txt"

  echo "--- Processing offer #$id: $url (report $report_num, attempt $((retries + 1)))"

  update_state "$id" "$url" "processing" "$started_at" "-" "$report_num" "-" "-" "$retries"

  local prompt
  prompt="Procesa esta oferta de empleo. Ejecuta el flujo completo: evaluaciÃ³n A-F + report .md + PDF + tracker line."
  prompt="$prompt URL: $url"
  prompt="$prompt JD file: $jd_file"
  prompt="$prompt Report number: $report_num"
  prompt="$prompt Date: $date"
  prompt="$prompt Batch ID: $id"

  local log_file="$LOGS_DIR/${report_num}-${id}.log"

  # Prepare system prompt with placeholders resolved
  local resolved_prompt="$BATCH_DIR/.resolved-prompt-${id}.md"
  sed \
    -e "s|{{URL}}|${url}|g" \
    -e "s|{{JD_FILE}}|${jd_file}|g" \
    -e "s|{{REPORT_NUM}}|${report_num}|g" \
    -e "s|{{DATE}}|${date}|g" \
    -e "s|{{ID}}|${id}|g" \
    "$PROMPT_FILE" > "$resolved_prompt"

  # Launch worker command for this offer
  local exit_code=0
  read -r -a worker_parts <<< "$WORKER_COMMAND"
  CAREER_OPS_BATCH_PROMPT_FILE="$resolved_prompt" \
  CAREER_OPS_BATCH_ID="$id" \
  CAREER_OPS_BATCH_URL="$url" \
  CAREER_OPS_BATCH_REPORT_NUM="$report_num" \
  CAREER_OPS_BATCH_SOURCE="$source" \
  CAREER_OPS_BATCH_NOTES="$notes" \
  "${worker_parts[@]}" "$prompt" "$source" "$notes" "$jd_file" "$report_num" "$id" > "$log_file" 2>&1 || exit_code=$?

  rm -f "$resolved_prompt"

  local completed_at
  completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  if [[ $exit_code -eq 0 ]]; then
    local score="-"
    local score_match
    score_match=$(grep -oP '"score":\s*[\d.]+' "$log_file" 2>/dev/null | head -1 | grep -oP '[\d.]+' || true)
    if [[ -n "$score_match" ]]; then
      score="$score_match"
    fi

    update_state "$id" "$url" "completed" "$started_at" "$completed_at" "$report_num" "$score" "-" "$retries"
    echo "    Completed (score: $score, report: $report_num)"
  else
    retries=$((retries + 1))
    local error_msg
    error_msg=$(tail -5 "$log_file" 2>/dev/null | tr '\n' ' ' | cut -c1-200 || echo "Unknown error (exit code $exit_code)")
    update_state "$id" "$url" "failed" "$started_at" "$completed_at" "$report_num" "-" "$error_msg" "$retries"
    echo "    Failed (attempt $retries, exit code $exit_code)"
  fi
}

merge_tracker() {
  echo ""
  echo "=== Merging tracker additions ==="
  node "$SCRIPT_DIR/../merge-tracker.mjs" --project-root "$PROJECT_DIR"
  echo ""
  echo "=== Verifying pipeline integrity ==="
  node "$SCRIPT_DIR/../verify-pipeline.mjs" --project-root "$PROJECT_DIR" || echo "WARNING: Verification found issues (see above)"
}

print_summary() {
  echo ""
  echo "=== Batch Summary ==="

  if [[ ! -f "$STATE_FILE" ]]; then
    echo "No state file found."
    return
  fi

  local total=0 completed=0 failed=0 pending=0
  local score_sum=0 score_count=0

  while IFS=$'\t' read -r sid _ sstatus _ _ _ sscore _ _; do
    [[ "$sid" == "id" ]] && continue
    total=$((total + 1))
    case "$sstatus" in
      completed)
        completed=$((completed + 1))
        if [[ "$sscore" != "-" && -n "$sscore" ]]; then
          score_sum=$(echo "$score_sum + $sscore" | bc 2>/dev/null || echo "$score_sum")
          score_count=$((score_count + 1))
        fi
        ;;
      failed) failed=$((failed + 1)) ;;
      *) pending=$((pending + 1)) ;;
    esac
  done < "$STATE_FILE"

  echo "Total: $total | Completed: $completed | Failed: $failed | Pending: $pending"

  if (( score_count > 0 )); then
    local avg
    avg=$(echo "scale=1; $score_sum / $score_count" | bc 2>/dev/null || echo "N/A")
    echo "Average score: $avg/5 ($score_count scored)"
  fi
}

main() {
  check_prerequisites

  if [[ "$DRY_RUN" == "false" ]]; then
    acquire_lock
  fi

  init_state

  local total_input
  total_input=$(tail -n +2 "$INPUT_FILE" | grep -c '[^[:space:]]' 2>/dev/null || true)
  total_input="${total_input:-0}"

  if (( total_input == 0 )); then
    echo "No offers in $INPUT_FILE. Add offers first."
    exit 0
  fi

  echo "=== career-ops batch runner ==="
  echo "Project root: $PROJECT_DIR"
  echo "Using worker: $WORKER_COMMAND"
  echo "Parallel: $PARALLEL | Max retries: $MAX_RETRIES"
  echo "Input: $total_input offers"
  echo ""

  local -a pending_ids=()
  local -a pending_urls=()
  local -a pending_sources=()
  local -a pending_notes=()

  while IFS=$'\t' read -r id url source notes; do
    [[ "$id" == "id" ]] && continue
    [[ -z "$id" || -z "$url" ]] && continue

    if (( id < START_FROM )); then
      continue
    fi

    local status
    status=$(get_status "$id")

    if [[ "$RETRY_FAILED" == "true" ]]; then
      if [[ "$status" != "failed" ]]; then
        continue
      fi
      local retries
      retries=$(get_retries "$id")
      if (( retries >= MAX_RETRIES )); then
        echo "SKIP #$id: max retries ($MAX_RETRIES) reached"
        continue
      fi
    else
      if [[ "$status" == "completed" ]]; then
        continue
      fi
      if [[ "$status" == "failed" ]]; then
        local retries
        retries=$(get_retries "$id")
        if (( retries >= MAX_RETRIES )); then
          echo "SKIP #$id: failed and max retries reached (use --retry-failed to force)"
          continue
        fi
      fi
    fi

    pending_ids+=("$id")
    pending_urls+=("$url")
    pending_sources+=("$source")
    pending_notes+=("$notes")
  done < "$INPUT_FILE"

  local pending_count=${#pending_ids[@]}

  if (( pending_count == 0 )); then
    echo "No offers to process."
    print_summary
    exit 0
  fi

  echo "Pending: $pending_count offers"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "=== DRY RUN (no processing) ==="
    for i in "${!pending_ids[@]}"; do
      local status
      status=$(get_status "${pending_ids[$i]}")
      echo "  #${pending_ids[$i]}: ${pending_urls[$i]} [${pending_sources[$i]}] (status: $status)"
    done
    echo ""
    echo "Would process $pending_count offers"
    exit 0
  fi

  if (( PARALLEL <= 1 )); then
    for i in "${!pending_ids[@]}"; do
      process_offer "${pending_ids[$i]}" "${pending_urls[$i]}" "${pending_sources[$i]}" "${pending_notes[$i]}"
    done
  else
    local running=0
    local -a pids=()
    local -a pid_ids=()

    for i in "${!pending_ids[@]}"; do
      while (( running >= PARALLEL )); do
        for j in "${!pids[@]}"; do
          if ! kill -0 "${pids[$j]}" 2>/dev/null; then
            wait "${pids[$j]}" 2>/dev/null || true
            unset 'pids[j]'
            unset 'pid_ids[j]'
            running=$((running - 1))
          fi
        done
        pids=("${pids[@]}")
        pid_ids=("${pid_ids[@]}")
        sleep 1
      done

      process_offer "${pending_ids[$i]}" "${pending_urls[$i]}" "${pending_sources[$i]}" "${pending_notes[$i]}" &
      pids+=($!)
      pid_ids+=("${pending_ids[$i]}")
      running=$((running + 1))
    done

    for pid in "${pids[@]}"; do
      wait "$pid" 2>/dev/null || true
    done
  fi

  merge_tracker
  print_summary
}

main "$@"
