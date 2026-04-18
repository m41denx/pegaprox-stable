#!/bin/bash
# ============================================================================
# PegaProx web UI build — Vite + TypeScript (web/)
# ============================================================================
#
# Legacy Babel concat sources live in web/legacy/ (reference only).
# Production UI: pnpm install && pnpm build → web/dist/
#
# Requirements: Node.js 20+, pnpm 9+
#
# Usage (from repo root):
#   ./web/Dev/build.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$WEB_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}PegaProx web — Vite build${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm not found. Install: npm install -g pnpm${NC}"
    exit 1
fi

cd "$WEB_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm run build

echo -e "${GREEN}Done. Output: web/dist/${NC}"
