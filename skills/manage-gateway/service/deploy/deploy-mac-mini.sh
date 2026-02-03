#!/bin/bash
# Deploy gateway-cc to Mac Mini via Tailscale
# Usage: ./deploy-mac-mini.sh [--first-time]
#
# Prerequisites:
# - Tailscale connected to same network
# - SSH access to Mac Mini (ssh polariss-mac-mini.tail3351a2.ts.net)
# - Node.js/npm installed on Mac Mini

set -e

MAC_MINI="polariss-mac-mini-1"
REMOTE_USER="polaris"
REMOTE_HOME="/Users/${REMOTE_USER}"
LOCAL_CLAUDE="$HOME/.claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Mac Mini is reachable
check_connectivity() {
    log_info "Checking connectivity to Mac Mini..."
    if ! ssh -o ConnectTimeout=5 "${REMOTE_USER}@${MAC_MINI}" "echo ok" >/dev/null 2>&1; then
        log_error "Cannot connect to Mac Mini. Ensure:"
        echo "  1. Tailscale is running on both machines"
        echo "  2. SSH access is configured (ssh ${REMOTE_USER}@${MAC_MINI})"
        exit 1
    fi
    log_info "Connected to Mac Mini"
}

# Create remote directories
setup_remote_dirs() {
    log_info "Setting up remote directories..."
    ssh "${REMOTE_USER}@${MAC_MINI}" "mkdir -p ${REMOTE_HOME}/.claude/tools ${REMOTE_HOME}/.claude/services ${REMOTE_HOME}/Library/Logs/gateway-cc ${REMOTE_HOME}/Library/LaunchAgents"
}

# Sync gateway-cc tool
sync_gateway_cc() {
    log_info "Syncing gateway-cc..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'gateway.db*' \
        --exclude '.git' \
        "${LOCAL_CLAUDE}/skills/manage-gateway/service/" \
        "${REMOTE_USER}@${MAC_MINI}:${REMOTE_HOME}/.claude/skills/manage-gateway/service/"
}

# Sync all services
sync_services() {
    log_info "Syncing services..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        "${LOCAL_CLAUDE}/services/" \
        "${REMOTE_USER}@${MAC_MINI}:${REMOTE_HOME}/.claude/services/"
}

# Sync .env file (contains API keys)
sync_env() {
    log_info "Syncing .env file..."
    if [ -f "${LOCAL_CLAUDE}/.env" ]; then
        rsync -avz "${LOCAL_CLAUDE}/.env" "${REMOTE_USER}@${MAC_MINI}:${REMOTE_HOME}/.claude/.env"
    else
        log_warn "No .env file found at ${LOCAL_CLAUDE}/.env"
    fi
}

# Install LaunchAgent
install_launch_agent() {
    log_info "Installing LaunchAgent..."

    # Copy plist
    scp "${SCRIPT_DIR}/com.gateway-cc.plist" "${REMOTE_USER}@${MAC_MINI}:${REMOTE_HOME}/Library/LaunchAgents/"

    # Unload if already loaded, then load
    ssh "${REMOTE_USER}@${MAC_MINI}" "launchctl unload ${REMOTE_HOME}/Library/LaunchAgents/com.gateway-cc.plist 2>/dev/null || true"
    ssh "${REMOTE_USER}@${MAC_MINI}" "launchctl load ${REMOTE_HOME}/Library/LaunchAgents/com.gateway-cc.plist"

    log_info "LaunchAgent installed and loaded"
}

# Install npm dependencies
install_deps() {
    log_info "Installing npm dependencies on Mac Mini..."
    ssh "${REMOTE_USER}@${MAC_MINI}" "cd ${REMOTE_HOME}/.claude/skills/manage-gateway/service && npm install --omit=dev"

    # Also install deps for services that have package.json
    ssh "${REMOTE_USER}@${MAC_MINI}" "
        for dir in ${REMOTE_HOME}/.claude/services/*/; do
            if [ -f \"\${dir}package.json\" ]; then
                echo \"Installing deps in \${dir}...\"
                cd \"\${dir}\" && npm install --omit=dev
            fi
        done
    "
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    # Wait a moment for server to start
    sleep 3

    # Check health endpoint
    if curl -sf "http://${MAC_MINI}:4100/health" >/dev/null 2>&1; then
        log_info "Health check passed!"
        echo ""
        echo "Gateway is running at: http://${MAC_MINI}:4100"
        echo ""
        echo "Test commands:"
        echo "  curl http://${MAC_MINI}:4100/health"
        echo "  curl http://${MAC_MINI}:4100/services"
    else
        log_warn "Health check failed. Checking logs..."
        ssh "${REMOTE_USER}@${MAC_MINI}" "tail -20 ${REMOTE_HOME}/Library/Logs/gateway-cc/stderr.log 2>/dev/null || echo 'No logs yet'"
        echo ""
        echo "Try manually starting: ssh ${REMOTE_USER}@${MAC_MINI} 'cd ~/.claude/skills/manage-gateway/service && npx tsx src/index.ts serve'"
    fi
}

# First-time setup
first_time_setup() {
    log_info "Running first-time setup..."

    # Check if Node.js is installed
    if ! ssh "${REMOTE_USER}@${MAC_MINI}" "which node" >/dev/null 2>&1; then
        log_error "Node.js not found on Mac Mini. Install it first:"
        echo "  ssh ${REMOTE_USER}@${MAC_MINI}"
        echo "  brew install node"
        exit 1
    fi

    # Check Node version
    NODE_VERSION=$(ssh "${REMOTE_USER}@${MAC_MINI}" "node --version")
    log_info "Mac Mini Node.js version: ${NODE_VERSION}"
}

# Main
main() {
    echo "========================================"
    echo "  Gateway-CC Deployment to Mac Mini"
    echo "========================================"
    echo ""

    FIRST_TIME=false
    if [ "$1" == "--first-time" ]; then
        FIRST_TIME=true
    fi

    check_connectivity

    if [ "$FIRST_TIME" = true ]; then
        first_time_setup
    fi

    setup_remote_dirs
    sync_gateway_cc
    sync_services
    sync_env
    install_deps
    install_launch_agent
    verify_deployment

    echo ""
    log_info "Deployment complete!"
}

main "$@"
