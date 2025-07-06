# coding:utf-8

import requests
import datetime
import argparse
import jpholiday
import pandas as pd

import smtplib
from email.mime.text import MIMEText
from email.header import Header
from pymongo import MongoClient
import re
from datetime import timedelta
from datetime import datetime

def send_mail(subject, error_message, sender_address, receiver_address, email_password):
    # メール設定
    sender = sender_address+"@gmail.com"
    receiver = receiver_address+"@gmail.com"
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587
    smtp_username = sender_address  # Gmailのユーザー名部分を抽出

    # メール本文の作成
    msg = MIMEText(error_message, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = sender
    msg['To'] = receiver

    # メール送信
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            #server.set_debuglevel(1)  # デバッグ出力を有効にする場合はコメントを外す
            server.starttls()
            server.login(smtp_username, email_password)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        print(f"認証エラー: ユーザー名またはパスワードが間違っています。\n詳細: {e}")
        print("Gmailを使用している場合、アプリパスワードを使用しているか確認してください。")
    except smtplib.SMTPException as e:
        print(f"SMTP エラー: {e}")
    except Exception as e:
        print(f"予期せぬエラー: {e}")

#send_mail(f"torエラー","aaaa","seneca.meiteko", "seneca.meiteko","***REMOVED_GMAIL_APP_PASSWORD***")

def chatwork(message):
    # コマンドライン引数からルームID、メッセージ内容を取得
    psr = argparse.ArgumentParser()
    psr.add_argument('-a', '--apikey', default='***REMOVED_CHATWORK_API_KEY***')
    psr.add_argument('-r', '--roomid', default='162471617')
    psr.add_argument('-m', '--message', default=message)
    psr.add_argument('--version', action='version', version='%(prog)s 1.0')
    args = psr.parse_args()

    # エンドポイントの生成
    ENDPOINT = 'https://api.chatwork.com/v2'
    post_message_url = '{}/rooms/{}/messages'.format(ENDPOINT, args.roomid)

    # チャットワークAPIにポストする場合のヘッダー、パラメータを設定
    headers = { 'X-ChatWorkToken': args.apikey}
    params = { 'body': args.message }

    # ポストリクエストを実行
    r = requests.post(post_message_url,
                        headers=headers,
                        params=params)

def calc_percent(v1,v2):
    price_percent = 0
    if v1 != 0 and v2 != 0:
        price_percent = v1 / v2
        if price_percent > 1:
            price_percent = 100 * (price_percent - 1)
        else:
            price_percent -= 100 * (1 - price_percent)
        price_percent = round(price_percent, 2)
    else:
        price_percent = 0
    return price_percent

def is_pm():
    dt_now = datetime.datetime.now()
    now_format = dt_now.strftime('%Y-%m-%d %H:%M:%S')
    today_pm15 = dt_now.strftime('%Y-%m-%d 15:00:00')
    return today_pm15 < now_format

def get_zerodate():
    dt_now = datetime.datetime.now()
    return dt_now.strftime('%Y-%m-%d 00:00:00')

#response = requests.get(param_url, headers=headers)
#common_calc.make_html(response.text)
def make_html(html):
    f = open("html.html","w")
    f.write(html)
    f.close()

def connect_db():
    import pymysql
    return pymysql.connect(host='133.130.102.77', user='meiteko', db='kabu_ai', charset='utf8mb4', password='***REMOVED_DB_PASSWORD***',port=3306, cursorclass=pymysql.cursors.DictCursor)

def insert_sql(insert_sql):
    if insert_sql == "":
        return

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql)
            conn.commit()
    except:
        print(insert_sql)
        import traceback
        print(traceback.format_exc())
    finally:
        conn.close()

def sql(insert_sql):
    if insert_sql == "":
        return

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql)
            conn.commit()
    except:
        print(insert_sql)
        import traceback
        print(traceback.format_exc())
    finally:
        conn.close()

def select_sql(select_sql):
    if select_sql == "":
        return
        
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(select_sql)
            result = cursor.fetchall()
            return result
    except:
        print(select_sql)
        import traceback
        print(traceback.format_exc())
    finally:
        conn.close()

#例: bulk_insert("stock","name,market,num","('name','market',1),")
def escape_sql_value(value):
    """SQL用の文字列をエスケープする"""
    return value.replace("'", "''")

def bulk_insert(table, column, middle_sql):
    if middle_sql == "":
        print("sqlなし")
        return

    # 最後のカンマがあれば削除
    middle_sql = middle_sql.rstrip(",")

    # SQL文の組み立て
    insert_start_sql = "INSERT INTO " + table + "(" + column + ") VALUES "
    insert_end_sql = "ON DUPLICATE KEY UPDATE "
    columns_split_array = column.split(",")
    for i, col in enumerate(columns_split_array):
        if i != 0:
            insert_end_sql += ","
        insert_end_sql += col.strip() + " = VALUES(`" + col + "`)"
    insert_end_sql += ";"
    sql_combine = insert_start_sql + middle_sql + insert_end_sql
    insert_sql(sql_combine)

def driver_pass():
    import os
    driver_pass = os.getcwd()+'/common/chromedriver'
    if 'root' in driver_pass:
        driver_pass = '/root/python/common/chromedriver'
    return driver_pass

def return_driver(headless=0):
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    import ssl
    import os
    import shutil
    
    temp_dir = os.path.join('/tmp', f'chrome_user_data_{os.getpid()}')
    
    # 既存の一時ディレクトリがあれば削除
    if os.path.exists(temp_dir):
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Failed to remove existing temp dir: {e}")
    
    # 新しいディレクトリを作成
    try:
        os.makedirs(temp_dir, exist_ok=True)
    except Exception as e:
        print(f"Failed to create temp dir {temp_dir}: {e}")
        # バックアップディレクトリを試す
        temp_dir = os.path.join(os.path.expanduser('~'), f'chrome_tmp_{os.getpid()}')
        try:
            os.makedirs(temp_dir, exist_ok=True)
            print(f"Created backup temp directory: {temp_dir}")
        except Exception as e2:
            print(f"Failed to create backup temp dir: {e2}")
    
    ssl._create_default_https_context = ssl._create_unverified_context
    options = webdriver.ChromeOptions()
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36')
    options.add_argument('--window-size=600,800')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--no-sandbox')
    
    # 明示的に一時ディレクトリを指定
    options.add_argument(f'--user-data-dir={temp_dir}')
    
    if headless == 0:
        options.add_argument('--headless')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    try:
        # Selenium 4対応のServiceオブジェクトを使用
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.implicitly_wait(1)
        return driver
    except Exception as e:
        # 例外が発生した場合のエラーハンドリング
        import traceback
        traceback.print_exc()  # エラーのトレースバックを出力
        
        # エラー発生時に一時ディレクトリを削除
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temp directory after error: {temp_dir}")
            except:
                pass
        
        return None
    
def login_driver(url, email, password, email_xpath, password_xpath, button_xpath, headless=0):
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    import ssl
    import time

    """
    ウェブサイトへのログイン機能付きのChromeドライバーを返す関数
    
    Args:
        url (str): ログインページのURL
        email (str): ログイン用のメールアドレス
        password (str): ログイン用のパスワード
        email_xpath (str): メールアドレス入力欄のxpath
        password_xpath (str): パスワード入力欄のxpath
        button_xpath (str): ログインボタンのxpath
        headless (int): ヘッドレスモードを使用するかどうか（0: 使用する、1: 使用しない）
    
    Returns:
        webdriver.Chrome: ログイン済みのChromeドライバーインスタンス
    """
    ssl._create_default_https_context = ssl._create_unverified_context
    
    # ChromeOptionsの設定
    options = webdriver.ChromeOptions()
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36')
    options.add_argument('--window-size=600,800')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--no-sandbox')
    
    if headless == 0:
        options.add_argument('--headless')
        
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    try:
        # Selenium 4対応のServiceオブジェクトを使用
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.implicitly_wait(10)  # 暗黙的な待機時間を設定
        
        # URLにアクセス
        driver.get(url)
        time.sleep(2)  # ページの読み込みを待機
        
        # メールアドレスの入力
        email_field = driver.find_element(By.XPATH, email_xpath)
        email_field.clear()
        email_field.send_keys(email)
        
        # パスワードの入力
        password_field = driver.find_element(By.XPATH, password_xpath)
        password_field.clear()
        password_field.send_keys(password)
        
        # ログインボタンのクリック
        login_button = driver.find_element(By.XPATH, button_xpath)
        login_button.click()
        
        # ログイン後の読み込みを待機
        time.sleep(3)
        return driver
        
    except Exception as e:
        import traceback
        print(f"ログイン中にエラーが発生しました: {str(e)}")
        traceback.print_exc()
        if 'driver' in locals():
            driver.quit()
        return None
    
def MacDriver(headless=0, profile_path="~/Library/Application Support/Google/Chrome/Default"):
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    import ssl
    import os

    ssl._create_default_https_context = ssl._create_unverified_context

    # プロファイルパスを絶対パスに変換
    profile_path = os.path.expanduser(profile_path)

    # ChromeOptions設定
    options = webdriver.ChromeOptions()
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36')
    options.add_argument('--window-size=1200,800')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--no-sandbox')

    # ヘッドレスモードの設定
    if headless == 1:
        options.add_argument('--headless')

    # 既存のプロファイルを使用
    options.add_argument(f'--user-data-dir={profile_path}')
    options.add_argument('--profile-directory=Default')

    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_experimental_option("detach", True)

    # MacのGoogle Chromeのパスを指定
    chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    options.binary_location = chrome_path

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.implicitly_wait(1)
        return driver
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

def return_lxml(url):
    import requests
    import lxml.html
    user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
    header = {'User-Agent': user_agent}
    response = requests.get(url,headers=header)
    response.encoding = response.apparent_encoding
    html = lxml.html.fromstring(response.text)
    # htmlを保存
    with open('lxml.html', 'w') as file:
        file.write(response.text)
    #タグを見る
    #print(lxml.html.tostring(html))
    return html

def get_current_price_yahoo(code, indices=False):
    """
    Fetch current stock price and related information from Yahoo Finance Japan.
    
    Args:
        code (int or str): Stock code number
        indices (bool): Whether this is a market index instead of a stock
        
    Returns:
        dict: Stock information including price, company details and metrics
    """
    try:
        # Build URL and fetch page content
        url = f'https://finance.yahoo.co.jp/quote/{str(code)}.T'
        if indices:
            url = f'https://finance.yahoo.co.jp/quote/{str(code)}'
        lxml = return_lxml(url)
        
        def safe_xpath_extract(xpath_str, index=0):
            """Safely extract content from xpath with error handling"""
            try:
                elements = lxml.xpath(xpath_str)
                if elements and len(elements) > index:
                    return elements[index]
                return None
            except Exception as e:
                print(f"XPath extraction failed for {xpath_str}: {str(e)}")
                return None

        def clean_value(element):
            """Clean extracted values, handling None cases"""
            if element is None:
                return None
            try:
                value = element.text_content().replace(",", "").replace("+", "").replace("---", "").strip()
                return value
            except AttributeError:
                return None

        # XPath dictionary - organized by specific codes and general types
        xpath_dict = {
            # 特定のコード別にXPathを定義
            'specific_codes': {
                '998407.O': {  # 日経平均
                    'current_price': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[1]/span',
                    'price_change': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[2]/span[1]/span/span[2]',
                    'open': '//*[@id="detail"]/div/div/dl[2]/dd/span[1]',
                    'high': '//*[@id="detail"]/div/div/dl[3]/dd/span[1]',
                    'low': '//*[@id="detail"]/div/div/dl[4]/dd/span[1]'
                },
                '%5EDJI': {  # ダウ平均
                    'current_price': '//*[@id="mainIndexPriceBoard"]/section/div[2]/div[2]/div[1]/span/span/span',
                    'price_change': '//*[@id="mainIndexPriceBoard"]/section/div[2]/div[2]/div[1]/div/div/dl/dd/span/span[1]/span',
                    'open': '//*[@id="detail"]/section/div/ul/li[1]/dl/dd/span/span/span',
                    'high': '//*[@id="detail"]/section/div/ul/li[2]/dl/dd/span/span/span',
                    'low': '//*[@id="detail"]/section/div/ul/li[3]/dl/dd/span/span/span'
                },
                '%5EGSPC': {  # S&P 500
                    'current_price': '//*[@id="mainIndexPriceBoard"]/section/div[2]/div[2]/div[1]/span/span/span',
                    'price_change': '//*[@id="mainIndexPriceBoard"]/section/div[2]/div[2]/div[1]/div/div/dl/dd/span/span[1]/span',
                    'open': '//*[@id="detail"]/section/div/ul/li[1]/dl/dd/span/span/span',
                    'high': '//*[@id="detail"]/section/div/ul/li[2]/dl/dd/span/span/span',
                    'low': '//*[@id="detail"]/section/div/ul/li[3]/dl/dd/span/span/span'
                },
                'USDJPY=FX': {  # ドル/円
                    'current_price': '//dt[contains(text(), "Bid（売値）")]/following-sibling::dd[1]',
                    'price_change': '//dt[contains(text(), "前日比")]/following-sibling::dd[1]/span',
                    'open': '//dt[contains(text(), "始値")]/following-sibling::dd[1]/span',
                    'high': '//dt[contains(text(), "高値")]/following-sibling::dd[1]/span',
                    'low': '//dt[contains(text(), "安値")]/following-sibling::dd[1]/span'
                },
                '998405.T': {  # TOPIX
                    'current_price': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[1]/span',
                    'price_change': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[2]/span[1]/span/span[2]',
                    'open': '//*[@id="detail"]/div/div/dl[2]/dd/span[1]',
                    'high': '//*[@id="detail"]/div/div/dl[3]/dd/span[1]',
                    'low': '//*[@id="detail"]/div/div/dl[4]/dd/span[1]' 
                }
            },
            # 一般的なインデックス用
            'indices': {
                'company_name': '//*[contains(@class, "PriceBoardMain__name")]',
                'current_price': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[1]/span',
                'price_change': '//*[@id="root"]/main/div/div[2]/div[2]/div[3]/p[2]/span[1]/span/span[2]',
                'open': '//*[@id="detail"]/div/div/dl[2]/dd/span[1]',
                'high': '//*[@id="detail"]/div/div/dl[3]/dd/span[1]',
                'low': '//*[@id="detail"]/div/div/dl[4]/dd/span[1]',
                'volume': '//*[@id="detail"]/div/div/dl[5]/dd/span[1]/span/span[1]'
            },
            # 一般的な株式用
            'stocks': {
                'company_name': '//*[contains(@class, "PriceBoardMain__name")]',
                'current_price': '//*[@id="root"]/main/div/section/div[2]/div[2]/div[1]/span/span/span',
                'current_price_alt': '//*[@id="detail"]/section[1]/div/ul/li[1]/dl/dd/span[1]/span/span',
                'price_change': '//*[@id="root"]/main/div/section/div[2]/div[2]/div[1]/div/div/dl/dd/span/span[1]/span',
                'open': '//*[@id="detail"]/section[1]/div/ul/li[2]/dl/dd/span[1]',
                'high': '//*[@id="detail"]/section[1]/div/ul/li[3]/dl/dd/span[1]',
                'low': '//*[@id="detail"]/section[1]/div/ul/li[4]/dl/dd/span[1]',
                'volume': '//*[@id="detail"]/section[1]/div/ul/li[5]/dl/dd/span[1]/span/span[1]',
                'per': '//*[@id="referenc"]/div/ul/li[5]/dl/dd/a/span[1]/span/span[2]',
                'pbr': '//*[@id="referenc"]/div/ul/li[6]/dl/dd/a/span[1]/span/span[2]',
                'market_cap': '//*[@id="referenc"]/div/ul/li[1]/dl/dd/span[1]/span/span[1]',
                'divided_rate': '//*[@id="referenc"]/div/ul/li[1]/dl/dd/span[1]/span/span[1]',
                'roe': '//*[@id="referenc"]/div/ul/li[9]/dl/dd/span[1]/span/span[2]'
            }
        }
        
        # Select the appropriate xpath set
        # 1. Check if there's a specific xpath set for this code
        # 2. If not, use general xpath based on indices flag
        specific_xpath = xpath_dict['specific_codes'].get(str(code))
        general_xpath = xpath_dict['indices'] if indices else xpath_dict['stocks']
        
        # Extract company name (always from general xpath)
        company_name_element = safe_xpath_extract(general_xpath['company_name'])
        company_name = clean_value(company_name_element)
        if company_name:
            company_name = company_name.replace("(株)", "").strip()

        # Extract main price information - use specific xpath if available
        if specific_xpath and 'current_price' in specific_xpath:
            price_element = safe_xpath_extract(specific_xpath['current_price'])
        else:
            price_element = safe_xpath_extract(general_xpath['current_price'])
        
        current_price = clean_value(price_element)
        print("current_price:"+str(current_price))
        
        # Try alternate xpath for current price if needed
        if current_price == "" and not indices and 'current_price_alt' in general_xpath:
            price_element = safe_xpath_extract(general_xpath['current_price_alt'])
            current_price = clean_value(price_element)
        
        # Get price change
        if specific_xpath and 'price_change' in specific_xpath:
            change_element = safe_xpath_extract(specific_xpath['price_change'])
        else:
            change_element = safe_xpath_extract(general_xpath['price_change'])
            
        price_change = clean_value(change_element)
        if price_change == "":
            price_change = 0
        
        # 変動率（diff_percent）の計算
        try:
            current_price = float(current_price) if current_price else 0
            price_change = float(price_change) if price_change else 0
            
            # 前日終値を計算（現在値 - 変化額）
            yesterday_close = current_price - price_change
            
            # 変動率を計算（変化額 / 前日終値 * 100）
            if yesterday_close != 0:
                diff_percent = (price_change / yesterday_close) * 100
                # 小数点2位まで丸める
                diff_percent = round(diff_percent, 2)
            else:
                diff_percent = 0
        except (ValueError, TypeError):
            diff_percent = 0
        
        close = current_price

        # OHLV data - use specific xpath if available
        if specific_xpath and 'open' in specific_xpath:
            open_element = safe_xpath_extract(specific_xpath['open'])
        else:
            open_element = safe_xpath_extract(general_xpath['open'])
            
        if specific_xpath and 'high' in specific_xpath:
            high_element = safe_xpath_extract(specific_xpath['high'])
        else:
            high_element = safe_xpath_extract(general_xpath['high'])
            
        if specific_xpath and 'low' in specific_xpath:
            low_element = safe_xpath_extract(specific_xpath['low'])
        else:
            low_element = safe_xpath_extract(general_xpath['low'])
        
        open_price = clean_value(open_element)
        high = clean_value(high_element)
        low = clean_value(low_element)
        
        # Volume (use general xpath as volume may not be defined in specific xpath)
        volume_element = safe_xpath_extract(general_xpath['volume'])
        volume = clean_value(volume_element)

        # Financial metrics - only for stocks
        per = None
        pbr = None
        market_cap = 0
        divided_rate = 0
        roe = None
        
        if not indices:
            per_element = safe_xpath_extract(general_xpath['per'])
            per = clean_value(per_element)
            
            pbr_element = safe_xpath_extract(general_xpath['pbr'])
            pbr = clean_value(pbr_element)
            
            market_cap_element = safe_xpath_extract(general_xpath['market_cap'])
            market_cap = clean_value(market_cap_element)
            if market_cap is not None and market_cap != "":
                try:
                    market_cap = int(market_cap) * 1000000
                except (ValueError, TypeError):
                    market_cap = 0
            else:
                market_cap = 0
            
            divided_rate_element = safe_xpath_extract(general_xpath['divided_rate'])
            divided_rate = clean_value(divided_rate_element)
            if divided_rate == "":
                divided_rate = 0
            
            roe_element = safe_xpath_extract(general_xpath['roe'])
            roe = clean_value(roe_element)

        # ディクショナリ形式で結果を返却
        result = {
            'company_name': company_name,
            'current_price': current_price,
            'price_change': price_change, 
            'diff_percent': diff_percent,
            'close': close,
            'open': open_price,
            'high': high,
            'low': low,
            'volume': volume,
            'per': per,
            'pbr': pbr,
            'roe': roe,
            'market_cap': market_cap,
            'dividend_rate': divided_rate
        }
        
        print(f"Retrieved data for {code}: {company_name}, Price: {current_price}")
        return result

    except Exception as e:
        print(f"Error processing data for code {code}: {str(e)}")
        # エラー時は空のディクショナリを返す
        return {
            'company_name': None,
            'current_price': None,
            'price_change': None,
            'diff_percent': None,
            'close': None,
            'open': None,
            'high': None,
            'low': None,
            'volume': None,
            'per': None,
            'pbr': None,
            'roe': None,
            'market_cap': None,
            'dividend_rate': None
        }

def is_not_holiday(target_date=None):
    if target_date is None:
        target_date = datetime.now().date()
    
    if target_date.weekday() >= 5:
        return False
    
    if jpholiday.is_holiday(target_date):
        return False
    
    return True

def code_array():
    code_array = []
    sql = "select code from company where market in (1,2,3,11);"
    result = select_sql(sql)
    for row in result:
        code_array.append(row["code"])
    return code_array

def get_theme():
    # CSVファイルを読み込む
    additional_theme = pd.read_csv('csv/additional_theme.csv', header=None)
    japanese_stock_theme = pd.read_csv('csv/日本の株式テーマ.csv', header=None)
    theme_exception = pd.read_csv('csv/theme_exception.csv', header=None)

    # 最初の列を取得して配列に変換
    #combined_themes = additional_theme[0].tolist() + japanese_stock_theme[0].tolist()
    combined_themes = japanese_stock_theme[0].tolist()

    # 除外リストにある要素を配列から除外
    filtered_themes = [theme for theme in combined_themes if theme not in theme_exception[0].tolist()]

    return filtered_themes

def upload_file(local_file_path: str, remote_path: str) -> None:
    """
    ローカルファイルをリモートサーバーにアップロードする関数
    
    Args:
        local_file_path: アップロードするローカルファイルのパス
        remote_path: リモートサーバーでの保存パス
    """
    import os
    import paramiko

    host = '133.130.102.77'
    username = 'root'
    password = '***REMOVED_DB_PASSWORD***'
    port = 22  # SFTPのデフォルトポート

    # SFTPセッションの開始
    transport = paramiko.Transport((host, port))
    transport.connect(username=username, password=password)
    sftp = paramiko.SFTPClient.from_transport(transport)

    try:
        print(f"ローカル: {local_file_path}")
        print(f"リモート: {remote_path}")
        
        # リモートパスのディレクトリを作成（存在しない場合）
        remote_dir = os.path.dirname(remote_path)
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            sftp.mkdir(remote_dir)

        # ファイルをアップロード
        sftp.put(local_file_path, remote_path)
        print("アップロード成功")

    finally:
        sftp.close()
        transport.close()

def jp_date_to_datetime(jp_date):
    import datetime

    year = datetime.datetime.now().year
    return_date = jp_date

    if "年" in jp_date:
        year = jp_date.split("年")[0]
        jp_date = jp_date.split("年")[1]
        month = jp_date.split("月")[0]
        day = jp_date.split("月")[1].split("日")[0]
        return_date = str(year)+"-"+month+"-"+day+" 00:00:00"
    elif "月" in jp_date:
        month = jp_date.split("月")[0]
        day = jp_date.split("月")[1].split("日")[0]
        return_date = str(year)+"-"+month+"-"+day+" 00:00:00"
    elif "日" in jp_date:
        day = jp_date.split("日")[0]
        month = datetime.datetime.now().month
        return_date = str(year)+"-"+str(month)+"-"+day+" 00:00:00"
    return return_date

def is_trading_day(date: datetime.date) -> bool:
    """指定した日が平日かつ祝日でなければ営業日とする"""
    return date.weekday() < 5 and not jpholiday.is_holiday(date)

def count_elapsed_trading_days(start_date: str, end_date: str = None) -> int:
    """
    指定した start_date (YYYY-MM-DD) 以降に経過した営業日数を返す。
    ※ start_date 自体はカウントしません。
    
    end_date が指定されない場合は、本日の日付を使用します。
    """
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    else:
        end = datetime.date.today()
    
    count = 0
    current = start + timedelta(days=1)
    while current <= end:
        if is_trading_day(current):
            count += 1
        current += timedelta(days=1)
    return count

def str_to_datetime(str_date):
    if "年" in str_date or "月" in str_date or "日" in str_date:
        return jp_date_to_datetime(str_date)
    else:
        pass

def windows_scroll(driver):
    import time
    loop_num = 0
    current_window_height = driver.execute_script("return window.innerHeight")

    while True:
        loop_num += 1
        driver.execute_script("window.scrollBy(0, 30)")
        time.sleep(0.01)

        if loop_num % 2000 == 0:
            new_window_height = driver.execute_script("return window.innerHeight")
            if new_window_height == current_window_height:
                break

            current_window_height = new_window_height

#return list
def generate_random_ips(count):
    import socket
    import struct
    import random
    # プライベートIPアドレスの範囲を定義
    private_ip_ranges = [
        ("10.0.0.0", "10.255.255.255"),
        ("172.16.0.0", "172.31.255.255"),
        ("192.168.0.0", "192.168.255.255")
    ]

    # ランダムなIPアドレスを格納するリスト
    random_ips = []

    for _ in range(count):
        # ランダムにプライベートIPアドレスの範囲を選択
        start_ip, end_ip = random.choice(private_ip_ranges)

        # 開始IPアドレスと終了IPアドレスをパックされた形式に変換
        start = struct.unpack(">I", socket.inet_aton(start_ip))[0]
        end = struct.unpack(">I", socket.inet_aton(end_ip))[0]

        # ランダムなIPアドレスを生成
        ip = socket.inet_ntoa(struct.pack(">I", random.randint(start, end)))

        # 生成されたIPアドレスをリストに追加
        random_ips.append(ip)

    return random_ips

def get_current_main_price_yahoo(code):
    join_sql = "SELECT company.name, company_info.current_price, company_info.diff_percent, company_info.diff_percent FROM company_info JOIN company ON company_info.code = company.code WHERE company.code = '"+str(code)+"';"
    result = select_sql(join_sql)
    if not result:
        return None
    
    # 結果をディクショナリ形式で返す
    return {
        'name': result[0]['name'],
        'current_price': result[0]['current_price'],
        'diff_percent': result[0]['diff_percent']
    }

def format_comment(comment):
    """
    Format a single comment into a string
    """
    try:
        date = datetime.strptime(comment['comment_date'], '%Y-%m-%d %H:%M:%S').strftime('%Y/%m/%d %H:%M')
        return f"{date} {comment['comment']}"
    except Exception as e:
        print(f"Error formatting comment: {e}")
        return ""

def get_comments_by_code(code: str, limit: int, today_only: bool = False):
    import pytz
    """
    Get comments from MongoDB for a specific stock code
    
    Args:
        code:       株式コード (str)
        limit:      最大取得件数 (int)
        today_only: True の場合、本日分のみ取得
    
    Returns:
        str: フォーマットされたコメントの文字列。コメントがない場合は空文字列
    """
    try:
        # MongoDBクライアントの初期化
        client = MongoClient('mongodb://meiteko:***REMOVED_DB_PASSWORD_URLENC***@133.130.102.77:27017/')
        db = client['kabu_ai']
        collection = db['yahoo_comment']

        # 基本的なクエリ条件
        query_conditions = {'code': str(code)}  # code は必ず文字列化
        sort_conditions = [('comment_date', -1)]

        # today_only が True の場合のみ、本日の日付でフィルタリング
        if today_only:
            jst = pytz.timezone('Asia/Tokyo')
            now_jst = datetime.now(jst)
            today_str = now_jst.strftime('%Y-%m-%d')
            
            start_str = f"{today_str} 00:00:00"
            end_str   = f"{today_str} 23:59:59"
            
            query_conditions['comment_date'] = {
                '$gte': start_str,
                '$lte': end_str
            }
        
        # クエリの実行
        comments = list(collection.find(
            query_conditions,
            sort=sort_conditions,
            limit=limit
        ))
        
        # コメントが見つからない場合は空文字列を返す
        if not comments:
            return ""
        
        # コメント整形
        formatted_comments = [format_comment(c) for c in comments]
        return "\n".join(formatted_comments)
    
    except Exception as e:
        print(f"MongoDB query error for code {code}: {e}")
        return ""  # エラーの場合も空文字列を返す

def get_ranking_codes():
    query = "SELECT DISTINCT code FROM ranking_yahoo_post"
    result = select_sql(query)
    if not result:
        return []
    return [row['code'] for row in result]

def remove_markdown(text: str) -> str:
    """
    テキストからMarkdown記法を取り除く関数

    Args:
        text (str): Markdown形式のテキスト

    Returns:
        str: Markdown記法が取り除かれたプレーンテキスト
    """
    # 見出し（#）を削除
    text = text.replace('#', '')
    
    # 太字（**）を削除
    text = text.replace('**', '')
    
    # 斜体（*）を削除
    text = text.replace('*', '')
    
    # バッククォート（`）を削除
    text = text.replace('`', '')
    
    # リストマーカーのハイフン（-）の削除
    # 「-」の直後が数字でない場合のみ削除する
    text = re.sub(r'-(?!\d)', '', text)
    
    # リンク記法を削除 [text](url) -> text
    while '[' in text and '](' in text and ')' in text:
        start = text.find('[')
        middle = text.find('](')
        end = text.find(')', middle)
        if start != -1 and middle != -1 and end != -1:
            link_text = text[start+1:middle]
            text = text[:start] + link_text + text[end+1:]
        else:
            break
    
    return text.strip()

def get_market_indices_data():
    """
    market=12のデータを取得し、各指標のYahoo Financeから最新情報を取得する関数
    
    Returns:
        list: 各マーケット指標の情報を含む辞書のリスト
    """
    # market=12のデータを取得
    sql_query = "SELECT * FROM company WHERE code in (0,1,2,3,4);"
    market_indices = select_sql(sql_query)
    
    if not market_indices:
        print("No market indices found with market=12")
        return []
    
    results = []
    
    for index in market_indices:
        code = index.get('code')
        
        # コードに基づいて適切なYahoo Finance URLを構築
        yahoo_code = ""
        use_indices = True
        
        if code == "0":
            yahoo_code = "998407.O" #日経平均
        elif code == "1":
            yahoo_code = "%5EDJI"  # ^DJI (ダウ平均)
        elif code == "2":
            yahoo_code = "%5EGSPC"  # ^GSPC (S&P 500)
        elif code == "3":
            yahoo_code = "USDJPY=FX"  # ドル/円
        elif code == "4":
            yahoo_code = "998405.T"  # TOPIX
            use_indices = True
        else:
            # その他のコードは直接使用
            yahoo_code = str(code)

        print("yahoo_code:"+yahoo_code)
            
        # Yahoo Financeからデータを取得
        print(f"Fetching data for {index.get('name')} (Code: {code}, Yahoo Code: {yahoo_code})")
        price_data = get_current_price_yahoo(yahoo_code, indices=use_indices)
        
        # 元のインデックス情報と取得したデータを結合
        if price_data:
            result = {**index, **price_data}
            results.append(result)
            
            # データベースに最新価格を更新する場合はここに処理を追加
            # 例: update_price_to_database(code, price_data)
    
    return results

def update_market_indices_prices():
    """
    マーケット指標の最新価格をデータベースに更新し、priceテーブルにも記録する関数
    """
    from datetime import datetime

    print("call; update_market_indices_prices")
    today = datetime.now().date()
    
    indices_data = get_market_indices_data()
    
    for index in indices_data:
        code = index.get('code')
        current_price = index.get('current_price')
        diff_percent = index.get('diff_percent')
        price_change = index.get('price_change')
        
        # company_infoテーブルの更新
        if code is not None and current_price is not None:
            update_sql = f"""
            UPDATE company_info 
            SET current_price = {current_price}, 
                diff_percent = {diff_percent} 
            WHERE code = '{code}'
            """
            sql(update_sql)
            
            print(f"Updated price for {index.get('name')} (Code: {code}): {current_price}, Change: {diff_percent}%")
        
        # priceテーブルにデータを挿入
        open_price = index.get('open')
        high = index.get('high')
        low = index.get('low')
        close = index.get('close')
        volume = index.get('volume')
        
        # 必要なデータがある場合にのみpriceテーブルに挿入
        if all(x is not None for x in [open_price, high, low, close]):
            price_sql = f"""
            INSERT INTO price (code, date, open, high, low, close, volume)
            VALUES (
                '{code}',
                '{today.strftime('%Y-%m-%d')}',
                {float(open_price) if open_price is not None and open_price != "" else 'NULL'},
                {float(high) if high is not None and high != "" else 'NULL'},
                {float(low) if low is not None and low != "" else 'NULL'},
                {float(close) if close is not None and close != "" else 'NULL'},
                {int(float(volume)) if volume is not None and volume != "" else 0}
            )
            ON DUPLICATE KEY UPDATE
                open = VALUES(open),
                high = VALUES(high),
                low = VALUES(low),
                close = VALUES(close),
                volume = VALUES(volume)
            """
            sql(price_sql)
            print(f"Inserted price data for {index.get('name')} (Code: {code}): Price={current_price}, Change={diff_percent}%, PriceChange={price_change}, O={open_price}, H={high}, L={low}, C={close}, V={volume} on {today}")
    
    return indices_data