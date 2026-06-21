import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LabelPanel from '../components/LabelPanel';

const sampleLabels = [
  { id: 'label-1', name: 'bug', color: '#d73a4a' },
  { id: 'label-2', name: 'feature', color: '#0075ca' },
];

const defaultProps = {
  labels: sampleLabels,
  onAddLabel: vi.fn(),
  onUpdateLabel: vi.fn(),
  onDeleteLabel: vi.fn(),
};

beforeEach(() => {
  global.fetch = vi.fn();
  vi.clearAllMocks();
});

describe('LabelPanel', () => {
  it('renders list of labels', () => {
    render(<LabelPanel {...defaultProps} />);
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('renders empty state with no labels', () => {
    render(<LabelPanel {...defaultProps} labels={[]} />);
    expect(screen.queryByText('bug')).not.toBeInTheDocument();
  });

  it('shows add form button', () => {
    render(<LabelPanel {...defaultProps} />);
    expect(screen.getByText(/Créer un label/i)).toBeInTheDocument();
  });

  it('shows add form when button clicked', () => {
    render(<LabelPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Créer un label/i));
    expect(screen.getByPlaceholderText('Nom du label')).toBeInTheDocument();
    expect(screen.getByText(/Nouveau label/i)).toBeInTheDocument();
  });

  it('add form has submit and cancel buttons', () => {
    render(<LabelPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Créer un label/i));
    expect(screen.getByText('Créer le label')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('hides add form when cancel clicked', () => {
    render(<LabelPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Créer un label/i));
    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByPlaceholderText('Nom du label')).not.toBeInTheDocument();
  });

  it('calls fetch and onAddLabel when form submitted', async () => {
    const newLabel = { id: 'label-3', name: 'docs', color: '#0075ca' };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => newLabel,
    });

    render(<LabelPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Créer un label/i));
    fireEvent.change(screen.getByPlaceholderText('Nom du label'), { target: { value: 'docs' } });
    fireEvent.submit(screen.getByText('Créer le label').closest('form')!);

    // wait for async handler
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/labels', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows edit form when edit button clicked', () => {
    render(<LabelPanel {...defaultProps} />);
    // edit buttons are hidden via opacity-0 but still in DOM
    const editBtns = screen.getAllByText('✎');
    fireEvent.click(editBtns[0]);
    expect(screen.getByDisplayValue('bug')).toBeInTheDocument();
  });

  it('shows delete confirmation when delete button clicked', () => {
    render(<LabelPanel {...defaultProps} />);
    const deleteBtns = screen.getAllByText('×');
    fireEvent.click(deleteBtns[0]);
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('calls fetch and onDeleteLabel when delete confirmed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<LabelPanel {...defaultProps} />);
    const deleteBtns = screen.getAllByText('×');
    fireEvent.click(deleteBtns[0]);
    fireEvent.click(screen.getByText('Supprimer'));

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/labels/label-1', expect.objectContaining({ method: 'DELETE' }));
      expect(defaultProps.onDeleteLabel).toHaveBeenCalledWith('label-1');
    });
  });
});
