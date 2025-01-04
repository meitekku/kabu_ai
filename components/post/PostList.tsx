import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PostTitle {
  id: number;
  title: string;
  created_at?: string; // 日付フィールドを追加
}

interface PostTitleListProps {
  numPosts: number;
  fontSize?: number;
  onError?: (error: string) => void;
  className?: string;
}

interface ApiResponse {
  status: 'success' | 'error';
  data?: PostTitle[];
  message?: string;
}

const PostTitleList: React.FC<PostTitleListProps> = ({ 
  numPosts = 5,
  fontSize = 16,
  onError,
  className = ''
}) => {
  const [posts, setPosts] = useState<PostTitle[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            num: numPosts,
            // リクエストにタイムゾーン情報を含める
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        
        if (!isMounted) return;

        if (data.status === 'success' && data.data) {
          setPosts(data.data);
        } else {
          const errorMessage = data.message || 'Failed to fetch posts';
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [numPosts, onError]);

  if (loading) {
    return (
      <div className="w-full p-4 animate-pulse">
        {[...Array(numPosts)].map((_, index) => (
          <div 
            key={index}
            className="h-6 bg-gray-200 rounded mb-2"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <ul className={`w-full space-y-2 ${className}`}>
      {posts.map((post) => (
        <li
          key={post.id}
          className="overflow-hidden hover:text-gray-600 transition-colors"
          style={{
            fontSize: `${fontSize}px`,
            WebkitLineClamp: 1,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
          }}
        >
          {post.title}
          {post.created_at && (
            <span className="text-sm text-gray-500 ml-2">
              {post.created_at}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default PostTitleList;