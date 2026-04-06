import { create } from 'zustand';

interface AppState {
    images: File[];
    processedImages: {
        url: string;
        originalName: string;
        blob: Blob;
        logoIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    logos: File[];
    isProcessing: boolean;
    editingImageIndex: number | null;
    editingLogoIndex: number | null;
    logoScale: number;

    addImages: (newImages: File[]) => void;
    setProcessedImages: (images: {
        url: string;
        originalName: string;
        blob: Blob;
        logoIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }[]) => void;
    removeImage: (index: number) => void;
    updateImage: (index: number, newFile: File) => void;
    updateProcessedImage: (index: number, data: { url: string; originalName: string; blob: Blob; logoIndex: number; x: number; y: number; width: number; height: number; }) => void;

    setLogos: (logos: File[]) => void;
    addLogos: (newLogos: File[]) => void;
    removeLogo: (index: number) => void;

    setLogoScale: (scale: number) => void;
    setProcessing: (status: boolean) => void;
    setEditingImageIndex: (index: number | null) => void;
    setEditingLogoIndex: (index: number | null) => void;

    huggingFaceToken: string;
    setHuggingFaceToken: (token: string) => void;


}

export const useAppStore = create<AppState>((set) => ({
    images: [],
    processedImages: [],
    logos: [],
    isProcessing: false,
    editingImageIndex: null,
    editingLogoIndex: null,
    logoScale: 0.25,

    addImages: (newImages) => set((state) => ({ images: [...state.images, ...newImages] })),
    setProcessedImages: (processed) => set({ processedImages: processed }),
    removeImage: (index) => set((state) => ({ images: state.images.filter((_, i) => i !== index) })),
    updateImage: (index, newFile) => set((state) => {
        const newImages = [...state.images];
        newImages[index] = newFile;
        return { images: newImages };
    }),
    updateProcessedImage: (index, data) => set((state) => {
        const newProcessed = [...state.processedImages];
        newProcessed[index] = data;
        return { processedImages: newProcessed };
    }),

    setLogos: (logos) => set({ logos }),
    addLogos: (newLogos) => set((state) => ({ logos: [...state.logos, ...newLogos].slice(0, 3) })),
    removeLogo: (index) => set((state) => ({ logos: state.logos.filter((_, i) => i !== index) })),

    setLogoScale: (scale) => set({ logoScale: scale }),
    setProcessing: (status) => set({ isProcessing: status }),
    setEditingImageIndex: (index) => set({ editingImageIndex: index }),
    setEditingLogoIndex: (index) => set({ editingLogoIndex: index }),

    huggingFaceToken: '',
    setHuggingFaceToken: (token: string) => set({ huggingFaceToken: token }),


}));
