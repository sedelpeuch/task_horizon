import React, { useEffect, useState } from 'react';
import Column from './Column';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee: User | null;
}

interface BoardProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export default function Board({ users, setUsers }: BoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const API_URL = '/api/v1';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [columnsRes, tasksRes] = await Promise.all([
          fetch(`${API_URL}/columns`),
          fetch(`${API_URL}/tasks`),
        ]);

        if (!columnsRes.ok || !tasksRes.ok) throw new Error('Failed to fetch data');

        const columnsData = await columnsRes.json();
        const tasksData = await tasksRes.json();

        setColumns(columnsData);
        setTasks(tasksData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addTask = async (columnId: string, title: string, description: string = '') => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, column_id: columnId }),
      });

      if (!response.ok) throw new Error('Failed to create task');
      const newTask = await response.json();
      setTasks([...tasks, newTask]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task');
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting task');
    }
  };

  const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_id: newColumnId, position: newPosition }),
      });

      if (!response.ok) throw new Error('Failed to move task');
      const updatedTask = await response.json();

      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error moving task');
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (!draggedTask) return;

    const tasksInColumn = tasks.filter((t) => t.column_id === columnId).sort((a, b) => a.position - b.position);
    const newPosition = tasksInColumn.length;

    moveTask(draggedTask.id, columnId, newPosition);
    setDraggedTask(null);
  };

  if (loading) {
    return <div className="p-4 text-white">Loading board...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Error: {error}</div>;
  }

  return (
    <main className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks.filter((t) => t.column_id === column.id).sort((a, b) => a.position - b.position)}
            users={users}
            onAddTask={addTask}
            onDeleteTask={deleteTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </main>
  );
}
