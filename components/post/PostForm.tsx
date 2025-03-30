"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';

// PostTitleList コンポーネント
// 
interface PostTitle {
  id: number;
  title: string;
  code?: string;
}

interface PostTitleListProps {
  numPosts: number;
  fontSize?: number;
  refreshTrigger?: number;
}

const PostTitleList: React.FC<PostTitleListProps> = ({ 
  numPosts = 5,
  fontSize = 16,
  refreshTrigger = 0
}) => {
  const [posts, setPosts] = useState<PostTitle[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
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
  }, [numPosts, refreshTrigger]);

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
          <a 
            href={`https://kabu-ai.jp/${post.code || '0000'}/news/article/${post.id}`}
            className="hover:text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {post.title}
          </a>
        </li>
      ))}
    </ul>
  );
};

// メインのPostFormコンポーネント
interface PostFormProps {
  initialPostId?: string;
  redirectAfterPost?: boolean;
}

export default function PostForm({ 
  initialPostId = 'new',
  redirectAfterPost = true 
}: PostFormProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const postId = params?.post_id as string || initialPostId;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    code: '',
    accept: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [isLoading, setIsLoading] = useState(!!postId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;

    if (message && !redirectAfterPost) {
      fadeTimeout = setTimeout(() => {
        setMessageOpacity(0);
      }, 3000);

      hideTimeout = setTimeout(() => {
        setMessage('');
        setMessageOpacity(1);
      }, 3300);
    }

    return () => {
      if (fadeTimeout) clearTimeout(fadeTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [message, redirectAfterPost]);

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

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = () => {
    // setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) {
      setMessage('画像ファイルのみアップロードできます');
      return;
    }

    setMessage('画像をアップロード中...');
    setIsSubmitting(true);

    const textarea = e.currentTarget;
    const cursorPosition = textarea.selectionStart;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const imgTag = `<img src='${data.filePath}' alt='${file.name}' class='block mx-auto mt-2 max-h-[400px]' />`;
        const currentContent = textarea.value;
        const newContent =
          currentContent.substring(0, cursorPosition) +
          imgTag +
          currentContent.substring(cursorPosition);

        setFormData(prev => ({
          ...prev,
          content: newContent
        }));

        textarea.focus();
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPosition + imgTag.length;
        }, 0);

        setMessage('画像をアップロードしました');
      } else {
        setMessage(`アップロードに失敗しました: ${data.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('アップロード中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
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

    // クリップボードにコピー
    const textToCopy = `${formData.title}\n\n${formData.content}`;
    try {

      await navigator.clipboard.writeText(textToCopy);
      console.log('コンテンツをコピーしました');
    } catch (err) {
      console.error('コピーに失敗しました:', err);
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
        setMessage(postId && postId !== 'new' ? '更新が完了しました（コピー済み）' : '投稿が完了しました（コピー済み）');
        setRefreshTrigger(prev => prev + 1);  // リストの更新をトリガー
        
        if (redirectAfterPost) {
          router.push(`https://www.kabu-ai.jp/${formData.code}/news/article/${data.data.id}`);
        } else {
          setFormData(prev => ({
            ...prev,
            title: '',
            content: ''
          }));
        }
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

  // 削除機能を追加
  const handleDelete = async () => {
    if (!postId || postId === 'new') {
      setMessage('削除する記事がありません');
      return;
    }

    if (!confirm('本当にこの記事を削除しますか？この操作は元に戻せません。')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/post', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: Number(postId)
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('記事を削除しました');
        setRefreshTrigger(prev => prev + 1);  // リストの更新をトリガー
        
        if (redirectAfterPost) {
          router.push('/admin/comment');
        } else {
          setFormData({
            title: '',
            content: '',
            code: '',
            accept: 1
          });
        }
      } else {
        setMessage('削除に失敗しました: ' + data.message);
      }
    } catch (error) {
      setMessage('エラーが発生しました');
      console.error('Delete error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // タイトルと内容をコピーする関数を追加
  const handleCopy = () => {
    const textToCopy = `${formData.title}\n\n${formData.content}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setMessage('タイトルと内容をコピーしました');
        setMessageOpacity(1);
      })
      .catch(err => {
        setMessage('コピーに失敗しました');
        console.error('Copy failed: ', err);
      });
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
            ref={textareaRef}
            value={formData.content}
            onChange={handleContentChange}
            placeholder="内容を入力（画像をドラッグ&ドロップして挿入できます）"
            className="w-full h-64 p-2 border rounded resize-none"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
          
          {/* コピーするボタン */}
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!formData.title && !formData.content}
          >
            コピーする
          </button>
          
          {/* 削除ボタンを追加 */}
          {postId && postId !== 'new' && (
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              削除する
            </button>
          )}
          
          {postId && postId !== 'new' && (
            <a 
              href={`/${formData.code}/news/article/${postId}`}
              className="text-blue-500 hover:text-blue-600 text-sm mt-2"
            >
              記事を見る
            </a>
          )}
  
          <div className="h-2" />
  
          {pathname === '/admin/comment' && (
            <div className="w-full">
              <PostTitleList 
                numPosts={8} 
                fontSize={14}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}
        </div>
      </div>
  
      {message && (
        <div 
          className="mt-4 p-2 text-center rounded bg-gray-100 transition-opacity duration-300"
          style={{ opacity: messageOpacity }}
        >
          {message}
        </div>
      )}
    </div>
  );
}