'use client';

import React, { useState, useEffect } from 'react';

interface Comment {
  source: string;
  body: string;
  username: string;
  sentiment: string | null;
  comment_date: string;
}

const USCommentList = ({ code }: { code: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/stocks/${code}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, limit: 50 }),
        });
        const data = await response.json();
        if (data.success) {
          setComments(data.data);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [code]);

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    const lower = sentiment.toLowerCase();
    if (lower === 'bullish') {
      return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Bullish</span>;
    }
    if (lower === 'bearish') {
      return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Bearish</span>;
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="px-2 py-3">
      <h2 className="text-base font-bold mb-3">StockTwits Comments</h2>
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments available yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment, index) => (
            <div key={index} className="border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700">@{comment.username}</span>
                {getSentimentBadge(comment.sentiment)}
                <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.comment_date)}</span>
              </div>
              <p className="text-sm text-gray-800">{comment.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default USCommentList;
