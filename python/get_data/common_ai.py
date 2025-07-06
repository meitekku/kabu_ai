from . import common_calc

def get_relative_code(code):
    """
    指定された証券コードの関連銘柄情報を取得する

    Args:
        code (int): 証券コード

    Returns:
        list: 関連銘柄の情報を含む辞書のリスト
    """
    select_sql = f"""
        SELECT 
            c1.name as company_name,
            c2.name as relative_company_name,
            c2.code as relative_code,
            ci1.current_price as company_price,
            ci2.current_price as relative_price,
            ci2.price_change as relative_price_change,
            ci2.diff_percent as relative_diff_percent,
            rs.text as relative_company_text
        FROM company c1
        LEFT JOIN relative_stock rs ON c1.code = rs.code
        LEFT JOIN company c2 ON rs.relative_code = c2.code
        LEFT JOIN company_info ci1 ON c1.code = ci1.code
        LEFT JOIN company_info ci2 ON c2.code = ci2.code
        WHERE c1.code = {code};
    """
    relative_data = common_calc.select_sql(select_sql)
    return relative_data

def format_stock_title(name, code, diff_percent, text):
    """
    株式のタイトルを統一された形式で作成する
    
    Args:
        name (str): 会社名
        code (str/int): 証券コード
        price_change (str/int): 価格変動
        diff_percent (str/float): 変動率
        text (str): 関連情報
    Returns:
        str: 整形されたタイトル文字列
    """
    return f"【{name}({code})】{diff_percent}% {text}"

def get_price_history_text(code: int) -> str:
    """
    過去1週間の価格情報をテキスト形式で取得する

    Args:
        code (int): 証券コード

    Returns:
        str: 価格情報のテキスト
    """
    select_sql = f"""
        SELECT date, open, high, low, close, volume 
        FROM price 
        WHERE code = '{code}'
        AND date >= CURRENT_DATE - INTERVAL 7 DAY
        ORDER BY date DESC;
    """
    price_data = common_calc.select_sql(select_sql)
    
    if not price_data:
        return ""
    
    price_text = "過去1週間の価格推移:\n"
    for data in price_data:
        date_str = data['date'].strftime('%Y-%m-%d')
        price_text += f"{date_str}: 始値{data['open']}円 高値{data['high']}円 "
        price_text += f"安値{data['low']}円 終値{data['close']}円 出来高{data['volume']}株\n"
    
    return price_text

def get_relative_info(code):
    """
    関連銘柄の情報を整形された文字列として取得する

    Args:
        code (int): 証券コード
    
    Returns:
        str: 関連銘柄情報の文字列
    """
    relative_data = get_relative_code(code)
    relative_info = "関連銘柄情報:"
    for data in relative_data:
        if data["relative_company_name"] and data["relative_code"]:
            relative_title = format_stock_title(
                data["relative_company_name"],
                data["relative_code"],
                data.get("relative_price_change", ""),
                data.get("relative_diff_percent", ""),
                "関連情報:"+data.get("relative_company_text", "")
            )
            relative_info += f"{relative_title}\n"
    
    print(relative_info)
    return relative_info
