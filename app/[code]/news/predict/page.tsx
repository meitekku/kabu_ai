import { generateMetadata } from './metadata';
import PredictPageClient from './PredictPageClient';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
  }>;
};

const PredictPage = async ({ params }: Props) => {
  const { code } = await params;
  return <PredictPageClient code={code} />;
};

export default PredictPage;
