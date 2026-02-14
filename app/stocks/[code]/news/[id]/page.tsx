import { generateMetadata } from './metadata';
import ArticleDetailClient from './ArticleDetailClient';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
    id: string;
  }>;
};

const ArticleDetailPage = async ({ params }: Props) => {
  const { code, id } = await params;
  return <ArticleDetailClient code={code} id={id} />;
};

export default ArticleDetailPage;