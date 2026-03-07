'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CarouselSlide } from '@/lib/top/carousel';

const THEME_CLASSES: Record<CarouselSlide['theme'], string> = {
  bull:    'bg-gradient-to-br from-emerald-600 to-green-700',
  bear:    'bg-gradient-to-br from-rose-600 to-red-700',
  neutral: 'bg-gradient-to-br from-blue-600 to-indigo-700',
  flash:   'bg-gradient-to-br from-amber-500 to-orange-600',
};

interface HeroCarouselProps {
  initialSlides?: CarouselSlide[];
}

export default function HeroCarousel({ initialSlides }: HeroCarouselProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides ?? []);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) return;
    fetch('/api/top/carousel')
      .then((r) => r.json())
      .then((data: { slides: CarouselSlide[] }) => {
        if (data.slides?.length > 0) setSlides(data.slides);
      })
      .catch(() => {});
  }, [initialSlides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div className="w-full mb-6">
      <div className={`relative rounded-xl overflow-hidden h-48 md:h-56 ${THEME_CLASSES[slide.theme]}`}>
        <Link href={slide.link_url} className="block h-full">
          <div className="flex flex-col justify-center h-full px-6 md:px-10 py-4">
            <span className="inline-block text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full mb-3 self-start">
              {slide.badge_label}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-sm md:text-base text-white/80 mt-2 line-clamp-2">
                {slide.subtitle}
              </p>
            )}
            <span className="mt-3 text-xs text-white/70 self-start">詳しく見る →</span>
          </div>
        </Link>
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                }`}
                aria-label={`スライド ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
