import common_calc
import common_ai
import time
import claude.bedrock as claude
from datetime import datetime
import pandas as pd
import re
import json
chatbot = claude.BedrockClient()
def get_settlement_status(code):
    """
    決算日からの日数を計算し、状態を返す
    
    Args:
        code (str): 企業コード
    
    Returns:
        int: 決算日との関係を示す数値。
             決算前: マイナス値（例: -3は決算3日前）
             決算日: 0
             決算後: プラス値（例: 2は決算2日後）
             決算日が設定されていない場合や3日以上離れている場合: None
    """
    # 決算日を取得
    select_sql = f"""
        SELECT settlement_date
        FROM company_info
        WHERE code = '{code}'
        AND settlement_date IS NOT NULL;
    """
    result = common_calc.select_sql(select_sql)

    if not result or not result[0]['settlement_date']:
        return None
        
    settlement_date = result[0]['settlement_date']
    if isinstance(settlement_date, str):
        settlement_date = datetime.strptime(settlement_date, '%Y-%m-%d %H:%M:%S')
    
    # 現在時刻
    now = datetime.now()
    
    # 日付の差を営業日数で計算
    settlement_str = settlement_date.strftime('%Y-%m-%d')
    now_str = now.strftime('%Y-%m-%d')
    
    if settlement_date.date() > now.date():
        # 決算日が未来の場合
        trading_days = common_calc.count_elapsed_trading_days(now_str, settlement_str)
        if trading_days > 3:
            return None
        else:
            return -trading_days  # 決算前はマイナス値
    else:
        # 決算日が過去の場合
        trading_days = common_calc.count_elapsed_trading_days(settlement_str, now_str)
        if trading_days > 3:
            return None
        else:
            return trading_days  # 決算後はプラス値

def twitter_yahoo_ranking(code):
    select_sql = f"""
        SELECT c.name, ci.price_change, ci.diff_percent
        FROM company c 
        LEFT JOIN company_info ci ON c.code = ci.code 
        WHERE c.code = {code};
    """
    company_data = common_calc.select_sql(select_sql)
    company_name = company_data[0]["name"]
    price_change = company_data[0]["price_change"]
    diff_percent = company_data[0]["diff_percent"]
    
    if price_change > 0:
        price_change = f"+{price_change}"
    
    if not company_name:
        print(f"会社名が取得できませんでした。コード: {code}")
        return ""
    
    prompt = f"""
        メタ認知で書くこと

        あなたは投資の専門家で、影響力のあるTwitterアカウント運営者です。投資家向け掲示板の情報を元に、魅力的なツイートを作成し、あなたが作った文章をそのまま添削せず記事にします。
        その記事を書き、フォロワー獲得を目指します。以下の点に注意してください:

        初めの方の株価の％を参考に書いてください
        タイトルの後に株価前日比と％を付け足してください。その横に簡潔に内容を一言で書くように。

        一番初めの入り
        【{company_name}({code})】前日比{price_change}円({diff_percent}%) 冒頭の初めの番号を参考に。　分析の内容の見出しの順で書くこと（ここは守ること記号等も同じで） 該当企業の後は
        掲示板の要点と、それが株価にどのような影響を与えるかを簡潔に記述。関連する銘柄や業界を明確に示す。株式番号も記載　　結論を最初に持ってほしい

        ・最初の2行で、注目されている部分を説明。
        ・ 掲示板の詳細を簡潔にまとめ、価値ある洞察を提供。（ここも掲示板投資家の意見にまとめて箇条書きで3点書く）
        ・ この株への要素該当を分析:

        ・ポジティブな要素箇条書きで3つ　タイトルも併記
        ・ポジティブな要素: 箇条書き、必ず3点の全ての箇条書きの各頭に絵文字の🟢をつけて記載3点

        ・ネガティブな要素　タイトルも併記
        ナガティブな要素3点全ての箇条書き、必ず全て各頭に絵文字の🔴をつけて

        ・掲示板投資家の意見と市場の反応: それぞれ3点ずつ箇条書きで記載。) 最後に、最後に、この該当株価が業界の中長期的な影響について簡潔に考察。。しかし機械っぽくない言葉遣い人間が書いたようにしてください。でも母数は多い方がいいです。
        ・ 最後に、この該当株価が業界の中長期的な影響について簡潔に考察。
        ニュースのまとめ方:
        ・読みやすさを重視し、簡潔な文章を心がける。
        ・絵文字は控えめに使用し、専門性と信頼性を損なわないよう注意。
        ・メタ認知、客観的な分析を心がけ、特定の投資行動を強く推奨しないよう注意。
        ・箇条書きを多めに利用して読みやすいように重要ポイントがわかるように
        ・そのままコピーペーストでツイートできるように読者がよくわからない数字などは出ないように。
        ・絵文字を使わず、記号を用いて視覚的にみやすくするように工夫すること。

        （具体的に説明すること、次の言葉は使わないように（リーディングカンパニー、グローバル、マクロ経済、地政学リスク等政治情勢変化によるリスク）

        ・投資家が〜人称賛していて期待してているみたいなのは書かないで
        また先週のもし新しいニュースがあればそれも記載して（なければかかないこと）
        コピーした時必ず　- 　ではなく・コピーできるようにしてください

        そのままツイートできるように文章書くこと、要点という前置き、分析結果という前置き、冒頭の前置きも要りません。

        必ず【該当株価名(該当株価番号)】から文章作成は行うように前置きは書かないこと。

        メタ認知で書くこと
        以下が掲示板のコメントです。
    """

    # コメント数を減らして処理を軽くする
    yahoo_comments = common_calc.get_comments_by_code(code, 300)
    prompt += yahoo_comments

    print("claudeにチャットします")
    print(prompt)

    start_time = time.time()
    
    # リトライロジックを追加
    max_retries = 2
    for attempt in range(max_retries + 1):  # 初回 + 2回リトライ
        try:
            print(f"リクエスト開始: {time.strftime('%H:%M:%S')}")
            chat_response = chatbot.chat(prompt, timeout=60)
            print(f"リクエスト完了: {time.strftime('%H:%M:%S')} (所要時間: {time.time() - start_time:.2f}秒)")
            break  # 成功したらループを抜ける
        except TimeoutError as te:
            elapsed = time.time() - start_time
            if attempt == max_retries:  # 最後のリトライでも失敗した場合
                print(f"コード {code} のチャットが {max_retries + 1} 回タイムアウトしました")
                print(f"タイムアウトエラーの詳細: {str(te)}")
                print(f"最終的な所要時間: {elapsed:.2f}秒")
                raise  # 最後のエラーを再度発生させる
            print(f"タイムアウトが発生しました。リトライ {attempt + 1}/{max_retries + 1}")
            print(f"エラー詳細: {str(te)}")
            print(f"経過時間: {elapsed:.2f}秒")
            continue
        except Exception as e:
            print(f"コード {code} のチャット中にエラーが発生しました")
            print(f"エラーの種類: {type(e).__name__}")
            print(f"エラーの詳細: {str(e)}")
            return

    try:
        max_retries = 2
        for attempt in range(max_retries + 1):  # 初回 + 2回リトライ
            try:
                # 【を含むニュース全体を取得するように修正
                news_content = chat_response.split('【', 1)[1] if '【' in chat_response else chat_response
                split_n = news_content.split('\n', 1)
                title = split_n[0]
                content = split_n[1] if len(split_n) > 1 else ""
                
                title = common_calc.remove_markdown(title)
                content = common_calc.remove_markdown(content)
                
                common_calc.insert_sql(
                    "INSERT INTO post (code,title,content,site,accept) VALUES ('{}','{}','{}',7,0);".format(
                        code,
                        title.replace("'", "''"),
                        content.replace("'", "''")
                    )
                )
                break  # 成功したらループを抜ける
            except Exception as e:
                if attempt == max_retries:  # 最後のリトライでも失敗した場合
                    print(f"コード {code} のデータ処理が {max_retries + 1} 回失敗しました")
                    print(f"最終エラー: {str(e)}")
                    raise  # 最後のエラーを再度発生させる
                print(f"データ処理の試行 {attempt + 1}/{max_retries + 1} が失敗しました: {str(e)}")
                continue
    except Exception as e:
        print(f"コード {code} のデータ処理中にエラーが発生しました: {str(e)}")

def insert_ranking_to_gemini(limit=30):
    for i, code in enumerate(common_calc.get_ranking_codes()):
        print(i, code)
        twitter_yahoo_ranking(code)
        if i == limit:
            break

def raising_volume(average_volume, current_volume):
    """
    average_volume: 過去の平均出来高
    current_volume: 現在の出来高
    戻り値: True なら「出来高が増えた」と判断、False ならそうでない
    """

    if average_volume < 2000:
        return current_volume > average_volume * 4.0
    elif average_volume < 8000:
        return current_volume > average_volume * 3.75
    elif average_volume < 30000:
        return current_volume > average_volume * 3.33
    elif average_volume < 100000:
        return current_volume > average_volume * 3.0
    elif average_volume < 300000:
        return current_volume > average_volume * 2.0
    elif average_volume < 600000:
        return current_volume > average_volume * 1.9
    elif average_volume < 1000000:
        return current_volume > average_volume * 1.8
    elif average_volume < 5000000:
        return current_volume > average_volume * 1.7
    elif average_volume < 10000000:
        return current_volume > average_volume * 1.6
    elif average_volume < 30000000:
        return current_volume > average_volume * 1.5
    elif average_volume < 50000000:
        return current_volume > average_volume * 1.4
    elif average_volume < 80000000:
        return current_volume > average_volume * 1.35
    else:
        return current_volume > average_volume * 1.3

def insert_sql_return_id(insert_sql):
    """
    SQLのINSERT文を実行し、挿入された行のIDを返す
    
    Args:
        insert_sql (str): 実行するINSERT SQL文
        
    Returns:
        int: 挿入された行のID、エラーの場合はNone
    """
    if insert_sql == "":
        return None

    conn = common_calc.connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql)
            # 最後に挿入された行のIDを取得
            cursor.execute("SELECT LAST_INSERT_ID()")
            result = cursor.fetchone()
            conn.commit()
            return result["LAST_INSERT_ID()"] if result else None
    except:
        print(insert_sql)
        import traceback
        print(traceback.format_exc())
        return None
    finally:
        conn.close()

def today_stock_post(code, material_data):
    select_sql = f"""
        SELECT c.name, p.volume, ci.price_change, ci.diff_percent, ci.volume_week_average, ci.settlement_date
        FROM company c 
        LEFT JOIN company_info ci ON c.code = ci.code 
        LEFT JOIN price p ON c.code = p.code
        WHERE c.code = '{code}'
        AND p.date = (
            SELECT MAX(date) 
            FROM price 
            WHERE code = '{code}'
        );
    """

    company_data = common_calc.select_sql(select_sql)
    if not company_data:
        print(f"コード {code} のデータが取得できませんでした")
        return
    
    company_name = company_data[0]["name"]
    if not company_name:
        print(f"会社名が取得できませんでした。コード: {code}")
        return ""
    
    price_change = company_data[0]["price_change"]
    diff_percent = company_data[0]["diff_percent"]
    volume = company_data[0]["volume"]
    volume_week_average = company_data[0]["volume_week_average"]

    if not volume:
        volume = 0
    if not volume_week_average:
        volume_week_average = 0

    status_dict = {}

    #=============================== prompt条件
    plus_num = 0
    addtional_prompt = ""
    addtional_main_prompt = ""
    if diff_percent > 2:
        plus_num += 1
        addtional_prompt += f"{plus_num}.本日の株価は{diff_percent}%上昇しています。"
        addtional_main_prompt += f"何が原因で株価が上昇したか原因を推測して記述すること"
        status_dict["price_up"] = 1
    elif diff_percent < -2:
        plus_num += 1
        addtional_prompt += f"{plus_num}.本日の株価は{diff_percent}%下落しています。"
        addtional_main_prompt += f"何が原因で株価が下落したか原因を推測して記述すること"
        status_dict["price_down"] = 1
    # 出来高の動き
    if raising_volume(volume_week_average, volume):
        #volume_percent = (int(volume) / int(volume_week_average) - 1) * 100
        plus_num += 1
        addtional_prompt += f"{plus_num}.出来高が増加。"
        addtional_main_prompt += f"何が原因で出来高が増加したか原因を推測して記述すること"
        status_dict["volume_up"] = 1
    # 決算発表日の通知
    settlement_days = get_settlement_status(code)
    settlement_status = ""
    if settlement_days is not None:
        if settlement_days < 0:
            settlement_status = f"決算発表まであと{abs(settlement_days)}日"
        elif settlement_days == 0:
            settlement_status = "本日決算発表日"
            status_dict["settlement"] = 0
        else:
            settlement_status = f"決算発表から{settlement_days}日目"
        
        status_dict["settlement"] = settlement_days
    
    print(settlement_status)
    if settlement_status:
        plus_num += 1
        addtional_prompt += f"{plus_num}.{settlement_status}"
        status_dict["settlement"] = 1

    # ここでmaterial_dataから該当のコードに関連する記事を探し、プロンプト条件に追加
    code_related_materials = []
    for material in material_data:
        # コード番号が記事内容に含まれているか確認
        if material["code"] == code:
            code_related_materials.append(material)
        status_dict["news"] = 1
    
    # プロンプト条件に関連記事を追加
    if code_related_materials:
        plus_num += 1
        addtional_prompt += f"{plus_num}.下記の本日のニュース\n"
        for material in code_related_materials:
            addtional_prompt += f"{material['title']}\n{material['content']}\n\n"

    if addtional_prompt != "":
        addtional_prompt = f"次の情報{plus_num}つの情報を必ずニュースの中に組み込むこと" + addtional_prompt

    #=============================== prompt条件 終わり
    
    # 株価の動き
    if price_change > 0:
        price_change = f"+{price_change}"
    
    todays_comments = common_calc.get_comments_by_code(code, 300, today_only=True)
    if len(todays_comments) > 200:
        status_dict["yahoo_increase"] = 1
    
    # 修正: text パラメータを追加
    # 簡単な説明テキストをデフォルトとして追加
    text = "株価の動き"
    main_title = common_ai.format_stock_title(company_name, code, price_change, diff_percent, text)

    common_prompt = """
            ニュースのまとめ方:
            ・{addtional_main_prompt}
            ・株価の上昇や下落につながったと思われることをメインにまとめること
            ・自分自身の意見としてまとめること
            ・客観性を重視すること
            ・読みやすさを重視し、簡潔な文章を心がける。
            ・ニュースの中に改行は入れないこと
            ・金融商品取引法に違反しない内容を記述すること

            下記の情報はニュースの元になる情報なので、それを参考にしてまとめること。
    """

    matomeru_prompt = """
        下記の情報はニュースの元になる意見なので、それを参考にしてまとめること。
    """

    prompt = ""
    if len(todays_comments) > 200 or addtional_prompt != "":
        prompt += f"""
            本日のニュースのみを250文字以内で作成して下さい。

            {addtional_prompt}

            必ず下記のタイトルからニュースを始めて、タイトルの後に改行をつけること
            {main_title}
            {common_prompt}

            {matomeru_prompt}
        """
        prompt += todays_comments
    else:
        return

    try:
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                chat_response = chatbot.chat(prompt, timeout=30)
                news_content = chat_response.split("【",)
                news_content = "【" + news_content[1]
                
                # 改行で分割
                split_n = news_content.split('\n', 1)
                title = split_n[0]
                content = split_n[1] if len(split_n) > 1 else ""
                
                title = common_calc.remove_markdown(title)
                content = common_calc.remove_markdown(content)
                
                # INSERT文を実行して、挿入されたIDを取得
                insert_sql = "INSERT INTO post (code,title,content,site,accept) VALUES ('{}','{}','{}',71,1);".format(
                    code,
                    title.replace("'", "''"),
                    content.replace("'", "''")
                )
                post_id = insert_sql_return_id(insert_sql)
                
                common_calc.insert_sql(
                    "INSERT INTO post_status (post_id,status) VALUES ('{}','{}');".format(
                        post_id,
                        json.dumps(status_dict)
                    )
                )
                break
            except Exception as e:
                if attempt == max_retries:
                    print(f"コード {code} のデータ処理が {max_retries + 1} 回失敗しました")
                    print(f"最終エラー: {str(e)}")
                    raise
                print(f"データ処理の試行 {attempt + 1}/{max_retries + 1} が失敗しました: {str(e)}")
                continue
    except Exception as e:
        print(f"コード {code} のデータ処理中にエラーが発生しました: {str(e)}")

def everyday_post(mode="all",test_code=None):
    """
    毎日のポスト処理を行う関数
    
    Args:
        mode (str): 処理モード。"all"=全て、"ranking"=ランキング銘柄のみ、"other"=その他銘柄のみ
    """
    material_sql = f"""
        SELECT code, title, content, article_time
        FROM material
        WHERE DATE(article_time) = CURRENT_DATE
        ORDER BY article_time DESC;
    """
    
    material_data = common_calc.select_sql(material_sql)
    ranking_codes = common_calc.get_ranking_codes()

    if test_code:
        ranking_codes = [test_code]
        today_stock_post(test_code, material_data)
        return
    
    # ランキングコードの処理
    if mode == "all" or mode == "ranking":
        print("ランキングコードの処理を開始")
        for i, code in enumerate(ranking_codes):
            print(f"ランキングコード {i+1}/{len(ranking_codes)}: {code}")
            today_stock_post(code, material_data)
    
    # 通常のコードを取得して処理
    if mode == "all" or mode == "other":
        all_codes_sql = "SELECT code FROM company ORDER BY code;"
        all_codes = common_calc.select_sql(all_codes_sql)
        all_codes = [item["code"] for item in all_codes if item["code"] not in ranking_codes]
        
        print("通常コードの処理を開始")
        for i, code in enumerate(all_codes):
            print(f"通常コード {i+1}/{len(all_codes)}: {code}")
            today_stock_post(code, material_data)