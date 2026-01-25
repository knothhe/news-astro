#!/bin/bash

set -e

# Get script directory and set PROJECT_DIR dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
POSTS_DIR="${PROJECT_DIR}/src/content/posts"
REPORT_DIR="${PROJECT_DIR}/NewsReport"
# Verify opencode is available
if ! command -v opencode &> /dev/null; then
    echo "ERROR: opencode command not found. Please install opencode first."
    exit 1
fi
MAX_RETRIES=2
RETRY_COUNT=0
LOG_FILE="${PROJECT_DIR}/workflow.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if we already have today's report
get_today_date() {
    date '+%Y-%m-%d'
}

check_today_report_exists() {
    local today=$(get_today_date)
    local report_file="${POSTS_DIR}/${today}-news-report.md"
    if [ -f "$report_file" ]; then
        return 0  # exists
    else
        return 1  # not exists
    fi
}

# Generate daily news report using opencode
generate_report() {
    log "Step 1: Generating daily news report with opencode..."
    
    # Run opencode with daily-news-report skill
    cd "$PROJECT_DIR"
    opencode run "请使用 daily-news-report skill 生成今日技术新闻报告，并将报告保存到 @src/content/posts/ 目录下，文件名为 YYYY-MM-DD-news-report.md 格式。" --print-logs
    
    if check_today_report_exists; then
        log "Report generated successfully: ${POSTS_DIR}/$(get_today_date)-news-report.md"
        return 0
    else
        log "Report generation may have failed, checking ReportDir..."
        
        # Check if report was generated in NewsReport directory
        local today=$(get_today_date)
        local temp_report="${REPORT_DIR}/${today}-news-report.md"
        if [ -f "$temp_report" ]; then
            log "Found report in NewsReport, moving to posts directory..."
            cp "$temp_report" "${POSTS_DIR}/${today}-news-report.md"
            rm "$temp_report"
            return 0
        fi
        
        return 1
    fi
}

# Check for build errors
check_build() {
    log "Step 2: Checking for build errors..."
    
    cd "$PROJECT_DIR"
    
    # Run astro check to verify compilation
    if pnpm astro check > /dev/null 2>&1; then
        log "Build check passed!"
        return 0
    else
        log "Build check failed!"
        return 1
    fi
}

# Commit and push changes
commit_and_push() {
    log "Step 3: Committing and pushing changes..."
    
    cd "$PROJECT_DIR"
    
    # Check if there are changes to commit (including untracked files)
    if ! git status --porcelain | grep -q .; then
        log "No changes to commit."
        return 0
    fi
    
    local today=$(get_today_date)
    local commit_message="docs: Add daily news report for ${today}"
    
    # Add all changes (including new report)
    git add -A
    
    # Commit
    if git commit -m "$commit_message"; then
        log "Changes committed successfully."
    else
        log "Failed to commit changes."
        return 1
    fi
    
    # Push
    if git push; then
        log "Changes pushed to remote successfully."
        return 0
    else
        log "Failed to push changes."
        return 1
    fi
}

# Main workflow
main() {
    log "========================================"
    log "Starting daily workflow at $(date)"
    log "========================================"
    
    # Check if today's report already exists
    if check_today_report_exists; then
        log "Today's report already exists, skipping generation."
    else
        # Try to generate report with retries
        while [ $RETRY_COUNT -le $MAX_RETRIES ]; do
            log "Attempt $((RETRY_COUNT + 1))/$((MAX_RETRIES + 1))"
            
            if generate_report; then
                break
            else
                log "Report generation failed."
                RETRY_COUNT=$((RETRY_COUNT + 1))
                if [ $RETRY_COUNT -le $MAX_RETRIES ]; then
                    log "Retrying in 30 seconds..."
                    sleep 30
                fi
            fi
        done
        
        if ! check_today_report_exists; then
            log "ERROR: Failed to generate report after $((MAX_RETRIES + 1)) attempts. Exiting."
            exit 1
        fi
    fi
    
    # Check build with retries
    RETRY_COUNT=0
    while [ $RETRY_COUNT -le $MAX_RETRIES ]; do
        log "Build check attempt $((RETRY_COUNT + 1))/$((MAX_RETRIES + 1))"
        
        if check_build; then
            break
        else
            log "Build check failed."
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -le $MAX_RETRIES ]; then
                log "Regenerating report and retrying..."
                rm -f "${POSTS_DIR}/$(get_today_date)-news-report.md"
                sleep 5
                generate_report
            fi
        fi
    done
    
    if ! check_build; then
        log "ERROR: Build check failed after $((MAX_RETRIES + 1)) attempts. Please check the errors manually."
        exit 1
    fi
    
    # Commit and push
    if commit_and_push; then
        log "Workflow completed successfully!"
    else
        log "WARNING: Git push failed, but report was generated and build passed."
        exit 1
    fi
    
    log "========================================"
    log "Workflow finished at $(date)"
    log "========================================"
}

# Run main function
main "$@"
