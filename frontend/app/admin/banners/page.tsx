'use client';
import { useEffect, useState } from 'react';
import { api, Banner } from '@/lib/api';
import { Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newBanner, setNewBanner] = useState<Partial<Banner>>({
        image_url: '', link_url: '', title: '', description: '', tag: '', is_active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        try {
            const data = await api.admin.banners.list();
            setBanners(data || []);
        } catch (err) {
            console.error('Failed to load banners', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBanner.image_url) return;
        setSubmitting(true);
        try {
            await api.admin.banners.create(newBanner);
            setNewBanner({ image_url: '', link_url: '', title: '', description: '', tag: '', is_active: true });
            setShowAdd(false);
            loadBanners();
        } catch {
            alert('Failed to create banner');
        } finally {
            setSubmitting(false);
        }
    };


    const handleToggle = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));

        try {
            await api.admin.banners.toggle(id, !currentStatus);
        } catch (err) {
            console.error('Toggle failed:', err);
            alert(`Failed to toggle banner: ${err instanceof Error ? err.message : 'Unknown error'}`);
            // Rollback on failure
            setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;
        try {
            await api.admin.banners.delete(id);
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch {
            alert('Failed to delete banner');
        }
    };

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    return (
        <div className="admin-banners-container">
            <div className="admin-page-header">
                <div>
                    <h1>📢 Sales Banners</h1>
                    <p>Manage promotional banners for the public storefront</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => setShowAdd(!showAdd)}>
                    <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Banner'}
                </button>
            </div>

            {showAdd && (
                <div className="admin-card mb-8 animate-fade-in" style={{ maxWidth: '600px' }}>
                    <form onSubmit={handleCreate} className="admin-form">
                        <h3 className="mb-4">Create New Banner</h3>
                        <div className="admin-form-group">
                            <label className="admin-label">Image URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="https://example.com/image.jpg"
                                    value={newBanner.image_url}
                                    onChange={e => setNewBanner({ ...newBanner, image_url: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">Title (Optional)</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Summer Sale 2024"
                                value={newBanner.title}
                                onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">Link URL (Optional)</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="/products/electronics"
                                value={newBanner.link_url}
                                onChange={e => setNewBanner({ ...newBanner, link_url: e.target.value })}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">Description (Optional)</label>
                            <textarea
                                className="admin-input"
                                placeholder="Check out our latest deals..."
                                value={newBanner.description}
                                onChange={e => setNewBanner({ ...newBanner, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">Tag / Badge Text (Optional)</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="UP TO 40% OFF"
                                value={newBanner.tag}
                                onChange={e => setNewBanner({ ...newBanner, tag: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="admin-btn admin-btn-primary w-full" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create Banner'}
                        </button>
                    </form>
                </div>
            )}

            <div className="admin-grid-banners">
                {banners.map(banner => (
                    <div key={banner.id} className="admin-stat-card banner-admin-card">
                        <div className="banner-preview">
                            {banner.image_url ? (
                                <img src={banner.image_url} alt={banner.title || 'Banner'} />
                            ) : (
                                <div className="banner-placeholder"><ImageIcon size={40} /></div>
                            )}
                            <div className={`banner-status-badge ${banner.is_active ? 'active' : 'inactive'}`}>
                                {banner.is_active ? 'Active' : 'Inactive'}
                            </div>
                        </div>
                        <div className="banner-info mt-4">
                            <h4 className="truncate">{banner.title || 'Untitled Banner'}</h4>
                            {banner.tag && <span className="inline-block bg-orange-500/10 text-orange-500 text-xs px-2 py-0.5 rounded mt-1 font-bold">{banner.tag}</span>}
                            {banner.description && <p className="text-xs text-muted truncate mt-1">{banner.description}</p>}
                            <p className="text-xs text-muted truncate mt-1">{banner.image_url}</p>
                            {banner.link_url && (
                                <p className="text-xs text-orange flex items-center gap-1 mt-1">
                                    <ExternalLink size={10} /> {banner.link_url}
                                </p>
                            )}
                        </div>
                        <div className="banner-actions mt-4 flex justify-between items-center">
                            <button
                                className={`text-sm flex items-center gap-1 ${banner.is_active ? 'text-green-500' : 'text-gray-400'}`}
                                onClick={() => handleToggle(banner.id, banner.is_active)}
                            >
                                {banner.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                {banner.is_active ? 'On' : 'Off'}
                            </button>
                            <button className="text-red-400 hover:text-red-500 p-2" onClick={() => handleDelete(banner.id)}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {banners.length === 0 && !loading && (
                <div className="admin-empty">
                    <p>No banners found. Add your first promotional banner!</p>
                </div>
            )}

            <style jsx>{`
                .admin-grid-banners {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .banner-admin-card {
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                }
                .banner-preview {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #1a1a1a;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .banner-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .banner-placeholder { color: #333; }
                .banner-status-badge {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    padding: 0.25rem 0.6rem;
                    border-radius: 1rem;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                .banner-status-badge.active { background: #10b981; color: white; }
                .banner-status-badge.inactive { background: #4b5563; color: white; }
                .truncate {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .mb-8 { margin-bottom: 2rem; }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
