import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbSelectFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<unknown[]>;
type DbUpdateFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<number>;
type SessionValue = {
  user?: {
    id?: string;
    email?: string;
  };
} | null;
type GetSessionFn = () => Promise<SessionValue>;
type HeadersFn = () => Promise<Headers>;

const {
  mockDbSelect,
  mockDbUpdate,
  mockGetSession,
  mockHeaders,
  mockCustomersCreate,
  mockCardsUpdate,
  mockCardRegistrationSessionsCreate,
  mockSubscriptionsCreate,
  mockSubscriptionsUpdate,
  mockSubscriptionsCancel,
} = vi.hoisted(() => {
  process.env.FINCODE_PLAN_ID_STANDARD = 'pl_standard';
  process.env.FINCODE_PLAN_ID_AGENT = 'pl_agent';
  process.env.FINCODE_WEBHOOK_SECRET = 'whsec_test_secret';

  return {
    mockDbSelect: vi.fn<DbSelectFn>(),
    mockDbUpdate: vi.fn<DbUpdateFn>(),
    mockGetSession: vi.fn<GetSessionFn>(() => Promise.resolve(null)),
    mockHeaders: vi.fn<HeadersFn>(() => Promise.resolve(new Headers({ host: 'localhost:3000' }))),
    mockCustomersCreate: vi.fn(),
    mockCardsUpdate: vi.fn(),
    mockCardRegistrationSessionsCreate: vi.fn(),
    mockSubscriptionsCreate: vi.fn(),
    mockSubscriptionsUpdate: vi.fn(),
    mockSubscriptionsCancel: vi.fn(),
  };
});

vi.mock('@/lib/database/Mysql', () => ({
  Database: {
    getInstance: () => ({
      select: mockDbSelect,
      update: mockDbUpdate,
    }),
  },
}));

vi.mock('@/lib/auth/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

vi.mock('@/lib/fincode', () => ({
  fincode: {
    customers: {
      create: mockCustomersCreate,
    },
    cards: {
      update: mockCardsUpdate,
    },
    cardRegistrationSessions: {
      create: mockCardRegistrationSessionsCreate,
    },
    subscriptions: {
      create: mockSubscriptionsCreate,
      update: mockSubscriptionsUpdate,
      cancel: mockSubscriptionsCancel,
    },
  },
}));

import { POST as checkoutPOST } from '@/app/api/checkout/route';
import { POST as subscriptionPortalPOST } from '@/app/api/subscription/portal/route';
import { POST as webhookPOST } from '@/app/api/webhook/route';

function createWebhookRequest(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  // fincodeはHMACではなくシークレットをそのままfincode-signatureヘッダーで送信する
  const signature = process.env.FINCODE_WEBHOOK_SECRET || '';

  return new Request('http://localhost/api/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'fincode-signature': signature,
    },
    body,
  });
}

describe('fincode billing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue(null);
    mockDbSelect.mockResolvedValue([]);
    mockDbUpdate.mockResolvedValue(1);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_default' });
    mockCardsUpdate.mockResolvedValue({
      id: 'card_default',
      default_flag: '1',
    });
    mockCardRegistrationSessionsCreate.mockResolvedValue({
      id: 'card_session_default',
      link_url: 'https://payments.example.com/default',
    });
    mockSubscriptionsCreate.mockResolvedValue({
      id: 'sub_default',
      next_charge_date: '2026/04/15 00:00:00.000',
    });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_default',
      next_charge_date: '2026/04/15 00:00:00.000',
    });
    mockSubscriptionsCancel.mockResolvedValue({
      id: 'sub_default',
      pay_type: 'Card',
    });
  });

  it('creates a fincode customer and card registration session for checkout', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockDbSelect.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        fincode_customer_id: null,
        subscription_plan: 'none',
        subscription_status: 'none',
      },
    ]);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_123' });
    mockCardRegistrationSessionsCreate.mockResolvedValue({
      id: 'card_session_123',
      link_url: 'https://payments.example.com/card-session',
    });

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'standard' }),
    });

    const res = await checkoutPOST(req);
    expect(res.status).toBe(200);

    const data = await res.json() as { url: string };
    expect(data.url).toBe('https://payments.example.com/card-session');

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(mockCardRegistrationSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'http://localhost/premium/success',
        cancel_url: 'http://localhost/premium',
        customer_id: 'cus_123',
        receiver_mail: 'user@example.com',
        shop_service_name: '株AI',
      })
    );

    const sessionPayload = mockCardRegistrationSessionsCreate.mock.calls[0]?.[0] as { expire?: string };
    expect(sessionPayload.expire).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);

    expect(mockDbUpdate.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.stringContaining('fincode_customer_id'),
          ['cus_123', 'user-1'],
        ],
        [
          expect.stringContaining('subscription_plan_pending'),
          ['standard', 'user-1'],
        ],
      ])
    );
  });

  it('cancels an active fincode subscription with the required pay_type', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockDbSelect.mockResolvedValue([
      {
        fincode_customer_id: 'cus_123',
        subscription_id: 'sub_123',
      },
    ]);

    const res = await subscriptionPortalPOST();
    expect(res.status).toBe(200);
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_123', {
      pay_type: 'Card',
    });
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.stringContaining("subscription_status = 'canceled'"),
      ['user-1']
    );
  });

  it('creates a subscription when card.regist arrives for a pending plan', async () => {
    mockDbSelect.mockResolvedValue([
      {
        id: 'user-1',
        subscription_plan_pending: 'agent',
        subscription_id: null,
      },
    ]);
    mockSubscriptionsCreate.mockResolvedValue({
      id: 'sub_456',
      next_charge_date: '2026/04/15 00:00:00.000',
    });

    const res = await webhookPOST(createWebhookRequest({
      event: 'card.regist',
      customer_id: 'cus_123',
      card_id: 'card_123',
    }));

    expect(res.status).toBe(200);
    expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        pay_type: 'Card',
        plan_id: 'pl_agent',
        customer_id: 'cus_123',
        card_id: 'card_123',
      })
    );

    const createPayload = mockSubscriptionsCreate.mock.calls[0]?.[0] as { start_date?: string };
    expect(createPayload.start_date).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);

    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.stringContaining("subscription_status = 'active'"),
      ['sub_456', 'agent', '2026-04-15 00:00:00', 'cus_123']
    );
  });

  it('updates an existing subscription instead of creating a duplicate when changing plans', async () => {
    mockDbSelect.mockResolvedValue([
      {
        id: 'user-1',
        subscription_plan_pending: 'standard',
        subscription_id: 'sub_existing',
      },
    ]);
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_existing',
      next_charge_date: '2026/05/20 00:00:00.000',
    });

    const res = await webhookPOST(createWebhookRequest({
      event: 'card.regist',
      customer_id: 'cus_123',
      card_id: 'card_456',
    }));

    expect(res.status).toBe(200);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_existing', {
      pay_type: 'Card',
      plan_id: 'pl_standard',
    });
    expect(mockCardsUpdate).toHaveBeenCalledWith('cus_123', 'card_456', {
      default_flag: '1',
    });
    expect(mockSubscriptionsCreate).not.toHaveBeenCalled();
  });

  it('updates subscription statuses from recurring batch results', async () => {
    const res = await webhookPOST(createWebhookRequest({
      event: 'recurring.card.batch',
      body: [
        {
          id: 'sub_1',
          status: 'SUCCESS',
          next_charge_date: '2026/05/01 00:00:00.000',
        },
        {
          subscription_id: 'sub_2',
          status: 'FAILED',
          next_charge_date: '2026/05/01 00:00:00.000',
        },
      ],
    }));

    expect(res.status).toBe(200);
    expect(mockDbUpdate.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.stringContaining('WHERE subscription_id = ?'),
          ['active', '2026-05-01 00:00:00', 'sub_1'],
        ],
        [
          expect.stringContaining('WHERE subscription_id = ?'),
          ['past_due', '2026-05-01 00:00:00', 'sub_2'],
        ],
      ])
    );
  });
});
