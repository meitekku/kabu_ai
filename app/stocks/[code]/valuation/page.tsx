import { generateMetadata } from './metadata';
import ValuationPageClient from './ValuationPageClient';

export { generateMetadata };

type Props = {
  params: Promise<{
    code: string;
  }>;
};

const ValuationPage = async ({ params }: Props) => {
  const { code } = await params;
  return <ValuationPageClient code={code} />;
};

export default ValuationPage;
