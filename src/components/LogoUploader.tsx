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
            alert('Maximium 3 logos allowed.');
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
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-neutral-300">Selected Logos ({logos.length}/3)</h3>
                    <p className="text-xs text-neutral-500">Auto-selects best match</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {logos.map((file, index) => (
                        <Card key={`${file.name}-${index}`} className="p-2 relative group flex flex-col items-center justify-center bg-neutral-800 border-neutral-700 aspect-square">
                            <div className="w-full h-full flex items-center justify-center p-1">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Logo"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-600 border border-neutral-600"
                                onClick={() => removeLogo(index)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </Card>
                    ))}

                    {logos.length < 3 && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center transition-colors cursor-pointer text-center aspect-square",
                                isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-neutral-700 hover:border-neutral-600 bg-neutral-800/30"
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className="p-1.5 bg-neutral-800 rounded-full mb-1">
                                <Upload className="w-3 h-3 text-indigo-400" />
                            </div>
                            <p className="text-xs font-medium text-white">Upload</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
