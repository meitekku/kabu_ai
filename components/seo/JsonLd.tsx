export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '株AI',
    url: 'https://kabu-ai.jp',
    logo: 'https://kabu-ai.jp/only_icon.png',
    sameAs: ['https://twitter.com/kabu_ai_jp'],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type NewsArticleJsonLdProps = {
  headline: string;
  datePublished: string;
  url: string;
  companyName: string;
};

export function NewsArticleJsonLd({
  headline,
  datePublished,
  url,
  companyName,
}: NewsArticleJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    datePublished,
    url,
    publisher: {
      '@type': 'Organization',
      name: '株AI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kabu-ai.jp/only_icon.png',
      },
    },
    about: {
      '@type': 'Corporation',
      name: companyName,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type BreadcrumbItem = {
  name: string;
  url: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
