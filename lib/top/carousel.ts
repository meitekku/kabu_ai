import { Database } from '@/lib/database/Mysql';

export interface CarouselSlide {
  id: number;
  slot: number;
  title: string;
  subtitle: string;
  badge_label: string;
  theme: 'bull' | 'bear' | 'neutral' | 'flash';
  link_url: string;
  stock_code: string | null;
  report_type: 'midday' | 'closing';
  generated_at: string;
}

export async function getLatestCarousel(): Promise<CarouselSlide[]> {
  const db = Database.getInstance();
  const rows = await db.select<CarouselSlide>(
    'SELECT * FROM top_carousel WHERE generated_at = (SELECT MAX(generated_at) FROM top_carousel) ORDER BY slot ASC'
  );
  return rows;
}

export async function saveCarouselSlides(
  slides: Omit<CarouselSlide, 'id'>[]
): Promise<void> {
  const db = Database.getInstance();
  await Promise.all(
    slides.map((s) =>
      db.insert(
        'INSERT INTO top_carousel (slot, title, subtitle, badge_label, theme, link_url, stock_code, report_type, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.slot, s.title, s.subtitle, s.badge_label, s.theme, s.link_url, s.stock_code, s.report_type, s.generated_at]
      )
    )
  );
}
