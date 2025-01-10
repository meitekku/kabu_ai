def get_daily_price_data(code):
    from datetime import datetime, timedelta
    import yfinance as yf
    import json

    today = datetime.now().date()
    week_ago = today - timedelta(days=10)
    
    try:
        ticker_symbol = f"{code}.T"
        stock_data = yf.download(ticker_symbol, start=week_ago, end=today + timedelta(days=1), progress=False)
        
        if not stock_data.empty:
            latest_data = stock_data.iloc[-1]
            previous_data = stock_data.iloc[-2] if len(stock_data) > 1 else latest_data
            
            current_price = float(latest_data['Close'].iloc[0])
            prev_price = float(previous_data['Close'].iloc[0])
            price_change = current_price - prev_price  # 価格変化額を計算
            price_change_percent = ((current_price - prev_price) / prev_price) * 100
            
            return json.dumps({
                'code': code,
                'current_price': current_price,
                'price_change': round(price_change, 2),  # 価格変化額を追加
                'price_change_percent': round(price_change_percent, 2)
            })
            
        else:
            return json.dumps({
                'code': code,
                'error': 'No data available'
            })
            
    except Exception as e:
        return json.dumps({
            'code': code,
            'error': str(e)
        })

# コマンドライン引数を処理するためのコード
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) > 1:
        code = sys.argv[1]
        result = get_daily_price_data(code)
        print(result)
    else:
        print(json.dumps({'error': 'No code provided'}))