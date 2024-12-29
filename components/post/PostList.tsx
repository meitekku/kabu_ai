import React, { useState, useEffect } from 'react';

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
        const response = await fetch('/api/posts', {
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

export default PostTitleList;