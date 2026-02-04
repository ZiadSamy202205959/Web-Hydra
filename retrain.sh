#!/bin/bash
# Retrain ML model script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BLUE='\033[1;36m'
RED='\033[1;31m'
NC='\033[0m'

echo -e "${BLUE}[*] Retraining model...${NC}"
# Assuming notebooks/train_model.py exists and generates the model
if [ -f "$SCRIPT_DIR/notebooks/train_model.py" ]; then
    "$SCRIPT_DIR/trainenv/bin/python" "$SCRIPT_DIR/notebooks/train_model.py"
    echo -e "${BLUE}[*] Done.${NC}"
else
    echo -e "${RED}[!] notebooks/train_model.py not found.${NC}"
fi
