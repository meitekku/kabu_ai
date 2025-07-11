# Production Environment Setup for Chrome/Selenium

## Issue
The error `cannot find Chrome binary` occurs in production because Chrome/Chromium is not installed on the server.

## Solutions

### Option 1: Install Chrome/Chromium on Server

#### Ubuntu/Debian:
```bash
# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# OR install Chromium (lighter alternative)
sudo apt install -y chromium-browser
```

#### CentOS/RHEL/Amazon Linux:
```bash
# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum localinstall -y google-chrome-stable_current_x86_64.rpm
```

#### Docker/Alpine Linux:
```bash
apk add --no-cache chromium chromium-chromedriver
```

### Option 2: Use the Install Script
Run the provided install script:
```bash
chmod +x install-chrome.sh
./install-chrome.sh
```

### Option 3: Install Python Dependencies
Ensure all Python dependencies are installed:
```bash
pip install -r requirements.txt
```

## Dependencies in requirements.txt:
- selenium>=4.0.0
- webdriver-manager>=3.8.0
- python-dotenv>=0.19.0
- pyperclip>=1.8.0 (for better text input)

## Verification
After installation, verify Chrome is available:
```bash
which google-chrome || which chromium-browser || which chromium
```

## Notes
- The Python script has been updated to automatically detect Chrome binary paths
- For headless servers, add `--headless` option in the Chrome options
- Ensure proper permissions for Chrome in containerized environments