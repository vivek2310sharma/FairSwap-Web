import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ListingsDashboardPage from '@/app/account/listings/page';

type ListingRow = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  price_type: string;
  price_paise: number;
  status: string;
  revision: number;
  renewal_count: number;
  rejection_reason: string | null;
  removal_reason: string | null;
  cover_photo_id: string | null;
  created_at: string;
  updated_at: string;
  categories: { name: string; slug: string };
  cities: { name: string };
};

const mockData = vi.hoisted(() => ({
  listings: [
    {
      id: 'listing-1',
      category_id: 'cat-1',
      slug: 'test-item-1',
      title: 'Vintage Bicycle',
      price_type: 'fixed',
      price_paise: 500000,
      status: 'active',
      revision: 3,
      renewal_count: 0,
      rejection_reason: null,
      removal_reason: null,
      cover_photo_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      categories: { name: 'Bicycles', slug: 'bicycles' },
      cities: { name: 'Mumbai' },
    },
  ] as ListingRow[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'seller-1' } } }),
    },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: async () => ({ data: mockData.listings, error: null }),
        in: async () => ({ data: [], error: null }),
      };
      return builder;
    },
  }),
}));

vi.mock('@/app/account/listings/actions', () => ({
  submitListingAction: vi.fn(),
  transitionListingAction: vi.fn(),
}));

afterEach(cleanup);

it('renders listing details without showing internal revision label (Rev N)', async () => {
  render(await ListingsDashboardPage());

  expect(screen.getByText('Vintage Bicycle')).toBeInTheDocument();
  expect(screen.queryByText(/Rev\s*\d+/i)).toBeNull();
});
