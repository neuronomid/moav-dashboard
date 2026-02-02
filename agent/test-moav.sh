#!/bin/bash
# Test script to verify moav.sh is accessible

echo "Testing MoaV CLI access..."
echo "================================"

MOAV_PATH="${MOAV_PATH:-/opt/moav/moav.sh}"

echo "1. Checking if moav.sh exists:"
if [ -f "$MOAV_PATH" ]; then
    echo "   ✓ Found at: $MOAV_PATH"
else
    echo "   ✗ Not found at: $MOAV_PATH"
    exit 1
fi

echo ""
echo "2. Checking if moav.sh is executable:"
if [ -x "$MOAV_PATH" ]; then
    echo "   ✓ Executable"
else
    echo "   ✗ Not executable - fixing..."
    chmod +x "$MOAV_PATH"
fi

echo ""
echo "3. Testing moav status command:"
$MOAV_PATH status 2>&1 | head -10

echo ""
echo "4. Testing moav user list command:"
$MOAV_PATH user list 2>&1

echo ""
echo "================================"
echo "If you see errors above, moav.sh may not be working correctly"
