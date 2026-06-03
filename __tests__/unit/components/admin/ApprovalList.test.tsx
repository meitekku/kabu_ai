import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import ApprovalList from '@/components/comment/admin/ApprovalList';
import { submitTwitterAndWebPost } from '@/lib/admin/postToTwitterAndWeb';

vi.mock('@/components/parts/chart/StockChart', () => ({
  default: vi.fn().mockReturnValue(null),
}));

vi.mock('@/components/comment/admin/TwitterPostButton', () => ({
  default: () => <button>Twitter投稿</button>,
}));

vi.mock('@/components/comment/admin/TwitterPythonButton', () => ({
  default: () => <button>Python投稿</button>,
}));

vi.mock('@/utils/format/ServerToDate', () => ({
  ServerToDate: (date: string) => date,
}));

vi.mock('@/lib/admin/postToTwitterAndWeb', () => ({
  submitTwitterAndWebPost: vi.fn(),
}));

const mockItems = [
  {
    id: 1,
    title: '1件目タイトル',
    content: '1件目本文',
    code: '1111',
    accept: 0,
    created_at: '2026-02-28 09:00:00',
  },
  {
    id: 2,
    title: '2件目タイトル',
    content: '2件目本文',
    code: '2222',
    accept: 0,
    created_at: '2026-02-28 09:05:00',
  },
];

describe('ApprovalList batch posting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(submitTwitterAndWebPost).mockResolvedValue({
      success: true,
      message: 'ok',
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    }) as unknown as typeof fetch;
    window.alert = vi.fn();

    class MockIntersectionObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts selected items in checkbox order with default 5 minute interval', async () => {
    const fetchData = vi.fn().mockResolvedValue(undefined);

    render(
      <ApprovalList
        items={mockItems}
        fetchData={fetchData}
        enableBatchPosting={true}
        batchPostSiteNumber={71}
      />
    );

    fireEvent.click(screen.getByLabelText('投稿候補に追加 2'));
    fireEvent.click(screen.getByLabelText('投稿候補に追加 1'));

    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByText('2 件')).toBeInTheDocument();
    expect(screen.getByText('1番目')).toBeInTheDocument();
    expect(screen.getByText('2番目')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '選択順で投稿する' }));
      await Promise.resolve();
    });

    expect(submitTwitterAndWebPost).toHaveBeenCalledWith({
      title: '2件目タイトル',
      content: '2件目本文',
      imageUrl: undefined,
      siteNumber: 71,
    });
    expect(submitTwitterAndWebPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(submitTwitterAndWebPost).toHaveBeenNthCalledWith(2, {
      title: '1件目タイトル',
      content: '1件目本文',
      imageUrl: undefined,
      siteNumber: 71,
    });

    expect(fetchData).toHaveBeenCalledTimes(2);
  }, 10000);
});
