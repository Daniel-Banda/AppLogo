
export const DEFAULT_LOGOS = [
    '/Grupo VIVE ELIT 1.png',
    '/Grupo VIVE ELIT 3.png',
];

export const loadDefaultLogos = async (): Promise<File[]> => {
    try {
        const logoPromises = DEFAULT_LOGOS.map(async (path) => {
            const response = await fetch(path);
            const blob = await response.blob();
            // Extract filename from path
            const name = path.split('/').pop() || 'logo.png';
            return new File([blob], name, { type: blob.type });
        });

        return await Promise.all(logoPromises);
    } catch (error) {
        console.error('Failed to load default logos:', error);
        return [];
    }
};

export const loadLogo = async (path: string): Promise<File | null> => {
    try {
        const response = await fetch(path);
        const blob = await response.blob();
        const name = path.split('/').pop() || 'logo.png';
        return new File([blob], name, { type: blob.type });
    } catch (error) {
        console.error('Failed to load logo:', path, error);
        return null;
    }
};
