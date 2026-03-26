import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserTable } from './index';

// Mock the hooks
vi.mock('../../hooks/useUsers', () => ({
  useUsers: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          email: 'alice@example.com',
          name: 'Alice',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    },
    isLoading: false,
  })),
  useDeleteUser: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserTable', () => {
  it('should render the search input', () => {
    renderWithProviders(<UserTable />);
    expect(screen.getByTestId('search-users')).toBeInTheDocument();
  });

  it('should render the add user button', () => {
    renderWithProviders(<UserTable />);
    expect(screen.getByTestId('create-user-btn')).toBeInTheDocument();
  });

  it('should render user data in table', () => {
    renderWithProviders(<UserTable />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });
});
