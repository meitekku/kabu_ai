# main.py
from fastapi import FastAPI, HTTPException
from datetime import datetime, timedelta
import yfinance as yf
import json

app = FastAPI(
    title="Stock Price API",
    description="日本の株価情報を取得するAPIサーバー",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok"}

@app.get("/stock/{code}")
async def get_stock_price(code: str):
    """
    指定された証券コードの株価情報を取得します
    
    Parameters:
        code (str): 証券コード（4桁の数字）
    """
    today = datetime.now().date()
    week_ago = today - timedelta(days=10)
    
    try:
        ticker_symbol = f"{code}.T"
        stock_data = yf.download(ticker_symbol, start=week_ago, end=today + timedelta(days=1), progress=False)
        
        if not stock_data.empty:
            latest_data = stock_data.iloc[-1]
            previous_data = stock_data.iloc[-2] if len(stock_data) > 1 else latest_data
            
            current_price = float(latest_data['Close'])
            prev_price = float(previous_data['Close'])
            price_change = current_price - prev_price
            price_change_percent = ((current_price - prev_price) / prev_price) * 100
            
            return {
                'code': code,
                'current_price': current_price,
                'price_change': round(price_change, 2),
                'price_change_percent': round(price_change_percent, 2)
            }
            
        else:
            return {
                'code': code,
                'error': 'No data available'
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stocks")
async def get_multiple_stocks(codes: list[str]):
    """
    複数の証券コードの株価情報を一括取得します
    
    Parameters:
        codes (list[str]): 証券コードのリスト
    """
    results = []
    for code in codes:
        try:
            result = await get_stock_price(code)
            results.append(result)
        except HTTPException as e:
            results.append({
                'code': code,
                'error': e.detail
            })
    return {'results': results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)