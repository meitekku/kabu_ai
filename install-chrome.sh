#!/bin/bash
# Chrome/Chromium installation script for production server

# Ubuntu/Debian
if command -v apt &> /dev/null; then
    echo "Installing Chrome on Ubuntu/Debian..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt update
    sudo apt install -y google-chrome-stable
    
    # Alternative: Chromium
    # sudo apt install -y chromium-browser
fi

# CentOS/RHEL/Amazon Linux
if command -v yum &> /dev/null; then
    echo "Installing Chrome on CentOS/RHEL..."
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
    sudo yum localinstall -y google-chrome-stable_current_x86_64.rpm
    rm google-chrome-stable_current_x86_64.rpm
fi

# Alpine Linux (Docker)
if command -v apk &> /dev/null; then
    echo "Installing Chromium on Alpine..."
    apk add --no-cache chromium chromium-chromedriver
fi

echo "Chrome/Chromium installation completed!"
which google-chrome || which chromium-browser || which chromium