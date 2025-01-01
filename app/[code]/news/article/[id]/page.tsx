'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import './post.css';

interface Article {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
}

interface ShareButtonProps {
  url: string;
  text?: string;
}

const TwitterShareButton = ({ url, text = '' }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on X (Twitter)"
    >
      <X className="w-5 h-5 text-white" />
    </button>
  );
};

const FacebookShareButton = ({ url }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on Facebook"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 text-white fill-current"
      >
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
      </svg>
    </button>
  );
};

const LineShareButton = ({ url }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on LINE"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 text-white fill-current"
      >
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.066-.023.132-.033.2-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.28-.63.63-.63.349 0 .63.285.63.63v4.771h-.006zM9.973 8.108c0-.345-.282-.63-.631-.63-.345 0-.627.285-.627.63v4.771c0 .346.282.629.63.629.346 0 .628-.283.628-.629V8.108zm-4.418 5.4h-.59l.004-.002.004-.002h.582c.346 0 .629-.285.629-.63 0-.345-.285-.63-.631-.63H3.624a.669.669 0 0 0-.199.031c-.256.086-.43.325-.43.595v4.772c0 .346.282.629.63.629.348 0 .63-.283.63-.629V16.1h1.297c.348 0 .629-.283.629-.63 0-.345-.282-.63-.63-.63H4.255v-1.332h1.3zm14.916-11.113c-5.031-5.031-13.199-5.031-18.232 0-5.031 5.031-5.031 13.199 0 18.232 5.031 5.031 13.199 5.031 18.232 0 5.031-5.033 5.031-13.201 0-18.232z"/>
      </svg>
    </button>
  );
};

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

  const containsHTML = (str: string) => {
    const htmlRegex = /<[a-z][\s\S]*>/i;
    return htmlRegex.test(str);
  };

  const formatContent = (content: string) => {
    if (containsHTML(content)) {
      return (
        <div 
          className="prose max-w-none leading-relaxed text-gray-800"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="mx-auto">
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
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {article.company_name}
              </div>
              <div className="flex space-x-3">
                <TwitterShareButton url={currentUrl} text={article.title} />
                <LineShareButton url={currentUrl} />
                <FacebookShareButton url={currentUrl} />
              </div>
            </div>
            <div className="post max-w-none leading-relaxed text-gray-800">
              {formatContent(article.content)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleDetail;