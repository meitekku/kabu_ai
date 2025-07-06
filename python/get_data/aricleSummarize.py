import sys
import os
# pythonディレクトリをパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
python_dir = os.path.dirname(current_dir)
sys.path.insert(0, python_dir)

# 絶対importを使用
from get_data import common_calc
from get_data import common_ai
import time
from get_data.chatGPT import chatGPT
from datetime import datetime
import pandas as pd
import re
import json
import pytz

chatbot = chatGPT.ChatGPT()

def check_generation_conditions():
    """
    記事生成の条件をチェックする関数
    
    Returns:
        bool: 条件を満たす場合True、満たさない場合False
    """
    jst = pytz.timezone('Asia/Tokyo')
    current_jst = datetime.now(jst)
    today_str = current_jst.strftime('%Y-%m-%d')
    
    # 条件1: 既に本日のsite=72の記事が存在するかチェック
    check_existing_sql = f"""
        SELECT COUNT(*) as count
        FROM post
        WHERE DATE(created_at) = '{today_str}'
        AND site = 72;
    """
    existing_result = common_calc.select_sql(check_existing_sql)
    if existing_result and existing_result[0]['count'] > 0:
        print(f"本日のsite=72の記事が既に存在します。生成をスキップします。")
        return False
    
    # 条件2: 本日15:30以降のpost（site != 0, accept = 1）が3つ以上あるかチェック
    check_posts_sql = f"""
        SELECT COUNT(*) as count
        FROM post
        WHERE DATE(created_at) = '{today_str}'
        AND created_at >= '{today_str} 15:30:00'
        AND site != 0
        AND accept = 1;
    """
    posts_result = common_calc.select_sql(check_posts_sql)
    post_count = posts_result[0]['count'] if posts_result else 0
    
    if post_count < 3:
        print(f"条件を満たすpostが{post_count}件しかありません（3件以上必要）。生成をスキップします。")
        return False
    
    print(f"生成条件を満たしています。対象post数: {post_count}件")
    return True

def get_todays_news_materials():
    """
    本日のニュース素材を取得する関数
    本日15:30以降のpostテーブルから、site=1または71でaccept=1のものを取得
    
    Returns:
        list: ニュース素材のリスト
    """
    jst = pytz.timezone('Asia/Tokyo')
    current_jst = datetime.now(jst)
    today_str = current_jst.strftime('%Y-%m-%d')
    
    material_sql = f"""
        SELECT p.id, p.title, p.content, p.created_at, 
               GROUP_CONCAT(DISTINCT c.code) as codes,
               GROUP_CONCAT(DISTINCT c.name) as company_names
        FROM post p
        LEFT JOIN post_code pc ON p.id = pc.post_id
        LEFT JOIN company c ON pc.code = c.code
        WHERE DATE(p.created_at) = '{today_str}'
        AND p.created_at >= '{today_str} 15:30:00'
        AND p.site IN (1, 71)
        AND p.accept = 1
        GROUP BY p.id, p.title, p.content, p.created_at
        ORDER BY p.created_at DESC
        LIMIT 10;
    """
    return common_calc.select_sql(material_sql)

def generate_news_content(materials):
    """
    ニュースコンテンツを生成する関数
    
    Args:
        materials (list): ニュース素材のリスト（postテーブルのデータ）
        
    Returns:
        tuple: (title, content) or (None, None) if generation fails
    """
    # プロンプトID 101を取得
    select_sql = "SELECT prompt FROM prompt WHERE id = 101;"
    result = common_calc.select_sql(select_sql)
    
    if not result or not result[0]["prompt"]:
        print("プロンプトID 101の取得に失敗しました")
        return None, None
    
    base_prompt = result[0]["prompt"]
    
    # ニュース素材を整形
    news_summary = ""
    for i, material in enumerate(materials):
        if i >= 5:  # 最大5件まで
            break
        news_summary += f"\n\n【投稿{i+1}】\n"
        if material.get('codes'):
            news_summary += f"銘柄コード: {material['codes']}\n"
        if material.get('company_names'):
            news_summary += f"企業名: {material['company_names']}\n"
        news_summary += f"タイトル: {material['title']}\n"
        news_summary += f"内容: {material['content'][:300]}...\n"
    
    # プロンプトにニュース素材を追加
    prompt = base_prompt + news_summary
    print(prompt)
    
    try:
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                chat_response = chatbot.chat(prompt, timeout=30)
                chat_response = common_calc.remove_markdown(chat_response)
                
                # タイトルとコンテンツを分割
                title, content = split_title_and_content(chat_response)
                return title, content
                
            except Exception as e:
                if attempt == max_retries:
                    print(f"ニュース生成が {max_retries + 1} 回失敗しました")
                    print(f"最終エラー: {str(e)}")
                    return None, None
                print(f"生成の試行 {attempt + 1}/{max_retries + 1} が失敗しました: {str(e)}")
                time.sleep(2)  # リトライ前に少し待機
                continue
    except Exception as e:
        print(f"ニュース生成中にエラーが発生しました: {str(e)}")
        return None, None

def split_title_and_content(text):
    """
    テキストをタイトルとコンテンツに分割する関数。
    """
    # ① 改行1回目で分割
    parts = re.split(r'\r\n|\r|\n', text, maxsplit=1)
    if len(parts) > 1:
        return parts[0].strip(), parts[1].strip()

    # ② 箇条書きパターンで分割
    if '・' in text:
        parts = text.split('・', 1)
        if len(parts) > 1:
            return parts[0].strip(), '・' + parts[1].strip()

    # ③ 空行で分割
    parts = re.split(r'\r?\n\s*\r?\n', text, maxsplit=1)
    if len(parts) > 1:
        return parts[0].strip(), parts[1].strip()

    # ④ スペースで分割
    parts = re.split(r'[\s　]', text, maxsplit=1)
    if len(parts) > 1:
        return parts[0].strip(), parts[1].strip()

    # ⑤ パーセントで分割
    percent_parts = text.split('%', 1)
    if len(percent_parts) > 1:
        return percent_parts[0].strip() + '%', percent_parts[1].strip()

    # どちらも該当しない場合
    return text.strip(), text.strip()

def insert_news_post(title, content, related_codes=None):
    """
    ニュース記事をpostテーブルに挿入する関数
    
    Args:
        title (str): 記事タイトル
        content (str): 記事内容
        related_codes (list, optional): 関連する企業コードのリスト
        
    Returns:
        int: 挿入された記事のID、失敗時はNone
    """
    insert_sql = """
        INSERT INTO post (
            title,
            content,
            site,
            accept,
            pickup,
            created_at,
            updated_at
        ) VALUES (
            '{}',
            '{}',
            72,
            0,
            0,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    """.format(
        title.replace("'", "''"),
        content.replace("'", "''")
    )
    
    conn = common_calc.connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql)
            cursor.execute("SELECT LAST_INSERT_ID()")
            result = cursor.fetchone()
            post_id = result["LAST_INSERT_ID()"] if result else None
            
            # post_codeテーブルに関連コードを挿入
            if post_id and related_codes:
                for code in related_codes:
                    # companyテーブルに存在するかチェック
                    check_query = "SELECT code FROM company WHERE code = %s"
                    cursor.execute(check_query, (code,))
                    if cursor.fetchone():
                        relation_query = """
                            INSERT INTO post_code (post_id, code)
                            VALUES (%s, %s)
                        """
                        cursor.execute(relation_query, (post_id, code))
                    else:
                        print(f"Warning: Company code '{code}' not found in company table")
            
            conn.commit()
            
            if post_id:
                print(f"ニュース記事を正常に挿入しました。ID: {post_id}")
                if related_codes:
                    print(f"関連コード: {related_codes}")
            
            return post_id
    except Exception as e:
        conn.rollback()
        print(f"記事の挿入中にエラーが発生しました: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None
    finally:
        conn.close()

def generate_daily_news():
    """
    毎日のニュース生成のメイン関数
    """
    # 休日チェック
    if not common_calc.is_not_holiday():
        print("本日は休日のため、処理をスキップします。")
        return
    
    # 生成条件チェック
    if not check_generation_conditions():
        return
    
    # ニュース素材を取得
    materials = get_todays_news_materials()
    if not materials:
        print("本日の条件を満たす投稿素材がありません。")
        return
    
    print(f"投稿素材を{len(materials)}件取得しました。")
    
    # ニュースコンテンツを生成
    title, content = generate_news_content(materials)
    if not title or not content:
        print("ニュース生成に失敗しました。")
        return
    
    print(f"生成されたタイトル: {title}")
    print(f"生成されたコンテンツ長: {len(content)}文字")
    
    # 関連するコードを取得（重複を除去）
    related_codes = []
    for material in materials:
        if material.get('codes'):
            codes = material['codes'].split(',')
            for code in codes:
                if code.strip() and code.strip() not in related_codes:
                    related_codes.append(code.strip())
    
    # データベースに挿入
    post_id = insert_news_post(title, content, related_codes)
    if post_id:
        # post_statusにも挿入（ニュース記事用のステータス）
        status_dict = {
            "news_generated": 1,
            "material_count": len(materials)
        }
        
        insert_status_sql = """
            INSERT INTO post_status (post_id, status) 
            VALUES ('{}', '{}');
        """.format(post_id, json.dumps(status_dict))
        
        common_calc.insert_sql(insert_status_sql)
        print("ニュース生成プロセスが完了しました。")
    else:
        print("ニュース記事の保存に失敗しました。")

if __name__ == "__main__":
    generate_daily_news()