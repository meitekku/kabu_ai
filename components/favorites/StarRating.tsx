'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  code: string;
  value: number | null;
  onChange?: (value: number | null) => void;
}

export function StarRating({ code, value, onChange }: StarRatingProps) {
  const [hovering, setHovering] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClick = async (star: number) => {
    if (isUpdating) return;
    const newValue = star === value ? null : star;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/favorites/importance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, importance: newValue }),
      });
      if (res.ok) {
        onChange?.(newValue);
      }
    } catch {
      // ignore
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovering !== null ? star <= hovering : value !== null && star <= value;
        return (
          <button
            key={star}
            onClick={() => void handleClick(star)}
            onMouseEnter={() => setHovering(star)}
            onMouseLeave={() => setHovering(null)}
            disabled={isUpdating}
            className="p-0.5 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
