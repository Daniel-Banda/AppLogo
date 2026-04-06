import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { X, Wand2, Eye, Check, RefreshCcw } from 'lucide-react';
import { editImageWithAI } from '../services/genAiService';
import { useAppStore } from '../store/useAppStore';

interface MaskEditorProps {
    imageFile: File;
    onSave: (processedBlob: Blob) => void;
    onCancel: () => void;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({ imageFile, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isProcessing, setIsProcessing] = useState(false);

    // Preview State
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [showOriginal, setShowOriginal] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
            setImage(img);
            resetCanvas(img);
        };
    }, [imageFile]);

    const resetCanvas = (img: HTMLImageElement) => {
        if (canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (processedImage) return; // Disable drawing in preview mode
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath(); // Reset path
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current || processedImage) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red semi-transparent mask

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleErase = async () => {
        if (!canvasRef.current || !image) return;
        setIsProcessing(true);

        // Get mask blob
        canvasRef.current.toBlob(async (maskBlob) => {
            if (!maskBlob) {
                setIsProcessing(false);
                return;
            }

            try {
                const token = useAppStore.getState().huggingFaceToken;

                if (!token) {
                    alert("Please enter your Hugging Face Token in the settings.");
                    setIsProcessing(false);
                    return;
                }

                const resultBlob = await editImageWithAI(
                    imageFile,
                    maskBlob,
                    "remove object, clean background, high quality",
                    token
                );

                setProcessedImage(URL.createObjectURL(resultBlob));
            } catch (error: any) {
                console.error("AI Edit failed", error);
                alert(`Failed to process image: ${error.message || 'Unknown error'}`);
            } finally {
                setIsProcessing(false);
            }
        });
    };

    const handleApply = async () => {
        if (processedImage) {
            const response = await fetch(processedImage);
            const blob = await response.blob();
            onSave(blob);
        }
    };

    const handleDiscard = () => {
        setProcessedImage(null);
        if (image) {
            resetCanvas(image);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col p-4 bg-neutral-900 border-neutral-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">Magic Eraser</h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-neutral-950 rounded-lg group">
                    <canvas
                        ref={canvasRef}
                        className={`max-w-full max-h-full object-contain ${!processedImage ? 'cursor-crosshair' : 'cursor-default'}`}
                        onMouseDown={startDrawing}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onMouseMove={draw}
                    />

                    {/* Result Overlay */}
                    {processedImage && (
                        <img
                            src={processedImage}
                            alt="Processed Result"
                            className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 ${showOriginal ? 'opacity-0' : 'opacity-100'}`}
                        />
                    )}

                    {/* Hint Overlay when holding compare */}
                    {processedImage && showOriginal && (
                        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
                            Original
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-neutral-400">Brush Size: {brushSize}px</span>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            disabled={!!processedImage}
                            className="w-32 accent-indigo-500 disabled:opacity-50"
                        />
                    </div>

                    <div className="flex gap-2">
                        {processedImage ? (
                            <>
                                <Button variant="secondary" onClick={handleDiscard}>
                                    <RefreshCcw className="w-4 h-4 mr-2" />
                                    Discard
                                </Button>
                                <Button
                                    variant="outline"
                                    className="active:bg-indigo-500/20 select-none"
                                    onMouseDown={() => setShowOriginal(true)}
                                    onMouseUp={() => setShowOriginal(false)}
                                    onMouseLeave={() => setShowOriginal(false)}
                                    onTouchStart={() => setShowOriginal(true)}
                                    onTouchEnd={() => setShowOriginal(false)}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Hold to Compare
                                </Button>
                                <Button onClick={handleApply}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Apply Changes
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleErase} disabled={isProcessing} isLoading={isProcessing}>
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Remove Object
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
