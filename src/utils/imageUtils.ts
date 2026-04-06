export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const getAverageColor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
): { r: number, g: number, b: number, luminance: number } => {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    const count = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Calculate Relative Luminance
    // https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const Rs = r / 255;
    const Gs = g / 255;
    const Bs = b / 255;

    const R = Rs <= 0.03928 ? Rs / 12.92 : Math.pow((Rs + 0.055) / 1.055, 2.4);
    const G = Gs <= 0.03928 ? Gs / 12.92 : Math.pow((Gs + 0.055) / 1.055, 2.4);
    const B = Bs <= 0.03928 ? Bs / 12.92 : Math.pow((Bs + 0.055) / 1.055, 2.4);

    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

    return { r, g, b, luminance };
};

export const getContrastRatio = (lum1: number, lum2: number): number => {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
};
