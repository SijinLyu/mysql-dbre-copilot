import React, { useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../services/api';

export const ConnectionForm: React.FC = () => {
  const { addConnection, setActiveConnection, addToHistory } = useStore();
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
        id: form.id, host: form.host, port: parseInt(form.port, 10),
        user: form.user, database: form.database,
      });
      addToHistory({
        id: form.id, host: form.host, port: parseInt(form.port, 10),
        user: form.user, password: form.password, database: form.database,
        lastUsedAt: new Date().toISOString(),
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

  const inputStyle = {
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border)',
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-dashed transition-opacity hover:opacity-70"
        style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
      >
        + Add Connection
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border space-y-2" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <input placeholder="Connection ID (e.g., prod)" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} required
        className="w-full px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
      <div className="flex gap-2">
        <input placeholder="Host" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required
          className="flex-1 min-w-0 px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
        <input placeholder="Port" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} required
          className="w-20 flex-shrink-0 px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
      </div>
      <input placeholder="User" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} required
        className="w-full px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
      <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
        className="w-full px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
      <input placeholder="Database" value={form.database} onChange={e => setForm({ ...form, database: e.target.value })} required
        className="w-full px-2.5 py-1.5 border rounded-md text-sm outline-none" style={inputStyle} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 px-3 py-1.5 rounded-md text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent)' }}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
        <button type="button" onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 rounded-md text-sm border transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Cancel
        </button>
      </div>
    </form>
  );
};
