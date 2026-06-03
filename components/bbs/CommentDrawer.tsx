"use client";

import { useState, useEffect } from "react";

interface YahooComment {
  id: string;
  name: string;
  comment: string;
  comment_date: string;
  is_useful: number | null;
}

interface StockTwitsComment {
  id: string;
  username: string;
  body: string;
  sentiment: string;
  comment_date: string;
}

interface CommentsData {
  yahoo: YahooComment[];
  stocktwits: StockTwitsComment[];
}

interface CommentDrawerProps {
  code: string;
  companyName: string;
  onClose: () => void;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr.replace(" ", "T") + "+09:00");
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "たった今";
    if (min < 60) return `${min}分前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  } catch {
    return "";
  }
}

export default function CommentDrawer({
  code,
  companyName,
  onClose,
}: CommentDrawerProps) {
  const [tab, setTab] = useState<"yahoo" | "stocktwits">("yahoo");
  const [data, setData] = useState<CommentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  // 初回レンダー後にアニメーション開始
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/bbs/comments/${code}`)
      .then((r) => r.json())
      .then((json: CommentsData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  // スライドアウトしてから親のonCloseを呼ぶ
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      {/* Backdrop — フェードイン */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer — スライドイン */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-sm">{companyName}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{code}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-base leading-none"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("yahoo")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "yahoo"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yahoo掲示板
            {data && (
              <span className="ml-1.5 text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                {data.yahoo.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("stocktwits")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "stocktwits"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            StockTwits
            {data && (
              <span className="ml-1.5 text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                {data.stocktwits.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && tab === "yahoo" && (
            <>
              {!data || data.yahoo.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  コメントがありません
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.yahoo.map((c) => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {c.name || "匿名"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(c.comment_date)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                        {c.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && tab === "stocktwits" && (
            <>
              {!data || data.stocktwits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  コメントがありません
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.stocktwits.map((c) => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            @{c.username}
                          </span>
                          {c.sentiment && c.sentiment !== "" && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                c.sentiment === "Bullish"
                                  ? "bg-shikiho-positive/10 text-shikiho-positive"
                                  : "bg-shikiho-negative/10 text-shikiho-negative"
                              }`}
                            >
                              {c.sentiment === "Bullish" ? "強気" : "弱気"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(c.comment_date)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed break-words">
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
