import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserPanel from '../components/UserPanel';

const sampleUsers = [
  { id: 'user-1', name: 'Alice Martin', email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' },
  { id: 'user-2', name: 'Bob Dupont', email: 'bob@example.com', created_at: '2024-01-01T00:00:00Z' },
];

const defaultProps = {
  users: sampleUsers,
  onAddUser: vi.fn(),
  onUpdateUser: vi.fn(),
  onDeleteUser: vi.fn(),
};

beforeEach(() => {
  global.fetch = vi.fn();
  vi.clearAllMocks();
});

describe('UserPanel', () => {
  it('renders user names', () => {
    render(<UserPanel {...defaultProps} />);
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Bob Dupont')).toBeInTheDocument();
  });

  it('renders user emails', () => {
    render(<UserPanel {...defaultProps} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('renders empty state with no users', () => {
    render(<UserPanel {...defaultProps} users={[]} />);
    expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument();
  });

  it('renders avatar initials when no avatar URL', () => {
    render(<UserPanel {...defaultProps} />);
    // Avatar shows first letter of name
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders avatar img when avatar_url provided', () => {
    const users = [
      { ...sampleUsers[0], avatar_url: 'https://example.com/alice.png' },
    ];
    render(<UserPanel {...defaultProps} users={users} />);
    const img = screen.getByAltText('Alice Martin') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/alice.png');
  });

  it('shows add user button', () => {
    render(<UserPanel {...defaultProps} />);
    expect(screen.getByText(/Ajouter un membre/i)).toBeInTheDocument();
  });

  it('shows add form when button clicked', () => {
    render(<UserPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Ajouter un membre/i));
    expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByText(/Nouveau membre/i)).toBeInTheDocument();
  });

  it('add form has submit and cancel buttons', () => {
    render(<UserPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Ajouter un membre/i));
    expect(screen.getByText('Ajouter')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('hides add form when cancel clicked', () => {
    render(<UserPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Ajouter un membre/i));
    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByPlaceholderText('Nom')).not.toBeInTheDocument();
  });

  it('calls fetch and onAddUser when form submitted', async () => {
    const newUser = { id: 'user-3', name: 'Carol Lee', email: 'carol@example.com', created_at: '2024-01-01T00:00:00Z' };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => newUser,
    });

    render(<UserPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Ajouter un membre/i));
    fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Carol Lee' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'carol@example.com' } });
    fireEvent.submit(screen.getByText('Ajouter').closest('form')!);

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/users', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows edit form when edit button clicked', () => {
    render(<UserPanel {...defaultProps} />);
    const editBtns = screen.getAllByText('✎');
    fireEvent.click(editBtns[0]);
    expect(screen.getByDisplayValue('Alice Martin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument();
  });

  it('shows delete confirmation when delete clicked', () => {
    render(<UserPanel {...defaultProps} />);
    const deleteBtns = screen.getAllByText('×');
    fireEvent.click(deleteBtns[0]);
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    expect(screen.getByText(/Alice Martin/)).toBeInTheDocument();
  });

  it('calls fetch and onDeleteUser when delete confirmed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<UserPanel {...defaultProps} />);
    const deleteBtns = screen.getAllByText('×');
    fireEvent.click(deleteBtns[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/users/user-1', expect.objectContaining({ method: 'DELETE' }));
      expect(defaultProps.onDeleteUser).toHaveBeenCalledWith('user-1');
    });
  });
});
