'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, Category } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.categories.list();
            setCategories(res);
        } catch {
            showToast('Failed to load categories', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory?.name || !editingCategory?.slug) return;
        setIsSaving(true);
        try {
            if (editingCategory.id) {
                const updated = await api.admin.updateCategory(editingCategory.id, editingCategory.name, editingCategory.slug, editingCategory.image_url || undefined);
                setCategories(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
                showToast('Category updated', 'success');
            } else {
                const created = await api.admin.createCategory(editingCategory.name, editingCategory.slug, editingCategory.image_url || undefined);
                setCategories(prev => [...prev, created]);
                showToast('Category created', 'success');
            }
            setIsModalOpen(false);
        } catch {
            showToast('Failed to save category', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category? Products in it will become uncategorized.')) return;
        try {
            await api.admin.deleteCategory(id);
            setCategories(prev => prev.filter(c => c.id !== id));
            showToast('Category deleted', 'success');
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>🗂️ Categories</h1>
                    <p>Organize your products into groups</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => { setEditingCategory({}); setIsModalOpen(true); }}>
                    + New Category
                </button>
            </div>

            <div className="admin-cat-grid">
                {categories.map(cat => (
                    <div key={cat.id} className="admin-cat-card">
                        <div className="admin-cat-header">
                            <div className="admin-cat-icon">
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover rounded-lg" style={{ width: 40, height: 40 }} />
                                ) : (
                                    "🗂️"
                                )}
                            </div>
                            <div className="cat-actions">
                                <button className="admin-btn-icon" onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }} title="Edit">✏️</button>
                                <button className="admin-btn-icon danger" onClick={() => handleDelete(cat.id)} title="Delete">🗑️</button>
                            </div>
                        </div>
                        <h3>{cat.name}</h3>
                        <div className="cat-slug">/{cat.slug}</div>
                    </div>
                ))}
            </div>

            {categories.length === 0 && <div className="admin-empty"><p>No categories yet. Create one to get started.</p></div>}

            {/* Modal */}
            {isModalOpen && (
                <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>{editingCategory?.id ? 'Edit Category' : 'New Category'}</h2>
                            <button className="admin-btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="admin-modal-body">
                                <div className="admin-form-group">
                                    <label className="admin-label">Name</label>
                                    <input className="admin-input" required value={editingCategory?.name || ''} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} placeholder="e.g. Gaming Gear" />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Slug</label>
                                    <input className="admin-input" required value={editingCategory?.slug || ''} onChange={e => setEditingCategory({ ...editingCategory, slug: e.target.value.toLowerCase().replace(/ /g, '-') })} placeholder="gaming-gear" />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Image URL</label>
                                    <input className="admin-input" value={editingCategory?.image_url || ''} onChange={e => setEditingCategory({ ...editingCategory, image_url: e.target.value })} placeholder="https://example.com/image.png" />
                                    {editingCategory?.image_url && (
                                        <div className="mt-2 text-center">
                                            <img src={editingCategory.image_url} alt="Preview" className="mx-auto h-20 w-20 object-cover rounded-lg border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
