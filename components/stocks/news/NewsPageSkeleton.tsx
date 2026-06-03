type ChartHeight = {
  upper: number;
  lower: number;
};

type StockChartSkeletonProps = {
  width?: string | number;
  pcHeight?: ChartHeight;
  tabletHeight?: ChartHeight;
  mobileHeight?: ChartHeight;
};

type NewsListSkeletonProps = {
  title?: string;
  h3Title?: string;
  rowCount?: number;
  showMoreButton?: boolean;
};

type NewsPageSkeletonProps = {
  title?: string;
  h3Title?: string;
  showMoreButton?: boolean;
  showAiFeatureNav?: boolean;
  newsRowCount?: number;
  chartWidth?: string | number;
  chartPcHeight?: ChartHeight;
  chartTabletHeight?: ChartHeight;
  chartMobileHeight?: ChartHeight;
};

const DEFAULT_PC_CHART_HEIGHT: ChartHeight = { upper: 200, lower: 100 };
const DEFAULT_MOBILE_CHART_HEIGHT: ChartHeight = { upper: 120, lower: 80 };

const resolveTabletHeight = (
  pcHeight: ChartHeight,
  mobileHeight: ChartHeight,
  tabletHeight?: ChartHeight
) => {
  if (tabletHeight) {
    return tabletHeight;
  }

  return {
    upper: Math.round((pcHeight.upper + mobileHeight.upper) / 2),
    lower: Math.round((pcHeight.lower + mobileHeight.lower) / 2),
  };
};

const toCssWidth = (width: string | number) =>
  typeof width === 'number' ? `${width}px` : width;

export const CompanyBasicInfoSkeleton = () => {
  const summaryItems = [0, 1, 2, 3];

  return (
    <div
      data-testid="company-basic-info-skeleton"
      className="w-full bg-card py-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-[24px] w-12 rounded bg-gray-200" />
          <div className="h-[28px] w-32 rounded bg-gray-200" />
        </div>
        <div className="h-[20px] w-12 rounded bg-gray-200" />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-baseline space-x-2 sm:space-x-4">
          <div className="h-[28px] sm:h-[32px] w-24 rounded bg-gray-200" />
          <div className="h-[24px] sm:h-[28px] w-36 rounded bg-gray-200" />
        </div>
        <div className="h-[28px] w-[36px] rounded-lg bg-gray-200" />
      </div>
      <div className="mt-2 border border-[#e5e5e5] rounded-sm overflow-hidden">
        <div className="grid grid-cols-4 bg-[#f5f5f5]">
          {summaryItems.map((index) => (
            <div key={`header-${index}`} className={`py-1 px-2 ${index < 3 ? 'border-r border-[#e5e5e5]' : ''}`}>
              <div className="h-[16px] sm:h-[20px] w-10 rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 bg-white">
          {summaryItems.map((index) => (
            <div key={`value-${index}`} className={`py-1 px-2 ${index < 3 ? 'border-r border-[#e5e5e5]' : ''}`}>
              <div className="h-[16px] sm:h-[20px] w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StockChartSkeleton = ({
  width = '100%',
  pcHeight = DEFAULT_PC_CHART_HEIGHT,
  tabletHeight,
  mobileHeight = DEFAULT_MOBILE_CHART_HEIGHT,
}: StockChartSkeletonProps) => {
  const resolvedTabletHeight = resolveTabletHeight(
    pcHeight,
    mobileHeight,
    tabletHeight
  );

  return (
    <div
      data-testid="stock-chart-skeleton"
      className="mt-2 py-2"
      style={{ width: toCssWidth(width) }}
    >
      <div
        className="h-full rounded bg-gray-200 sm:hidden"
        style={{ height: `${mobileHeight.upper}px` }}
      />
      <div
        className="hidden h-full rounded bg-gray-200 sm:block lg:hidden"
        style={{ height: `${resolvedTabletHeight.upper}px` }}
      />
      <div
        className="hidden h-full rounded bg-gray-200 lg:block"
        style={{ height: `${pcHeight.upper}px` }}
      />

      <div
        className="-mt-1 h-full rounded bg-gray-200 sm:hidden"
        style={{ height: `${mobileHeight.lower}px` }}
      />
      <div
        className="-mt-1 hidden h-full rounded bg-gray-200 sm:block lg:hidden"
        style={{ height: `${resolvedTabletHeight.lower}px` }}
      />
      <div
        className="-mt-1 hidden h-full rounded bg-gray-200 lg:block"
        style={{ height: `${pcHeight.lower}px` }}
      />
    </div>
  );
};

export const AiFeatureNavSkeleton = () => {
  return (
    <div data-testid="ai-feature-nav-skeleton" className="mt-4 mb-4">
      <div className="mb-4 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-10 before:h-[2px] before:bg-[#1a1a1a]">
        <div className="h-[27px] w-16 rounded bg-[#e8e8e8]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 border border-shikiho-bg-border"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-[#e8e8e8]" />
              <div className="h-[23px] w-20 rounded bg-[#e8e8e8]" />
            </div>
            <div className="h-[17px] w-28 rounded bg-[#e8e8e8]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const NewsListSkeleton = ({
  title,
  h3Title,
  rowCount = 10,
  showMoreButton = false,
}: NewsListSkeletonProps) => {
  const rows = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <div data-testid="news-list-skeleton">
      {h3Title && (
        <div className="mb-4 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-10 before:h-[2px] before:bg-[#1a1a1a]">
          <div className="h-[27px] w-48 rounded bg-[#e8e8e8]" />
        </div>
      )}
      {title && (
        <div className="mt-4 mb-5 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-12 before:h-[2px] before:bg-[#1a1a1a]">
          <div className="h-[30px] w-32 rounded bg-[#e8e8e8]" />
        </div>
      )}

      <div className="border-t border-shikiho-bg-border">
        {rows.map((index) => (
          <div key={index} className="block">
            <div className="py-3.5 border-b border-shikiho-bg-gray-light">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-[16.5px] w-24 rounded bg-[#e8e8e8]" />
                  <div className="h-[15px] w-14 rounded bg-[#e8e8e8]" />
                </div>
                <div className="mt-0.5 h-[22.5px] w-full rounded bg-[#e8e8e8]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showMoreButton && (
        <div className="text-right mt-4">
          <div className="ml-auto h-[21px] w-20 rounded bg-[#e8e8e8]" />
        </div>
      )}
    </div>
  );
};

export const NewsPageSkeleton = ({
  title = '最新ニュース',
  h3Title,
  showMoreButton = true,
  showAiFeatureNav = true,
  newsRowCount = 10,
  chartWidth = '100%',
  chartPcHeight = DEFAULT_PC_CHART_HEIGHT,
  chartTabletHeight,
  chartMobileHeight = DEFAULT_MOBILE_CHART_HEIGHT,
}: NewsPageSkeletonProps) => {
  return (
    <div className="space-y-4 animate-pulse px-4 sm:px-6">
      <CompanyBasicInfoSkeleton />
      <StockChartSkeleton
        width={chartWidth}
        pcHeight={chartPcHeight}
        tabletHeight={chartTabletHeight}
        mobileHeight={chartMobileHeight}
      />
      {showAiFeatureNav && <AiFeatureNavSkeleton />}
      <NewsListSkeleton
        title={title}
        h3Title={h3Title}
        rowCount={newsRowCount}
        showMoreButton={showMoreButton}
      />
    </div>
  );
};
