'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, Product, Category } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Image fields
    const [mainImageUrl, setMainImageUrl] = useState('');
    const [hoverImageUrl, setHoverImageUrl] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([
                api.products.list({ limit: 100, is_active: 'all' }),
                api.categories.list()
            ]);
            setProducts(pRes.data);
            setCategories(cRes);
        } catch {
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            // Pre-fill image URLs from product images
            const imgs = product.images || [];
            const mainImg = imgs.find(i => i.sort_order === 0) || imgs[0];
            const hoverImg = imgs.find(i => i.sort_order === 1);
            setMainImageUrl(mainImg?.path || '');
            setHoverImageUrl(hoverImg?.path || '');
        } else {
            setEditingProduct({ is_active: true });
            setMainImageUrl('');
            setHoverImageUrl('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let savedProduct: Product;
            if (editingProduct?.id) {
                savedProduct = await api.admin.updateProduct(editingProduct.id, {
                    name: editingProduct.name,
                    slug: editingProduct.slug,
                    description: editingProduct.description,
                    price_cents: editingProduct.price_cents,
                    category_id: editingProduct.category_id,
                    is_active: editingProduct.is_active,
                    stock: editingProduct.stock,
                });
            } else {
                savedProduct = await api.admin.createProduct({
                    name: editingProduct?.name || '',
                    slug: editingProduct?.slug || '',
                    description: editingProduct?.description || '',
                    price_cents: editingProduct?.price_cents || 0,
                    category_id: editingProduct?.category_id || categories[0]?.id || '',
                    stock: editingProduct?.stock || 0,
                });
            }

            // Save images
            const images: { path: string; alt_text: string; sort_order: number }[] = [];
            if (mainImageUrl.trim()) {
                images.push({ path: mainImageUrl.trim(), alt_text: savedProduct.name + ' main', sort_order: 0 });
            }
            if (hoverImageUrl.trim()) {
                images.push({ path: hoverImageUrl.trim(), alt_text: savedProduct.name + ' hover', sort_order: 1 });
            }
            if (images.length > 0) {
                await api.admin.setProductImages(savedProduct.id, images);
            }

            // Reload to reflect changes
            await load();
            showToast(editingProduct?.id ? 'Product updated' : 'Product created', 'success');
            setIsModalOpen(false);
        } catch (err) {
            showToast((err instanceof Error && err.message) || 'Failed to save product', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('PERMANENTLY DELETE this product? This will remove all inventory and images, but preserve order snapshots.')) return;

        try {
            await api.admin.deleteProduct(id, true);
            setProducts(prev => prev.filter(p => p.id !== id));
            showToast('Product permanently removed', 'success');
        } catch (err) {
            showToast((err instanceof Error && err.message) || 'Failed to delete product', 'error');
        }
    };

    const handleOutOfStock = async (id: string) => {
        try {
            // Adjust inventory by negative of current stock to reach 0
            const product = products.find(p => p.id === id);
            if (product && product.stock !== undefined) {
                await api.admin.adjustInventory(id, -product.stock, 'Marked as out of stock by admin');
                setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: 0 } : p));
                showToast('Product marked as out of stock', 'success');
            }
        } catch (err) {
            showToast((err instanceof Error && err.message) || 'Failed to update stock', 'error');
        }
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>📦 Products</h1>
                    <p>Create, edit, and manage your store inventory</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => openModal()}>
                    + Add Product
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="admin-search-wrap">
                    <input type="text" className="admin-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 14 }} />
                </div>
                <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={load}>↻ Refresh</button>
            </div>

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(item => {
                            const mainImg = item.images?.find(i => i.sort_order === 0) || item.images?.[0];
                            return (
                                <tr key={item.id}>
                                    <td>
                                        {mainImg ? (
                                            <img src={mainImg.path} alt={item.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, background: '#1a1a2e' }} />
                                        ) : (
                                            <div style={{ width: 40, height: 40, background: '#1a1a2e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📷</div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="product-name">{item.name}</div>
                                        <div className="product-id">ID: {item.id.slice(0, 8)}...</div>
                                    </td>
                                    <td>{categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}</td>
                                    <td style={{ fontWeight: 600 }}>${(item.price_cents / 100).toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            color: (item.stock || 0) <= 0 ? '#ff4d4d' : '#888',
                                            fontWeight: (item.stock || 0) <= 0 ? 700 : 400
                                        }}>
                                            {item.stock ?? 0}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${item.is_active ? 'admin-badge-green' : 'admin-badge-red'}`}>
                                            {item.is_active ? 'Active' : 'Archived'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="admin-btn-icon" onClick={() => openModal(item)} title="Edit">✏️</button>
                                            <button className="admin-btn-icon" onClick={() => handleOutOfStock(item.id)} title="Mark Out Of Stock">🚫</button>
                                            <button className="admin-btn-icon danger" onClick={() => handleDelete(item.id)} title="Permanent Delete">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="admin-empty"><p>No products found.</p></div>}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="admin-modal-header">
                            <h2>{editingProduct?.id ? 'Edit Product' : 'New Product'}</h2>
                            <button className="admin-btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label className="admin-label">Name</label>
                                        <input className="admin-input" required value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Slug</label>
                                        <input className="admin-input" required value={editingProduct?.slug || ''} onChange={e => setEditingProduct({ ...editingProduct, slug: e.target.value })} />
                                    </div>
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Description</label>
                                    <textarea className="admin-textarea" value={editingProduct?.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} />
                                </div>
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label className="admin-label">Price (cents)</label>
                                        <input className="admin-input" type="number" required value={editingProduct?.price_cents || 0} onChange={e => setEditingProduct({ ...editingProduct, price_cents: parseInt(e.target.value) })} />
                                        <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>≈ ${((editingProduct?.price_cents || 0) / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Category</label>
                                        <select className="admin-select" value={editingProduct?.category_id || ''} onChange={e => setEditingProduct({ ...editingProduct, category_id: e.target.value })}>
                                            <option value="">Select...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <label className="admin-label">Stock Units</label>
                                        <input className="admin-input" type="number" required value={editingProduct?.stock || 0} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} />
                                        <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>Current units in warehouse</span>
                                    </div>
                                    <div className="admin-form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                                        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setEditingProduct({ ...editingProduct, stock: 0 })}>Set Out of Stock</button>
                                    </div>
                                </div>

                                {/* Image section */}
                                <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 16, marginTop: 16 }}>
                                    <label className="admin-label" style={{ marginBottom: 12, display: 'block', fontSize: 13, fontWeight: 700 }}>🖼️ Product Images</label>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Main Image URL</label>
                                        <input className="admin-input" value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} placeholder="https://example.com/product-front.jpg" />
                                        {mainImageUrl && (
                                            <div style={{ marginTop: 8 }}>
                                                <img src={mainImageUrl} alt="Main preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #2a2a3e' }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Hover Image URL <span style={{ color: '#888', fontWeight: 400 }}>(optional — shown when user hovers)</span></label>
                                        <input className="admin-input" value={hoverImageUrl} onChange={e => setHoverImageUrl(e.target.value)} placeholder="https://example.com/product-side.jpg" />
                                        {hoverImageUrl && (
                                            <div style={{ marginTop: 8 }}>
                                                <img src={hoverImageUrl} alt="Hover preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #2a2a3e' }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Image previews side by side */}
                                    {(mainImageUrl || hoverImageUrl) && (
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                            {mainImageUrl && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: '#888' }}>Main</span>
                                                </div>
                                            )}
                                            {hoverImageUrl && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: '#888' }}>Hover</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="admin-checkbox-row" style={{ marginTop: 16 }}>
                                    <input type="checkbox" id="active" checked={editingProduct?.is_active || false} onChange={e => setEditingProduct({ ...editingProduct, is_active: e.target.checked })} />
                                    <label htmlFor="active">Product is active</label>
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : (editingProduct?.id ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
