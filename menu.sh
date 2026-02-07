#!/bin/bash
# WebHydra Management Menu

RED='\033[1;31m'
GREEN='\033[1;32m'
BLUE='\033[1;36m'
NC='\033[0m' # No Color

show_menu() {
    clear
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}    WebHydra - Web Application Firewall      ${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo "1. Start All Services"
    echo "2. Stop All Services"
    echo "3. Check Service Status"
    echo "4. Run Demo (Test Attacks)"
    echo "5. Retrain ML Model"
    echo "6. View Logs (Tail)"
    echo "0. Exit"
    echo -e "${GREEN}=============================================${NC}"
}

while true; do
    show_menu
    read -p "Enter your choice [0-6]: " choice

    case $choice in
        1)
            echo -e "\n${GREEN}[*] Starting services...${NC}"
            bash start-all.sh
            read -p "Press Enter to continue..."
            ;;
        2)
            echo -e "\n${RED}[*] Stopping services...${NC}"
            bash stop-all.sh
            read -p "Press Enter to continue..."
            ;;
        3)
            echo -e "\n${BLUE}[*] Checking status...${NC}"
            bash status.sh
            read -p "Press Enter to continue..."
            ;;
        4)
            echo -e "\n${GREEN}[*] Running demo...${NC}"
            bash demo.sh
            read -p "Press Enter to continue..."
            ;;
        5)
            echo -e "\n${BLUE}[*] Retraining model...${NC}"
            bash retrain.sh
            read -p "Press Enter to continue..."
            ;;
        6)
            echo -e "\n${BLUE}[*] Tailing logs (Ctrl+C to stop)...${NC}"
            tail -f dataset/traffic.jsonl
            ;;
        0)
            echo -e "\nExiting..."
            exit 0
            ;;
        *)
            echo -e "\n${RED}Invalid option!${NC}"
            sleep 1
            ;;
    esac
done
