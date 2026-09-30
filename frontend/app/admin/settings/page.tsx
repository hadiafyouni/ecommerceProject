'use client';
import { useState, useEffect } from 'react';
import { api, Setting } from '@/lib/api';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await api.admin.settings.list();
            setSettings(data || []);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: string) => {
        setSaving(key);
        setMessage(null);
        try {
            await api.admin.settings.update(key, value);
            setMessage({ type: 'success', text: `Setting "${key}" updated.` });
            fetchSettings();
        } catch {
            setMessage({ type: 'error', text: 'Error saving setting.' });
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div className="admin-card">Loading settings...</div>;

    const loginImageUrl = settings.find(s => s.key === 'login_page_image_url')?.value || '';

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div>
                    <h1>⚙️ System Settings</h1>
                    <p>Configure global application parameters and UI elements.</p>
                </div>
            </header>

            {message && (
                <div className={`admin-msg ${message.type === 'success' ? 'admin-msg-success' : 'admin-msg-error'}`} style={{ marginBottom: '20px' }}>
                    {message.text}
                </div>
            )}

            <div className="admin-card">
                <h3 style={{ marginBottom: '20px' }}>Visual Settings</h3>

                <div className="admin-form-group">
                    <label>Login Page Visual Image URL</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="admin-input"
                            defaultValue={loginImageUrl}
                            placeholder="https://images.unsplash.com/..."
                            id="login_page_image_url"
                        />
                        <button
                            className="admin-btn admin-btn-primary"
                            disabled={saving === 'login_page_image_url'}
                            onClick={() => {
                                const val = (document.getElementById('login_page_image_url') as HTMLInputElement).value;
                                handleUpdate('login_page_image_url', val);
                            }}
                        >
                            {saving === 'login_page_image_url' ? 'Saving...' : 'Update'}
                        </button>
                    </div>
                    <p className="admin-input-hint">The primary background image shown on the left side of the Sign In page.</p>
                </div>

                {loginImageUrl && (
                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>Preview</label>
                        <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                            <img src={loginImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="admin-card" style={{ marginTop: '20px', opacity: 0.6 }}>
                <h3>Other Configs</h3>
                <p>More settings coming soon (Tax rates, Shipping rules, API Keys).</p>
            </div>
        </div>
    );
}
