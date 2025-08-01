FROM python:3.11-slim

# システムパッケージの更新とChrome関連パッケージのインストール
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    # ネットワーク関連ツール追加（外部接続強化）
    iputils-ping \
    net-tools \
    dnsutils \
    iptables \
    netcat-openbsd \
    tcpdump \
    traceroute \
    # Tor パッケージ追加（IP変更用）
    tor \
    # Xvfb（仮想ディスプレイ）とSelenium関連
    xvfb \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Google Chrome の安定版をインストール
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ChromeDriverのインストール（新しいAPIを使用）
RUN CHROME_VERSION=$(google-chrome --version | cut -d " " -f3) \
    && MAJOR_VERSION=$(echo $CHROME_VERSION | cut -d "." -f1) \
    && echo "Chrome version: $CHROME_VERSION, Major version: $MAJOR_VERSION" \
    && CHROMEDRIVER_VERSION=$(curl -s "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_${MAJOR_VERSION}" 2>/dev/null || curl -s "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE") \
    && echo "ChromeDriver version: $CHROMEDRIVER_VERSION" \
    && if [ -z "$CHROMEDRIVER_VERSION" ]; then \
        echo "Failed to get ChromeDriver version, using fallback" && \
        CHROMEDRIVER_VERSION="119.0.6045.105"; \
    fi \
    && wget -O /tmp/chromedriver.zip "https://storage.googleapis.com/chrome-for-testing-public/${CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip" \
    || wget -O /tmp/chromedriver.zip "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip" \
    && unzip /tmp/chromedriver.zip -d /tmp/ \
    && mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf /tmp/chromedriver.zip /tmp/chromedriver-linux64 \
    && chromedriver --version

# 作業ディレクトリの設定
WORKDIR /app

# Pythonの依存関係ファイルをコピー
COPY requirements.txt .

# Python依存関係のインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションファイルをコピー
COPY twitter_auto_post_secure.py .
COPY test_network.py .
COPY python/ ./python/

# 必要なディレクトリを作成
RUN mkdir -p /app/logs /app/uploads /app/persistent_profile

# Tor設定ファイルを作成
RUN echo "SocksPort 9050" > /etc/tor/torrc && \
    echo "ControlPort 9051" >> /etc/tor/torrc && \
    echo "CookieAuthentication 1" >> /etc/tor/torrc && \
    echo "CookieAuthFile /var/lib/tor/control_auth_cookie" >> /etc/tor/torrc && \
    echo "DataDirectory /var/lib/tor" >> /etc/tor/torrc

# Xvfb起動スクリプトを作成
RUN echo '#!/bin/bash' > /app/start_services.sh && \
    echo 'echo "Starting Xvfb..."' >> /app/start_services.sh && \
    echo 'Xvfb :99 -screen 0 1920x1080x24 &' >> /app/start_services.sh && \
    echo 'export DISPLAY=:99' >> /app/start_services.sh && \
    echo 'echo "Starting Tor..."' >> /app/start_services.sh && \
    echo 'tor &' >> /app/start_services.sh && \
    echo 'sleep 5' >> /app/start_services.sh && \
    echo 'echo "Starting Twitter Auto Post service..."' >> /app/start_services.sh && \
    echo 'python twitter_auto_post_secure.py' >> /app/start_services.sh && \
    chmod +x /app/start_services.sh

# 実行用ユーザーの作成（セキュリティ向上）
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /var/lib/tor && \
    mkdir -p /var/run/tor && \
    chown -R appuser:appuser /var/run/tor

# ポート公開
EXPOSE 5000

# 環境変数の設定
ENV DISPLAY=:99
ENV PYTHONUNBUFFERED=1

# ユーザー切り替え
USER appuser

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# アプリケーション起動（Xvfb、Tor、アプリを順次起動）
CMD ["/app/start_services.sh"]