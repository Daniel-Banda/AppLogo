import { loadImage, fileToDataURL, getAverageColor, getContrastRatio } from './imageUtils';

export interface ProcessedImage {
    originalName: string;
    blob: Blob;
    url: string;
    logoIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export const processImageWithLogo = async (
    imageFile: File,
    logoFiles: File[],
    paddingPercent: number = 0.05,
    logoSizePercent: number = 0.15
): Promise<ProcessedImage> => {
    // Load background image
    const imageUrl = await fileToDataURL(imageFile);
    const image = await loadImage(imageUrl);

    // Create canvas for background
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Draw background image
    ctx.drawImage(image, 0, 0);

    // If no logos, return original image
    if (logoFiles.length === 0) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas to Blob failed'));
                    return;
                }
                resolve({
                    originalName: imageFile.name,
                    blob,
                    url: URL.createObjectURL(blob),
                    logoIndex: -1,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                });
            }, imageFile.type);
        });
    }

    // Best config tracking
    let bestConfig = {
        logoIndex: 0,
        logo: null as HTMLImageElement | null,
        score: -1,
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };

    // Iterate through all provided logos
    for (let i = 0; i < logoFiles.length; i++) {
        const logoFile = logoFiles[i];
        const logoUrl = await fileToDataURL(logoFile);
        const logo = await loadImage(logoUrl);

        // Determine logo dimensions
        const logoWidth = image.width * logoSizePercent;
        const logoHeight = (logo.height / logo.width) * logoWidth;
        const padding = image.width * paddingPercent;

        // Define potential positions (Corners)
        const positions = [
            { name: 'top-left', x: padding, y: padding },
            { name: 'top-right', x: image.width - logoWidth - padding, y: padding },
            { name: 'bottom-left', x: padding, y: image.height - logoHeight - padding },
            { name: 'bottom-right', x: image.width - logoWidth - padding, y: image.height - logoHeight - padding },
        ];

        // Analyze logo luminance
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logo.width;
        logoCanvas.height = logo.height;
        const logoCtx = logoCanvas.getContext('2d');
        const logoColor = logoCtx ? (() => {
            logoCtx.drawImage(logo, 0, 0);
            return getAverageColor(logoCtx, 0, 0, logo.width, logo.height);
        })() : { luminance: 0.5 };

        // Check each position for this logo
        for (const pos of positions) {
            // Analyze background region
            const bgInfo = getAverageColor(ctx, pos.x, pos.y, logoWidth, logoHeight);
            const contrast = getContrastRatio(logoColor.luminance, bgInfo.luminance);

            // Weight visual preference
            let score = contrast;
            if (pos.name === 'bottom-right') score *= 1.1;
            if (pos.name === 'top-right') score *= 1.05;

            // Update best config if this is better
            if (score > bestConfig.score) {
                bestConfig = {
                    logoIndex: i,
                    logo: logo,
                    score: score,
                    x: pos.x,
                    y: pos.y,
                    width: logoWidth,
                    height: logoHeight
                };
            }
        }
    }

    // Draw the Best Logo at its Best Position
    if (bestConfig.logo) {
        ctx.drawImage(bestConfig.logo, bestConfig.x, bestConfig.y, bestConfig.width, bestConfig.height);
    }

    // Convert to Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas to Blob failed'));
                return;
            }
            resolve({
                originalName: imageFile.name,
                blob,
                url: URL.createObjectURL(blob),
                logoIndex: bestConfig.logoIndex,
                x: bestConfig.x,
                y: bestConfig.y,
                width: bestConfig.width,
                height: bestConfig.height
            });
        }, imageFile.type);
    });
};

export const reprocessImage = async (
    imageFile: File,
    logoFile: File,
    x: number,
    y: number,
    width: number,
    height: number
): Promise<Blob> => {
    // Load background image
    const imageUrl = await fileToDataURL(imageFile);
    const image = await loadImage(imageUrl);
    const logoUrl = await fileToDataURL(logoFile);
    const logo = await loadImage(logoUrl);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(image, 0, 0);
    ctx.drawImage(logo, x, y, width, height);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
        }, imageFile.type);
    });
}

export const generateDownloadBlob = async (
    processed: ProcessedImage,
    imageFile: File,
    logos: File[],
    format: 'image/jpeg' | 'image/png',
    quality: number
): Promise<Blob> => {
    // Load background image
    const imageUrl = await fileToDataURL(imageFile);
    const image = await loadImage(imageUrl);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(image, 0, 0);

    // Draw logo if one was selected
    if (processed.logoIndex !== -1 && logos[processed.logoIndex]) {
        const logoUrl = await fileToDataURL(logos[processed.logoIndex]);
        const logo = await loadImage(logoUrl);
        ctx.drawImage(logo, processed.x, processed.y, processed.width, processed.height);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
        }, format, quality);
    });
};
