import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { X, Check, Move, Grid, Maximize } from 'lucide-react';
import { reprocessImage } from '../utils/logoPlacer';

interface LogoPlacementEditorProps {
    imageFile: File;
    logos: File[];
    initialConfig: {
        logoIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
    };
    onSave: (processedBlob: Blob, newConfig: { logoIndex: number; x: number; y: number; width: number; height: number; }) => void;
    onCancel: () => void;
}

export const LogoPlacementEditor: React.FC<LogoPlacementEditorProps> = ({
    imageFile,
    logos,
    initialConfig,
    onSave,
    onCancel
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Editor State
    const [logoIndex, setLogoIndex] = useState(initialConfig.logoIndex >= 0 ? initialConfig.logoIndex : 0);
    const [position, setPosition] = useState({ x: initialConfig.x, y: initialConfig.y });
    const [size, setSize] = useState({ width: initialConfig.width, height: initialConfig.height });
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1); // Internal Scale (image vs canvas css size)
    const [viewportZoom, setViewportZoom] = useState(1); // Visual zoom for the user
    const [isProcessing, setIsProcessing] = useState(false);

    // UI Options
    const [showGuides, setShowGuides] = useState(true);
    const [showBorder, setShowBorder] = useState(false);

    // Load background image
    useEffect(() => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
            setImage(img);
            if (canvasRef.current && containerRef.current) {
                // Fit to container
                const containerAspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
                const imgAspect = img.width / img.height;
                let displayWidth, displayHeight;

                if (imgAspect > containerAspect) {
                    displayWidth = containerRef.current.clientWidth;
                    // displayHeight = displayWidth / imgAspect;
                } else {
                    displayHeight = containerRef.current.clientHeight;
                    displayWidth = displayHeight * imgAspect;
                }

                setScale(displayWidth / img.width);
            }
        };
    }, [imageFile]);

    // Load logo image whenever logoIndex changes
    useEffect(() => {
        if (logos.length === 0) return;
        const currentLogo = logos[logoIndex];
        const img = new Image();
        img.src = URL.createObjectURL(currentLogo);
        img.onload = () => setLogoImage(img);
    }, [logos, logoIndex]);

    // Keyboard controls for fine tuning
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!image) return;
            const step = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp': setPosition(p => ({ ...p, y: p.y - step })); break;
                case 'ArrowDown': setPosition(p => ({ ...p, y: p.y + step })); break;
                case 'ArrowLeft': setPosition(p => ({ ...p, x: p.x - step })); break;
                case 'ArrowRight': setPosition(p => ({ ...p, x: p.x + step })); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [image]);

    // Draw Canvas
    useEffect(() => {
        if (!canvasRef.current || !image || !logoImage) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;

        // Draw background
        ctx.drawImage(image, 0, 0);

        // Draw guides (Thirds + Center)
        if (showGuides) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 1 / scale;

            // Thirds
            const wThird = image.width / 3;
            const hThird = image.height / 3;

            ctx.beginPath();
            ctx.moveTo(wThird, 0); ctx.lineTo(wThird, image.height);
            ctx.moveTo(wThird * 2, 0); ctx.lineTo(wThird * 2, image.height);
            ctx.moveTo(0, hThird); ctx.lineTo(image.width, hThird);
            ctx.moveTo(0, hThird * 2); ctx.lineTo(image.width, hThird * 2);
            ctx.stroke();

            // Center Cross
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(image.width / 2, 0); ctx.lineTo(image.width / 2, image.height);
            ctx.moveTo(0, image.height / 2); ctx.lineTo(image.width, image.height / 2);
            ctx.stroke();
        }

        // Draw logo
        ctx.drawImage(logoImage, position.x, position.y, size.width, size.height);

        // Draw highlight border if enabled or hovering/dragging
        if (!isProcessing && (showBorder || isHovering || isDragging)) {
            ctx.strokeStyle = showBorder ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1 / scale;
            ctx.setLineDash([10 / scale, 5 / scale]);
            ctx.strokeRect(position.x, position.y, size.width, size.height);
        }

    }, [image, logoImage, position, size, scale, isProcessing, showGuides, showBorder, isHovering, isDragging]);

    // Lock body scroll on mount
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // --- INPUT EVENT HANDLERS WITH ROBUST COORDINATE MAPPING ---

    const getEventCoordinates = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        // Calculate scale dynamism based on actual rendered size vs internal resolution
        // The rect width and height are visually scaled by `viewportZoom` via CSS transform or container, 
        // so we just read the raw bounding box to get accurate relative coordinates regardless of zoom.
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else if (e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }
        } else {
            clientX = (e as MouseEvent | React.MouseEvent).clientX;
            clientY = (e as MouseEvent | React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleInputDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // Only prevent default for mouse events to allow touch scrolling elsewhere if needed, 
        // but since we are locking scroll on mount, it's ok.
        const isTouch = 'touches' in e;
        if (!isTouch) {
            e.preventDefault();
        }
        e.stopPropagation();

        if (!canvasRef.current) return;

        const { x: pointerX, y: pointerY } = getEventCoordinates(e, canvasRef.current);

        // Hit test
        if (
            pointerX >= position.x &&
            pointerX <= position.x + size.width &&
            pointerY >= position.y &&
            pointerY <= position.y + size.height
        ) {
            setIsDragging(true);
            setDragStart({ x: pointerX - position.x, y: pointerY - position.y });
        }
    }, [position, size]);

    const handleCanvasInputMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (isDragging || !canvasRef.current) return;

        const { x: pointerX, y: pointerY } = getEventCoordinates(e, canvasRef.current);

        const hovering = (
            pointerX >= position.x &&
            pointerX <= position.x + size.width &&
            pointerY >= position.y &&
            pointerY <= position.y + size.height
        );

        if (hovering !== isHovering) {
            setIsHovering(hovering);
        }
    }, [isDragging, position, size, isHovering]);

    useEffect(() => {
        const handleWindowMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !canvasRef.current) return;
            e.preventDefault();

            const { x: pointerX, y: pointerY } = getEventCoordinates(e, canvasRef.current);

            setPosition({
                x: pointerX - dragStart.x,
                y: pointerY - dragStart.y
            });
        };

        const handleWindowUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMove, { passive: false });
            window.addEventListener('mouseup', handleWindowUp);
            window.addEventListener('touchmove', handleWindowMove, { passive: false });
            window.addEventListener('touchend', handleWindowUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
            window.removeEventListener('touchmove', handleWindowMove);
            window.removeEventListener('touchend', handleWindowUp);
        };
    }, [isDragging, dragStart]);


    // Track initial size for relative scaling
    const [initialSize] = useState({ width: initialConfig.width, height: initialConfig.height });

    // Resize Logic
    const handleScaleLogo = (factor: number) => {
        setSize({
            width: initialSize.width * factor,
            height: initialSize.height * factor
        });
    };

    const handleSave = async () => {
        if (!image || !logos[logoIndex]) return;
        setIsProcessing(true);
        try {
            const blob = await reprocessImage(
                imageFile,
                logos[logoIndex],
                position.x,
                position.y,
                size.width,
                size.height
            );

            onSave(blob, {
                logoIndex,
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height
            });
        } catch (error) {
            console.error(error);
            alert('Error al guardar la imagen');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
            <Card className="max-w-6xl w-full h-[90vh] flex flex-col p-0 bg-black border-neutral-800 rounded-none overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-neutral-900 flex flex-wrap gap-4 justify-between items-center bg-black">
                    <h3 className="text-sm uppercase tracking-[0.2em] font-medium text-white flex items-center gap-3">
                        <Move className="w-4 h-4 text-neutral-500" />
                        <span className="hidden md:inline">Ajustar Posición</span> // Logo
                    </h3>
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="flex items-center gap-4 mr-4">
                            {/* Toggles */}
                             <button
                                onClick={() => setShowGuides(!showGuides)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-none text-[10px] uppercase tracking-widest transition-all ${showGuides ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Grid className="w-3 h-3" />
                                Guías
                            </button>
                            <button
                                onClick={() => setShowBorder(!showBorder)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-none text-[10px] uppercase tracking-widest transition-all ${showBorder ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Maximize className="w-3 h-3" />
                                Borde
                            </button>

                            <div className="w-px h-4 bg-neutral-800" />

                             <div className="flex flex-col gap-1 items-center">
                                <span className="text-[9px] text-neutral-600 uppercase tracking-widest">Escala</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2"
                                    step="0.05"
                                    defaultValue="1"
                                    onChange={(e) => handleScaleLogo(parseFloat(e.target.value))}
                                    className="w-16 md:w-24 accent-white h-1 bg-neutral-900 rounded-none appearance-none"
                                />
                            </div>

                             <div className="flex flex-col gap-1 items-center">
                                <span className="text-[9px] text-neutral-600 uppercase tracking-widest">Zoom</span>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={viewportZoom}
                                    onChange={(e) => setViewportZoom(parseFloat(e.target.value))}
                                    className="w-16 md:w-24 accent-white h-1 bg-neutral-900 rounded-none appearance-none"
                                />
                            </div>
                        </div>
                        <div className="w-px h-8 bg-neutral-700 mx-1 md:mx-2 hidden sm:block" />
                        <Button variant="ghost" onClick={onCancel} className="ml-auto">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
                    {/* Canvas Area */}
                    <div
                        ref={containerRef}
                        className="flex-1 bg-neutral-950 flex items-center justify-center relative overflow-auto p-4"
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                width: image ? image.width * scale : 'auto',
                                height: image ? image.height * scale : 'auto',
                                transform: `scale(${viewportZoom})`,
                                transformOrigin: 'center center',
                                cursor: isDragging ? 'grabbing' : isHovering ? 'grab' : 'default',
                                touchAction: 'none' // Prevent default touch actions like pull-to-refresh
                            }}
                            className="shadow-2xl transition-transform duration-100"
                            onMouseDown={handleInputDown}
                            onMouseMove={handleCanvasInputMove}
                            onTouchStart={handleInputDown}
                            onTouchMove={handleCanvasInputMove}
                            onMouseLeave={() => setIsHovering(false)}
                        />

                    </div>

                     {/* Sidebar Controls */}
                    <div className="w-full md:w-72 bg-black border-t md:border-t-0 md:border-l border-neutral-900 p-8 space-y-8 overflow-y-auto max-h-[30vh] md:max-h-none shrink-0">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest font-medium text-neutral-500 mb-6 block">Variante de Logo</label>
                            <div className="grid grid-cols-2 gap-3">
                                {logos.map((logo, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setLogoIndex(idx)}
                                        className={`p-2 rounded-lg border cursor-pointer transition-all ${logoIndex === idx
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-neutral-700 hover:border-neutral-600'
                                            }`}
                                    >
                                         <div className="aspect-square flex items-center justify-center bg-neutral-950 border border-neutral-900 rounded-none mb-1 p-2">
                                            <img src={URL.createObjectURL(logo)} className="max-w-full max-h-full object-contain grayscale brightness-200" alt="Logo option" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-800">
                            <Button
                                className="w-full"
                                onClick={handleSave}
                                isLoading={isProcessing}
                                disabled={isProcessing}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
