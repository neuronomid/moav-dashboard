#!/bin/bash
# Quick diagnostic script to check DNSTT status on VPS

echo "=== DNSTT Diagnostic Script ==="
echo ""

# Check if .env has ENABLE_DNSTT
echo "1. Checking MoaV .env configuration:"
if [ -f /opt/moav/.env ]; then
    echo "ENABLE_DNSTT setting:"
    grep -E "^ENABLE_DNSTT" /opt/moav/.env || echo "  ❌ ENABLE_DNSTT not found in .env"
    echo ""
    echo "DEFAULT_PROFILES setting:"
    grep -E "^DEFAULT_PROFILES" /opt/moav/.env || echo "  ℹ️  DEFAULT_PROFILES not set"
else
    echo "  ❌ /opt/moav/.env not found"
fi

echo ""
echo "2. Checking DNSTT Docker service status:"
docker compose -f /opt/moav/docker-compose.yml ps dnstt 2>/dev/null || echo "  ❌ DNSTT service not running or not defined"

echo ""
echo "3. Checking if dnstt.txt exists in any user bundles:"
find /opt/moav/outputs/bundles -name "dnstt.txt" -type f 2>/dev/null | head -5 || echo "  ❌ No dnstt.txt files found"

echo ""
echo "4. Sample user bundle structure (if exists):"
SAMPLE_DIR=$(find /opt/moav/outputs/bundles -type d -mindepth 1 -maxdepth 1 2>/dev/null | head -1)
if [ -n "$SAMPLE_DIR" ]; then
    echo "  Contents of $SAMPLE_DIR:"
    ls -lh "$SAMPLE_DIR" | tail -n +2 | awk '{print "    " $9}'
else
    echo "  ℹ️  No user bundles found"
fi

echo ""
echo "=== End of Diagnostic ==="
