import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

export const LogoUploader = () => {
    const { logos, addLogos, removeLogo } = useAppStore();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (logos.length + acceptedFiles.length > 3) {
            alert('Se permiten máximo 3 logos.');
            return;
        }
        addLogos(acceptedFiles);
    }, [addLogos, logos.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/png': [], 'image/jpeg': [], 'image/svg+xml': [] },
        maxFiles: 3 - logos.length,
        disabled: logos.length >= 3,
    });



    return (
        <div className="space-y-6">
            {/* Active Logos */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] uppercase tracking-widest font-medium text-neutral-500">Biblioteca // {logos.length}/3</h3>
                    <p className="text-[9px] uppercase tracking-tighter text-neutral-600">Auto-Contraste</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {logos.map((file, index) => (
                        <Card key={`${file.name}-${index}`} className="p-1 relative group flex flex-col items-center justify-center bg-black border-neutral-800 aspect-square">
                            <div className="w-full h-full flex items-center justify-center p-2">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Logo"
                                    className="max-w-full max-h-full object-contain grayscale brightness-200"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute -top-1 -right-1 w-5 h-5 p-0 rounded-none bg-black text-neutral-500 hover:text-white border border-neutral-800"
                                onClick={() => removeLogo(index)}
                            >
                                <X className="w-2.5 h-2.5" />
                            </Button>
                        </Card>
                    ))}

                    {logos.length < 3 && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border border-dashed p-2 flex flex-col items-center justify-center transition-all cursor-crosshair text-center aspect-square border-neutral-800",
                                isDragActive ? "border-white bg-white/5" : "hover:border-neutral-700 bg-neutral-900/30"
                            )}
                        >
                            <input {...getInputProps()} />
                            <Upload className="w-3 h-3 text-neutral-600 mb-1" />
                            <p className="text-[9px] uppercase tracking-widest text-neutral-500">Subir</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
