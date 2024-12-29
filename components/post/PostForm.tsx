"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';

// PostTitleList コンポーネント
interface PostTitle {
  id: number;
  title: string;
}

interface PostTitleListProps {
  numPosts: number;
  fontSize?: number;
}

const PostTitleList: React.FC<PostTitleListProps> = ({ 
  numPosts = 5,
  fontSize = 16
}) => {
  const [posts, setPosts] = useState<PostTitle[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/post/get_list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ num: numPosts }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        if (data.status === 'success') {
          setPosts(data.data);
        } else {
          setError(data.message || 'Failed to fetch posts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [numPosts]);

  if (loading) {
    return <div className="w-full p-4">Loading...</div>;
  }

  if (error) {
    return <div className="w-full p-4 text-red-500">{error}</div>;
  }

  return (
    <ul className="w-full space-y-2">
      {posts.map((post) => (
        <li
          key={post.id}
          className="overflow-hidden"
          style={{
            fontSize: `${fontSize}px`,
            WebkitLineClamp: 1,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
          }}
        >
          {post.title}
        </li>
      ))}
    </ul>
  );
};

// メインのPostFormコンポーネント
export default function PostForm({ initialPostId = 'new' }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const postId = params?.post_id as string || initialPostId;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    code: '',
    accept: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!!postId);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || postId === 'new') {
        setIsLoading(false);
        return;
      }

      if (isNaN(Number(postId))) {
        setIsLoading(false);
        setMessage('無効なIDです');
        return;
      }

      try {
        const response = await fetch('/api/post/get_post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ post_id: Number(postId) })
        });
        
        const data = await response.json();

        if (data.status === 'success') {
          setFormData({
            title: data.data.title,
            content: data.data.content,
            code: data.data.code || '',
            accept: 1
          });
        } else {
          setMessage(data.message || 'データの取得に失敗しました');
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setMessage('データの取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const extractCode = (text: string) => {
    const fourDigits = text.match(/\d{4}/);
    if (fourDigits) return fourDigits[0];

    const threeDigitsOneLetter = text.match(/\d{3}[A-Za-z0-9]/);
    if (threeDigitsOneLetter) return threeDigitsOneLetter[0];

    return null;
  };

  const processContent = (content: string) => {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    const remainingLines = lines.slice(1).join('\n');
    return { firstLine, remainingLines };
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    const code = extractCode(newTitle);
    setFormData({
      ...formData,
      title: newTitle,
      code: code || formData.code
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    if (!formData.title.trim()) {
      const { firstLine, remainingLines } = processContent(newContent);
      const code = extractCode(firstLine);
      setFormData({
        ...formData,
        title: firstLine,
        content: remainingLines,
        code: code || ''
      });
    } else {
      setFormData({
        ...formData,
        content: newContent
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      setMessage('タイトルと内容を入力してください');
      return;
    }

    if (!formData.code) {
      alert('タイトルにコードを入れてください（4桁の数字、または3桁の数字+1文字）');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/post', {
        method: postId && postId !== 'new' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: postId && postId !== 'new' ? Number(postId) : undefined
        }),
      });

      const data = await response.json();
      console.log('Submit response:', data);
      
      if (data.success) {
        setMessage(postId && postId !== 'new' ? '更新が完了しました' : '投稿が完了しました');
        router.push(`https://www.kabu-ai.jp/${formData.code}/news/article/${data.data.id}`);
      } else {
        setMessage((postId && postId !== 'new' ? '更新に失敗しました: ' : '投稿に失敗しました: ') + data.message);
      }
    } catch (error) {
      setMessage('エラーが発生しました');
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="w-full text-center p-4">読み込み中...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-4">
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="タイトルを入力"
              className="w-full p-2 border rounded"
            />
          </div>
          <textarea
            value={formData.content}
            onChange={handleContentChange}
            placeholder="内容を入力"
            className="w-full h-64 p-2 border rounded resize-none"
          />
        </div>
  
        <div className="w-32 flex flex-col items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.code}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? (postId && postId !== 'new' ? '更新中...' : '投稿中...') 
              : (postId && postId !== 'new' ? '更新する' : '投稿する')}
          </button>
          
          {postId && postId !== 'new' && (
            <a 
              href={`/${formData.code}/news/article/${postId}`}
              className="text-blue-500 hover:text-blue-600 text-sm mt-2"
            >
              記事を見る
            </a>
          )}
  
          {/* 空の要素を追加してスペースを確保 */}
          <div className="h-2" />
  
          {/* /admin/commentの場合のみPostTitleListを表示 */}
          {pathname === '/admin/comment' && (
            <div className="w-full">
              <PostTitleList numPosts={8} fontSize={14} />
            </div>
          )}
        </div>
      </div>
  
      {message && (
        <div className="mt-4 p-2 text-center rounded bg-gray-100">
          {message}
        </div>
      )}
    </div>
  );
}