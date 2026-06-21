import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Task from '../components/Task';

const baseTask = {
  id: 'task-1',
  title: 'Fix the bug',
  description: null,
  column_id: 'col-1',
  assignee_id: null,
  position: 0,
  due_date: null,
  priority: null,
  labels: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  assignee: null,
};

const defaultProps = {
  task: baseTask,
  users: [],
  labelCatalog: [],
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onDragStart: vi.fn(),
  onDropOnTask: vi.fn(),
};

beforeEach(() => {
  global.fetch = vi.fn();
  vi.clearAllMocks();
});

describe('Task', () => {
  it('renders task title', () => {
    render(<Task {...defaultProps} />);
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
  });

  it('renders priority badge for high priority', () => {
    const task = { ...baseTask, priority: 'high' };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders priority badge for urgent priority', () => {
    const task = { ...baseTask, priority: 'urgent' };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders priority badge for medium priority', () => {
    const task = { ...baseTask, priority: 'medium' };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('renders due date when provided', () => {
    const task = { ...baseTask, due_date: '2099-12-31T00:00:00Z' };
    render(<Task {...defaultProps} task={task} />);
    // date formatted as fr-FR: "31 déc."
    const dateEl = screen.getByText(/déc/i);
    expect(dateEl).toBeInTheDocument();
  });

  it('shows overdue indicator when due date is in the past', () => {
    const task = { ...baseTask, due_date: '2000-01-01T00:00:00Z' };
    render(<Task {...defaultProps} task={task} />);
    // overdue span contains ⚠ prefix
    const overdueEl = screen.getByText(/⚠/);
    expect(overdueEl).toBeInTheDocument();
  });

  it('does not show overdue indicator for future due date', () => {
    const task = { ...baseTask, due_date: '2099-12-31T00:00:00Z' };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
  });

  it('renders label chips', () => {
    const task = { ...baseTask, labels: ['backend', 'urgent-fix'] };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('urgent-fix')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    const task = { ...baseTask, description: 'A detailed description' };
    render(<Task {...defaultProps} task={task} />);
    expect(screen.getByText('A detailed description')).toBeInTheDocument();
  });

  it('renders assignee name when provided', () => {
    const task = {
      ...baseTask,
      assignee_id: 'user-1',
      assignee: { id: 'user-1', name: 'Alice Martin', email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' },
    };
    render(<Task {...defaultProps} task={task} />);
    // shows first name only
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
