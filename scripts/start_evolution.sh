#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVOLUTION_DIR="$ROOT_DIR/deploy/evolution"

cd "$ROOT_DIR"

echo "Starting Evolution API..."

# Create evolution database if it doesn't exist
echo "Ensuring 'evolution' database exists..."
docker exec bookedai-supabase-db psql -U postgres -c \
  "CREATE DATABASE evolution OWNER bookedai_app;" 2>/dev/null || true
docker exec bookedai-supabase-db psql -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE evolution TO bookedai_app;" 2>/dev/null || true

# Start Evolution API
cd "$EVOLUTION_DIR"
docker compose --env-file .env up -d

echo ""
echo "Evolution API started at https://waba.bookedai.au"
echo ""
echo "Next: create WhatsApp instance and get QR code:"
echo ""

EVOLUTION_API_KEY=$(grep EVOLUTION_API_KEY .env | cut -d= -f2)
echo "1. Create instance:"
echo "   curl -X POST https://waba.bookedai.au/instance/create \\"
echo "     -H 'apikey: ${EVOLUTION_API_KEY}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"instanceName\":\"bookedai\",\"qrcode\":true}'"
echo ""
echo "2. Get QR code (scan with WhatsApp on your phone):"
echo "   curl https://waba.bookedai.au/instance/connect/bookedai \\"
echo "     -H 'apikey: ${EVOLUTION_API_KEY}'"
echo ""
echo "3. Check connection status:"
echo "   curl https://waba.bookedai.au/instance/connectionState/bookedai \\"
echo "     -H 'apikey: ${EVOLUTION_API_KEY}'"
