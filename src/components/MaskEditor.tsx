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
                    alert("Por favor ingrese su Token de Hugging Face en la configuración.");
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
                console.error("Falla en la edición por IA", error);
                alert(`Error al procesar la imagen: ${error.message || 'Error desconocido'}`);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col p-8 bg-black border border-neutral-900 rounded-none">
                <div className="flex justify-between items-center mb-8 border-b border-neutral-900 pb-6">
                    <h3 className="text-sm uppercase tracking-[0.2em] font-medium text-white flex items-center gap-3">
                        <Wand2 className="w-4 h-4 text-neutral-500" />
                        Borrador // Mágico
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel} className="p-2">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-neutral-950 rounded-none group border border-neutral-900">
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
                            alt="Resultado Procesado"
                            className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 ${showOriginal ? 'opacity-0' : 'opacity-100'}`}
                        />
                    )}

                    {/* Hint Overlay when holding compare */}
                    {processedImage && showOriginal && (
                        <div className="absolute top-4 left-4 bg-black/80 border border-white/20 text-[10px] uppercase tracking-widest text-white px-3 py-1 rounded-none pointer-events-none">
                            Original
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <div className="flex justify-between md:justify-start items-center gap-6">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Pincel</span>
                            <span className="text-[10px] font-mono text-neutral-400">{brushSize}px</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            disabled={!!processedImage}
                            className="w-full md:w-48 accent-white h-1 bg-neutral-900 rounded-none appearance-none disabled:opacity-30"
                        />
                    </div>

                    <div className="flex gap-2">
                        {processedImage ? (
                            <>
                                <Button variant="secondary" onClick={handleDiscard}>
                                    <RefreshCcw className="w-4 h-4 mr-2" />
                                    Descartar
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
                                    Mantener para Comparar
                                </Button>
                                <Button onClick={handleApply}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Aplicar Cambios
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleErase} disabled={isProcessing} isLoading={isProcessing}>
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Eliminar Objeto
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
