from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Stock Price API",
    description="日本の株価情報を取得するAPIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切なオリジンに制限してください
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockPrice(BaseModel):
    code: str
    current_price: float
    price_change: float
    price_change_percent: float

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok"}

@app.get("/stock/{code}", response_model=StockPrice)
async def get_stock_price(code: str):
    """
    指定された証券コードの株価情報を取得します
    
    Parameters:
        code (str): 証券コード（4桁の数字）
    """
    try:
        today = datetime.now().date()
        week_ago = today - timedelta(days=10)
        
        ticker_symbol = f"{code}.T"
        stock_data = yf.download(ticker_symbol, start=week_ago, end=today + timedelta(days=1), progress=False)
        
        if stock_data.empty:
            raise HTTPException(status_code=404, detail="No data available for this stock code")
            
        latest_data = stock_data.iloc[-1]
        previous_data = stock_data.iloc[-2] if len(stock_data) > 1 else latest_data
        
        # 警告を解消するため、.iloc[0]を使用
        current_price = float(latest_data['Close'].iloc[0]) if isinstance(latest_data['Close'], pd.Series) else float(latest_data['Close'])
        prev_price = float(previous_data['Close'].iloc[0]) if isinstance(previous_data['Close'], pd.Series) else float(previous_data['Close'])
        
        price_change = current_price - prev_price
        price_change_percent = (price_change / prev_price) * 100
        
        return StockPrice(
            code=code,
            current_price=round(current_price, 2),
            price_change=round(price_change, 2),
            price_change_percent=round(price_change_percent, 2)
        )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stock data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)