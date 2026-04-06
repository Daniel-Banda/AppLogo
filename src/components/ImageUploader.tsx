import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Eraser } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export const ImageUploader = () => {
    const { images, addImages, removeImage, setEditingImageIndex } = useAppStore();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Basic validation for 40 limit could be here or in store
        if (images.length + acceptedFiles.length > 100) {
            alert('Se permiten máximo 100 imágenes.');
            return;
        }
        addImages(acceptedFiles);
    }, [addImages, images.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 100 - images.length,
        disabled: images.length >= 100,
    });

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Imágenes ({images.length}/100)</h2>
                {images.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => images.forEach(() => removeImage(0))}>
                        Limpiar Todo
                    </Button>
                )}
            </div>

            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[200px]",
                    isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-neutral-700 hover:border-neutral-600 bg-neutral-800/30",
                    images.length >= 100 && "opacity-50 cursor-not-allowed"
                )}
            >
                <input {...getInputProps()} />
                <div className="p-4 bg-neutral-800 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-lg font-medium text-white mb-1">
                    {isDragActive ? "Suelte las imágenes aquí" : "Arrastre y suelte las imágenes aquí"}
                </p>
                <p className="text-sm text-neutral-400">o haga clic para buscar</p>
            </div>

            <AnimatePresence>
                {images.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8"
                    >
                        {images.map((file, index) => (
                            <Card key={`${file.name}-${index}`} className="relative group aspect-square">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingImageIndex(index)} className="text-white hover:bg-indigo-500/20 hover:text-indigo-400 rounded-full p-2">
                                        <Eraser className="w-5 h-5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => removeImage(index)} className="text-white hover:bg-red-500/20 hover:text-red-400 rounded-full p-2">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-xs text-white truncate px-1">{file.name}</p>
                                </div>
                            </Card>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
