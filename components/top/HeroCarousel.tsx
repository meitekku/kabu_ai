'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CarouselSlide } from '@/lib/top/carousel';
import { ArrowRight } from 'lucide-react';

const THEME_CLASSES: Record<CarouselSlide['theme'], string> = {
  bull:    'bg-gradient-to-br from-emerald-600 to-emerald-800',
  bear:    'bg-gradient-to-br from-rose-600 to-rose-800',
  neutral: 'bg-gradient-to-br from-blue-600 to-indigo-800',
  flash:   'bg-gradient-to-br from-amber-500 to-orange-700',
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
    <div className="w-full mb-8">
      <div className={`relative rounded-2xl overflow-hidden h-48 md:h-56 ${THEME_CLASSES[slide.theme]}`}>
        <Link href={slide.link_url} className="block h-full group">
          <div className="flex flex-col justify-center h-full px-8 md:px-12 py-6">
            <span className="inline-block text-[11px] font-semibold bg-white/15 backdrop-blur-sm text-white px-3 py-1 rounded-full mb-4 self-start tracking-wide uppercase">
              {slide.badge_label}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-sm md:text-base text-white/75 mt-2.5 line-clamp-2 leading-relaxed">
                {slide.subtitle}
              </p>
            )}
            <span className="mt-4 text-sm text-white/60 self-start flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
              詳しく見る <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
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
