import React, { useState, useEffect } from 'react';

interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    title?: string;
}

interface MediaViewerProps {
    isOpen: boolean;
    onClose: () => void;
    items: MediaItem[];
    initialIndex?: number;
}

export default function MediaViewer({ isOpen, onClose, items, initialIndex = 0 }: MediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setScale(1);
            setPosition({ x: 0, y: 0 });
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            // Reset state on close
            setTimeout(() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            }, 300);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialIndex]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex]);

    if (!isOpen) return null;

    const currentItem = items[currentIndex];

    // Navigation Handlers
    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetZoom();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            resetZoom();
        }
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Zoom Handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (currentItem.type === 'video') return;
        e.stopPropagation();
        // Simple zoom logic
        if (e.deltaY < 0) {
            setScale(s => Math.min(s + 0.2, 4));
        } else {
            setScale(s => Math.max(s - 0.2, 1)); // Don't zoom out less than 1
            if (scale <= 1.2) setPosition({ x: 0, y: 0 }); // Reset position if zoomed out
        }
    };

    // Drag Handlers (Basic implementation)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    // Download Handler
    const handleDownload = async () => {
        try {
            const response = await fetch(currentItem.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `download-${currentItem.id}.${currentItem.url.split('.').pop()?.split('?')[0] || 'file'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to simpler method if CORS/Fetch fails (though might open in new tab)
            window.open(currentItem.url, '_blank');
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 9999,
                backgroundColor: 'rgba(5, 5, 5, 0.95)', // Deep dark background
                backdropFilter: 'blur(20px)', // Glass effect
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={onClose}
        >
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .media-controls { opacity: 0; transition: opacity 0.3s; }
                .media-viewer:hover .media-controls { opacity: 1; }
            `}</style>

            {/* Toolbar */}
            <div
                className="media-controls"
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    gap: '12px',
                    zIndex: 10001
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={handleDownload}
                    className="btn-icon"
                    title="Descargar"
                    style={iconButtonStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button
                    onClick={onClose}
                    className="btn-icon"
                    title="Cerrar (Esc)"
                    style={{ ...iconButtonStyle, backgroundColor: 'rgba(255, 50, 50, 0.2)', color: '#ff6b6b' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* Navigation Buttons */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        disabled={currentIndex === 0}
                        style={{
                            ...navButtonStyle,
                            left: '20px',
                            opacity: currentIndex === 0 ? 0.3 : 1
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        disabled={currentIndex === items.length - 1}
                        style={{
                            ...navButtonStyle,
                            right: '20px',
                            opacity: currentIndex === items.length - 1 ? 0.3 : 1
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </>
            )}

            {/* Content Display */}
            <div
                className="media-viewer"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
                onWheel={handleWheel}
            >
                {currentItem.type === 'video' ? (
                    <video
                        src={currentItem.url}
                        controls
                        autoPlay
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            borderRadius: '8px',
                            outline: 'none'
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={currentItem.url}
                        alt="Visualización"
                        draggable={false}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            borderRadius: '4px',
                            userSelect: 'none'
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                )}
            </div>

            {/* Caption / Info (Bottom) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '14px',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'none'
                }}
            >
                {currentIndex + 1} / {items.length}
                {currentItem.title && <span style={{ opacity: 0.7, marginLeft: '8px' }}> | {currentItem.title}</span>}
                {scale > 1 && <span style={{ opacity: 0.7, marginLeft: '8px' }}> | {Math.round(scale * 100)}%</span>}
            </div>
        </div>
    );
}

const iconButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    borderRadius: '12px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    backdropFilter: 'blur(4px)'
};

const navButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    zIndex: 10000
};
