"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';

// PostTitleList コンポーネント
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
            href={`https://kabu-ai.jp/stocks/${post.code || '0000'}/news/${post.id}`}
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
    accept: 1,
    pickup: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [isLoading, setIsLoading] = useState(!!postId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;

    if (message) {
      fadeTimeout = setTimeout(() => {
        setMessageOpacity(0);
      }, 500);

      hideTimeout = setTimeout(() => {
        setMessage('');
        setMessageOpacity(1);
      }, 800);
    }

    return () => {
      if (fadeTimeout) clearTimeout(fadeTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [message]);

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
            accept: 1,
            pickup: data.data.pickup || 0
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

  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);

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
        // 相対パスで画像URLを生成
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

  // スマホでの長押し→画像選択機能
  const handleTouchStart = () => {
    const timeout = setTimeout(() => {
      // 画像選択ダイアログを表示
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file);
        }
      };
      input.click();
    }, 500); // 500ms長押し
    setLongPressTimeout(timeout);
  };

  const handleTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('画像ファイルのみアップロードできます');
      return;
    }

    setMessage('画像をアップロード中...');
    setIsSubmitting(true);

    const textarea = textareaRef.current;
    const cursorPosition = textarea?.selectionStart || 0;

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

        setFormData(prev => ({
          ...prev,
          content: prev.content.substring(0, cursorPosition) +
            imgTag +
            prev.content.substring(cursorPosition)
        }));

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
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        console.log('コンテンツをコピーしました');
      }
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
          id: postId && postId !== 'new' ? Number(postId) : undefined,
          pickup: formData.pickup
        }),
      });

      const data = await response.json();
      console.log('Submit response:', data);
      
      if (data.success) {
        // Twitterにも投稿
        try {
          const tweetResponse = await fetch('/api/twitter/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: formData.title,
              content: formData.content,
              url: `https://kabu-ai.jp/stocks/${formData.code}/news/${data.data.id}`
            }),
          });
          
          const tweetData = await tweetResponse.json();
          if (!tweetData.success) {
            console.error('Twitter投稿に失敗:', tweetData.message);
          }
        } catch (error) {
          console.error('Twitter投稿中にエラーが発生:', error);
        }

        setMessage(postId && postId !== 'new' ? '更新が完了しました！' : '投稿が完了しました！');
        setRefreshTrigger(prev => prev + 1);  // リストの更新をトリガー
        
        if (redirectAfterPost) {
          router.push(`/stocks/${formData.code}/news/${data.data.id}`);
        } else {
          setFormData(prev => ({
            ...prev,
            title: '',
            content: '',
            pickup: 0
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
            accept: 1,
            pickup: 0
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setMessage('タイトルと内容をコピーしました');
          setMessageOpacity(1);
        })
        .catch(err => {
          setMessage('コピーに失敗しました');
          console.error('Copy failed: ', err);
        });
    } else {
      setMessage('クリップボード機能がサポートされていません');
    }
  };

  if (isLoading) {
    return <div className="w-full text-center p-4">読み込み中...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 投稿フォーム部分 */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="タイトルを入力"
              className="w-full p-2 border rounded text-sm sm:text-base"
            />
          </div>
          <textarea
            ref={textareaRef}
            value={formData.content}
            onChange={handleContentChange}
            placeholder="内容を入力（PC:画像をドラッグ&ドロップ / スマホ:長押しで画像選択）"
            className="w-full h-64 sm:h-96 p-2 border rounded resize-none text-sm sm:text-base"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* ボタン部分 */}
        <div className="w-full lg:w-48 flex flex-col gap-2">
          {/* スマホ時は横並び、PC時は縦並び */}
          <div className="flex flex-row lg:flex-col gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.code}
              className="flex-1 lg:w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting
                ? (postId && postId !== 'new' ? '更新中...' : '投稿中...')
                : (postId && postId !== 'new' ? '更新する' : '投稿する')}
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 lg:w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={!formData.title && !formData.content}
            >
              コピーする
            </button>

            {postId && postId !== 'new' && (
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 lg:w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                削除する
              </button>
            )}
          </div>

          <select
            value={formData.pickup}
            onChange={(e) => setFormData({...formData, pickup: Number(e.target.value)})}
            className="w-full p-2 border rounded text-sm sm:text-base"
          >
            <option value={0}>通常</option>
            <option value={1}>トップ上部</option>
            <option value={2}>トップ下部</option>
          </select>

          {postId && postId !== 'new' && (
            <a
              href={`/stocks/${formData.code}/news/${postId}`}
              className="text-blue-500 hover:text-blue-600 text-sm mt-2 text-center lg:text-left"
            >
              記事を見る
            </a>
          )}

          <div className="h-2 hidden lg:block" />

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
          className={`mt-4 p-3 text-center rounded-lg transition-opacity duration-300 text-sm sm:text-base ${
            message.includes('完了しました')
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
          style={{ opacity: messageOpacity }}
        >
          {message}
        </div>
      )}
    </div>
  );
}