import React, { useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../services/api';

export const ConnectionForm: React.FC = () => {
  const { addConnection, setActiveConnection } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    id: '', host: 'localhost', port: '3306', user: 'root', password: '', database: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.connections.add({
        id: form.id,
        host: form.host,
        port: parseInt(form.port, 10),
        user: form.user,
        password: form.password,
        database: form.database,
      });

      addConnection({
        id: form.id,
        host: form.host,
        port: parseInt(form.port, 10),
        user: form.user,
        database: form.database,
      });
      setActiveConnection(form.id, form.database);
      setIsOpen(false);
      setForm({ id: '', host: 'localhost', port: '3306', user: 'root', password: '', database: '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 text-sm text-primary-400 border border-dashed border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
      >
        + Add Connection
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
      <input
        placeholder="Connection ID (e.g., prod)"
        value={form.id}
        onChange={e => setForm({ ...form, id: e.target.value })}
        required
        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
      />
      <div className="flex gap-2">
        <input
          placeholder="Host"
          value={form.host}
          onChange={e => setForm({ ...form, host: e.target.value })}
          required
          className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
        />
        <input
          placeholder="Port"
          value={form.port}
          onChange={e => setForm({ ...form, port: e.target.value })}
          required
          className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
        />
      </div>
      <input
        placeholder="User"
        value={form.user}
        onChange={e => setForm({ ...form, user: e.target.value })}
        required
        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
      />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
        required
        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
      />
      <input
        placeholder="Database"
        value={form.database}
        onChange={e => setForm({ ...form, database: e.target.value })}
        required
        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
