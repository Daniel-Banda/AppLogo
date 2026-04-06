
import { fileToDataURL } from '../utils/imageUtils';

export const editImageWithAI = async (
    imageBlob: Blob,
    maskBlob: Blob,
    prompt: string,
    token: string
): Promise<Blob> => {
    if (!token) {
        throw new Error("Hugging Face Token is required");
    }

    // Convert blobs to base64
    // fileToDataURL expects a File, but Blob is compatible for FileReader
    const imageBase64Full = await fileToDataURL(new File([imageBlob], "image.png"));
    const maskBase64Full = await fileToDataURL(new File([maskBlob], "mask.png"));

    // Remove data:image/png;base64, prefix if present
    const imageBase64 = imageBase64Full.split(',')[1];
    const maskBase64 = maskBase64Full.split(',')[1];

    const payload = {
        inputs: prompt || "remove object, clean background",
        parameters: {
            negative_prompt: "text, watermark, blur, artifacts, low quality, ugly",
        },
        image: imageBase64,
        mask_image: maskBase64
    };

    const response = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-inpainting",
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        let errorMsg = "Hugging Face API Failed";
        try {
            const err = await response.json();
            errorMsg = err.error || JSON.stringify(err);
        } catch (e) { }

        // Handle loading model state
        if (errorMsg.includes("loading")) {
            throw new Error("Model is loading. Please try again in 30 seconds.");
        }

        throw new Error(errorMsg);
    }

    // The response is the image blob
    return await response.blob();
};
