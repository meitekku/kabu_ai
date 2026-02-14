import ValuationPageClient from './ValuationPageClient';

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
