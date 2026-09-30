'use client';
import { useEffect, useState } from 'react';
import { api, AuditLog } from '@/lib/api';

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.admin.auditLogs()
            .then(res => setLogs(Array.isArray(res) ? res : []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = logs.filter(log =>
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>📜 Audit Logs</h1>
                    <p>Track all administrative actions</p>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                    {logs.length} total entries
                </div>
            </div>

            <div className="admin-toolbar">
                <div className="admin-search-wrap" style={{ flex: 1 }}>
                    <input
                        type="text"
                        className="admin-input"
                        placeholder="Filter by action or entity..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Entity</th>
                            <th>Action</th>
                            <th>Actor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(log => (
                            <tr key={log.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td>
                                    <span className="admin-badge admin-badge-orange">{log.entity_type}</span>
                                </td>
                                <td style={{ color: '#fff' }}>{log.action.replace(/_/g, ' ')}</td>
                                <td style={{ color: '#888', fontFamily: 'monospace', fontSize: 11 }}>
                                    {log.actor_user_id ? log.actor_user_id.slice(0, 8) + '...' : 'System'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="admin-empty"><p>No audit logs found.</p></div>}
            </div>
        </div>
    );
}
