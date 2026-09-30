'use client';
import { useTheme } from '@/context/ThemeContext';

/**
 * High-quality SVG ambient blob background.
 * Fixed to viewport, spreads 5 organic radial-gradient blobs with heavy blur.
 * Blue palette in light mode, vivid red in dark mode.
 */
export default function SplashBackground() {
    const { theme } = useTheme();
    const dark = theme === 'dark';

    /* ── palette ── */
    const c = dark ? {
        a1: '#ff2222', a2: '#ff5500',   // hot red → orange-red
        b1: '#cc0000', b2: '#ff3333',
        c1: '#ff4422', c2: '#dd1111',
        d1: '#ff2244', d2: '#991111',
        e1: '#ff5533', e2: '#cc2200',
    } : {
        a1: '#1877f2', a2: '#38d9f9',   // vivid blue → sky
        b1: '#1fa3ec', b2: '#63a4ff',
        c1: '#0d6efd', c2: '#38d9f9',
        d1: '#145dbf', d2: '#1877f2',
        e1: '#38d9f9', e2: '#0d6efd',
    };

    return (
        <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none',
                overflow: 'visible',
                opacity: dark ? 0.3 : 1,
            }}
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                {/* Blob A — top-right large */}
                <radialGradient id="sA" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c.a1} stopOpacity="0.7" />
                    <stop offset="60%" stopColor={c.a2} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={c.a2} stopOpacity="0" />
                </radialGradient>
                {/* Blob B — bottom-left */}
                <radialGradient id="sB" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c.b1} stopOpacity="0.65" />
                    <stop offset="60%" stopColor={c.b2} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={c.b2} stopOpacity="0" />
                </radialGradient>
                {/* Blob C — center-top wide */}
                <radialGradient id="sC" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c.c1} stopOpacity="0.5" />
                    <stop offset="70%" stopColor={c.c2} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={c.c2} stopOpacity="0" />
                </radialGradient>
                {/* Blob D — bottom-right compact */}
                <radialGradient id="sD" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c.d1} stopOpacity="0.6" />
                    <stop offset="55%" stopColor={c.d2} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={c.d2} stopOpacity="0" />
                </radialGradient>
                {/* Blob E — top-left accent */}
                <radialGradient id="sE" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c.e1} stopOpacity="0.55" />
                    <stop offset="65%" stopColor={c.e2} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={c.e2} stopOpacity="0" />
                </radialGradient>

                {/* Shared heavy blur filter */}
                <filter id="blobBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="72" />
                </filter>
                <filter id="blobBlurMd" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="55" />
                </filter>
                <filter id="blobBlurSm" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="40" />
                </filter>
            </defs>

            {/* ── Blob A — top-right, large ── */}
            <ellipse
                cx="1180" cy="120" rx="420" ry="320"
                transform="rotate(-18, 1180, 120)"
                fill="url(#sA)"
                filter="url(#blobBlur)"
            />

            {/* ── Blob B — bottom-left, medium ── */}
            <ellipse
                cx="180" cy="760" rx="380" ry="280"
                transform="rotate(22, 180, 760)"
                fill="url(#sB)"
                filter="url(#blobBlur)"
            />

            {/* ── Blob C — center-top, wide diffuse ── */}
            <ellipse
                cx="660" cy="-60" rx="500" ry="220"
                transform="rotate(-5, 660, -60)"
                fill="url(#sC)"
                filter="url(#blobBlurMd)"
            />

            {/* ── Blob D — bottom-right, compact accent ── */}
            <ellipse
                cx="1340" cy="820" rx="260" ry="210"
                transform="rotate(30, 1340, 820)"
                fill="url(#sD)"
                filter="url(#blobBlurSm)"
            />

            {/* ── Blob E — top-left, soft accent ── */}
            <ellipse
                cx="-60" cy="80" rx="300" ry="240"
                transform="rotate(-25, -60, 80)"
                fill="url(#sE)"
                filter="url(#blobBlurMd)"
            />
        </svg>
    );
}
