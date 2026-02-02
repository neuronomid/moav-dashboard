#!/bin/bash
# Script to find the moav-manager project on your VPS

echo "🔍 Searching for moav-manager project..."
echo "========================================"
echo ""

# Search in common locations
echo "Searching in common locations..."
FOUND_PATHS=()

# Check /opt
if [ -d "/opt/moav-manager" ]; then
    FOUND_PATHS+=("/opt/moav-manager")
fi

# Check /root
if [ -d "/root/moav-manager" ]; then
    FOUND_PATHS+=("/root/moav-manager")
fi

# Check home directory
if [ -d "$HOME/moav-manager" ]; then
    FOUND_PATHS+=("$HOME/moav-manager")
fi

# Search everywhere (this might take a while)
echo "Doing a deep search (this may take 30-60 seconds)..."
while IFS= read -r path; do
    if [[ ! " ${FOUND_PATHS[@]} " =~ " ${path} " ]]; then
        FOUND_PATHS+=("$path")
    fi
done < <(find / -type d -name "moav-manager" 2>/dev/null | head -5)

echo ""
echo "========================================"
echo ""

if [ ${#FOUND_PATHS[@]} -eq 0 ]; then
    echo "❌ Could not find moav-manager project"
    echo ""
    echo "Possible reasons:"
    echo "1. The project hasn't been cloned to this server yet"
    echo "2. It has a different name"
    echo ""
    echo "To clone it now, run:"
    echo "  cd /opt"
    echo "  git clone https://github.com/neuronomid/moav-dashboard.git moav-manager"
    exit 1
else
    echo "✅ Found moav-manager at:"
    echo ""
    for path in "${FOUND_PATHS[@]}"; do
        echo "  📁 $path"
        if [ -f "$path/agent/package.json" ]; then
            echo "     ✓ Has agent folder"
        fi
    done
    echo ""
    echo "========================================"
    echo ""
    echo "To deploy the agent, run:"
    echo ""
    BEST_PATH="${FOUND_PATHS[0]}"
    echo "  cd $BEST_PATH/agent"
    echo "  git pull origin master"
    echo "  chmod +x deploy.sh"
    echo "  ./deploy.sh"
    echo ""
fi
