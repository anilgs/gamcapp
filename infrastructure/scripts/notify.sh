#!/bin/bash
# Notification helper script for CI/CD workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[NOTIFY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[NOTIFY]${NC} $1"
}

print_error() {
    echo -e "${RED}[NOTIFY]${NC} $1"
}

# Function to send Slack notification
send_slack_notification() {
    local webhook_url="$1"
    local message="$2"
    local color="$3"
    local title="$4"
    
    if [[ -z "$webhook_url" ]]; then
        print_status "No Slack webhook URL provided, skipping Slack notification"
        return 0
    fi
    
    # Create JSON payload
    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "${GITHUB_ENV_NAME:-${ENVIRONMENT:-Unknown}}",
                    "short": true
                },
                {
                    "title": "Triggered by",
                    "value": "${GITHUB_ACTOR:-${USER:-Unknown}}",
                    "short": true
                },
                {
                    "title": "Workflow",
                    "value": "${GITHUB_WORKFLOW:-Manual}",
                    "short": true
                },
                {
                    "title": "Repository",
                    "value": "${GITHUB_REPOSITORY:-gamcapp}",
                    "short": true
                }
            ],
            "footer": "GitHub Actions",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
    
    # Send notification
    if curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$webhook_url" >/dev/null 2>&1; then
        print_success "Slack notification sent"
    else
        print_error "Failed to send Slack notification"
    fi
}

# Function to send Teams notification
send_teams_notification() {
    local webhook_url="$1"
    local message="$2"
    local color="$3"
    local title="$4"
    
    if [[ -z "$webhook_url" ]]; then
        print_status "No Teams webhook URL provided, skipping Teams notification"
        return 0
    fi
    
    # Create JSON payload for Teams
    local payload=$(cat <<EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "$color",
    "summary": "$title",
    "sections": [{
        "activityTitle": "$title",
        "activitySubtitle": "GAMCAPP Infrastructure",
        "activityImage": "https://github.com/github.png",
        "facts": [{
            "name": "Environment:",
            "value": "${GITHUB_ENV_NAME:-${ENVIRONMENT:-Unknown}}"
        }, {
            "name": "Triggered by:",
            "value": "${GITHUB_ACTOR:-${USER:-Unknown}}"
        }, {
            "name": "Repository:",
            "value": "${GITHUB_REPOSITORY:-gamcapp}"
        }],
        "markdown": true,
        "text": "$message"
    }],
    "potentialAction": [{
        "@type": "OpenUri",
        "name": "View Workflow",
        "targets": [{
            "os": "default",
            "uri": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
        }]
    }]
}
EOF
)
    
    # Send notification
    if curl -X POST -H 'Content-Type: application/json' \
        --data "$payload" \
        "$webhook_url" >/dev/null 2>&1; then
        print_success "Teams notification sent"
    else
        print_error "Failed to send Teams notification"
    fi
}

# Function to send teardown start notification
notify_teardown_start() {
    local environment="$1"
    local reason="$2"
    
    local message="🔥 Infrastructure teardown started for **$environment** environment.\\n\\n**Reason:** $reason\\n\\n**Status:** In Progress"
    local title="🔥 Infrastructure Teardown Started"
    local color="warning"
    
    send_slack_notification "$SLACK_WEBHOOK_URL" "$message" "$color" "$title"
    send_teams_notification "$TEAMS_WEBHOOK_URL" "$message" "FF8C00" "$title"
}

# Function to send teardown completion notification
notify_teardown_complete() {
    local environment="$1"
    local status="$2"
    local reason="$3"
    
    if [[ "$status" == "success" ]]; then
        local message="✅ Infrastructure teardown completed successfully for **$environment** environment.\\n\\n**Reason:** $reason\\n\\n**Next Steps:** Verify in AWS Console and clean up artifacts"
        local title="✅ Infrastructure Teardown Completed"
        local color="good"
        local teams_color="00FF00"
    else
        local message="❌ Infrastructure teardown failed for **$environment** environment.\\n\\n**Reason:** $reason\\n\\n**Action Required:** Check logs and may need manual cleanup"
        local title="❌ Infrastructure Teardown Failed"
        local color="danger" 
        local teams_color="FF0000"
    fi
    
    send_slack_notification "$SLACK_WEBHOOK_URL" "$message" "$color" "$title"
    send_teams_notification "$TEAMS_WEBHOOK_URL" "$message" "$teams_color" "$title"
}

# Function to send maintenance notification
notify_maintenance_complete() {
    local environment="$1" 
    local cleanup_type="$2"
    local status="$3"
    
    if [[ "$status" == "success" ]]; then
        local message="🛠️ Infrastructure maintenance completed for **$environment** environment.\\n\\n**Cleanup Type:** $cleanup_type\\n\\n**Status:** Successful"
        local title="🛠️ Infrastructure Maintenance Completed"
        local color="good"
        local teams_color="00FF00"
    else
        local message="⚠️ Infrastructure maintenance had issues for **$environment** environment.\\n\\n**Cleanup Type:** $cleanup_type\\n\\n**Action:** Check logs for details"
        local title="⚠️ Infrastructure Maintenance Issues"
        local color="warning"
        local teams_color="FF8C00"
    fi
    
    send_slack_notification "$SLACK_WEBHOOK_URL" "$message" "$color" "$title"
    send_teams_notification "$TEAMS_WEBHOOK_URL" "$message" "$teams_color" "$title"
}

# Main function to handle different notification types
main() {
    local notification_type="$1"
    shift
    
    case "$notification_type" in
        teardown-start)
            notify_teardown_start "$1" "$2"
            ;;
        teardown-complete)
            notify_teardown_complete "$1" "$2" "$3"
            ;;
        maintenance-complete)
            notify_maintenance_complete "$1" "$2" "$3"
            ;;
        *)
            print_error "Unknown notification type: $notification_type"
            print_status "Usage: $0 <type> [args...]"
            print_status "Types:"
            print_status "  teardown-start <environment> <reason>"
            print_status "  teardown-complete <environment> <status> <reason>"
            print_status "  maintenance-complete <environment> <cleanup_type> <status>"
            exit 1
            ;;
    esac
}

# Handle command line arguments
if [[ $# -lt 1 ]]; then
    print_error "Missing notification type"
    main "help"
else
    main "$@"
fi