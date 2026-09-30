/**
 * Next.js App Router loading UI (shown during route transitions and Suspense).
 * Uses the neon shape animation — colors match site palette (orange + blue).
 */
export default function Loading() {
    return (
        <div className="loading-overlay">
            <div className="loading-container">
                <div className="loading-shape" />
                <div className="loading-particles">
                    <div className="loading-particle" />
                    <div className="loading-particle" />
                    <div className="loading-particle" />
                    <div className="loading-particle" />
                    <div className="loading-particle" />
                </div>
            </div>
            <p className="loading-label">ShopX</p>
        </div>
    );
}
