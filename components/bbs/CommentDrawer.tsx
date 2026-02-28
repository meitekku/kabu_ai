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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{companyName}</h3>
            <p className="text-xs text-gray-400 font-mono">{code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("yahoo")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "yahoo"
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            💬 Yahoo掲示板
            {data && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {data.yahoo.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("stocktwits")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "stocktwits"
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🐦 StockTwits
            {data && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {data.stocktwits.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!loading && tab === "yahoo" && (
            <>
              {!data || data.yahoo.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  コメントがありません
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.yahoo.map((c) => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {c.name || "匿名"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(c.comment_date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line break-words">
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
                <div className="text-center py-12 text-gray-400 text-sm">
                  コメントがありません
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.stocktwits.map((c) => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            @{c.username}
                          </span>
                          {c.sentiment && c.sentiment !== "" && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                c.sentiment === "Bullish"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {c.sentiment === "Bullish" ? "強気" : "弱気"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(c.comment_date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed break-words">
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
