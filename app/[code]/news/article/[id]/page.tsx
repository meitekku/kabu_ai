'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Article {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
}

const ArticleDetail = () => {
  const params = useParams();
  const { code, id } = params;
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/${code}/news/article/${id}`, {
          method: 'POST'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        const data = await response.json();
        setArticle(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id && code) {
      fetchArticle();
    }
  }, [id, code]);

  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4 last:mb-0">
        {paragraph.split('\n').map((line, lineIndex) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < paragraph.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
    ));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading article...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!article) {
    return <div className="text-gray-500 p-4">Article not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link 
          href={`/${code}/news`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← ニュース一覧に戻る
        </Link>
      </div>
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{article.title}</h1>
              <div className="text-sm text-gray-500">
                {new Date(article.created_at).toLocaleString('ja-JP')}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {article.company_name}
            </div>
            <div className="prose max-w-none leading-relaxed text-gray-800">
              {formatContent(article.content)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleDetail;