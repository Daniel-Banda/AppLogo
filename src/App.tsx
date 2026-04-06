import { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { LogoUploader } from './components/LogoUploader';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Wand2, Download, RotateCcw, Settings2 } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { processImageWithLogo, generateDownloadBlob } from './utils/logoPlacer';
import { LogoPlacementEditor } from './components/LogoPlacementEditor';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {
  const {
    images, logos, isProcessing, setProcessing,
    processedImages, setProcessedImages, updateProcessedImage,
    editingLogoIndex, setEditingLogoIndex,
    logoScale, setLogoScale,
  } = useAppStore();

  const [downloadFormat, setDownloadFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [downloadQuality, setDownloadQuality] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);


  const handleProcess = async () => {
    if (logos.length === 0 || images.length === 0) return;

    setProcessing(true);
    try {
      const results = await Promise.all(
        images.map(image => processImageWithLogo(image, logos, 0.05, logoScale))
      );
      setProcessedImages(results);
    } catch (error) {
      console.error('Error al procesar:', error);
      alert('Ocurrió un error durante el procesamiento.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (processedImages.length === 0) return;
    setIsDownloading(true);

    try {
      const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Individual JPG downloads on Mobile
        for (let idx = 0; idx < processedImages.length; idx++) {
          const img = processedImages[idx];
          const originalFile = images[idx];
          if (!originalFile) continue;

          const blob = await generateDownloadBlob(
            img,
            originalFile,
            logos,
            'image/jpeg', // Force JPG for individual mobile download as requested
            downloadQuality
          );

          const nameWithoutExt = img.originalName.substring(0, img.originalName.lastIndexOf('.')) || img.originalName;
          const fileName = `processed-${nameWithoutExt}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });

          try {
            // Try Web Share API first (Native share menu -> Save Image)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Processed Image',
                text: 'Save or share your processed image',
              });
            } else {
              throw new Error('Web Share API not supported or cannot share files.');
            }
          } catch (err) {
            console.log("Share failed, falling back to new tab:", err);
            // Fallback: Open in new tab so user can long-press to save
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            if (idx === 0) { // Only alert once
              alert("Mantén presionada la imagen y selecciona 'Guardar en Fotos' o 'Descargar imagen'.");
            }
          }
        }
      } else {
        // ZIP Desktop downloads
        const zip = new JSZip();

        await Promise.all(processedImages.map(async (img, idx) => {
          const originalFile = images[idx];
          if (!originalFile) return;

          const blob = await generateDownloadBlob(
            img,
            originalFile,
            logos,
            downloadFormat,
            downloadQuality
          );

          const extension = downloadFormat === 'image/jpeg' ? 'jpg' : 'png';
          const nameWithoutExt = img.originalName.substring(0, img.originalName.lastIndexOf('.')) || img.originalName;

          zip.file(`processed-${nameWithoutExt}.${extension}`, blob);
        }));

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'processed-images.zip');
      }
    } catch (e) {
      console.error(e);
      alert("Error al generar la descarga");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setProcessedImages([]);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Colocador Inteligente de Logos
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Coloca automáticamente tu logo en múltiples imágenes con detección inteligente de contraste.
            Sube tus logos y reposiciónalos exactamente donde quieras.
          </p>
        </header>


        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar / Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm sticky top-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                Controles
              </h2>

              <div className="space-y-6">
                <section>
                  <label className="block text-sm font-medium text-neutral-300 mb-3">
                    1. Subir Logo
                  </label>
                  <LogoUploader />
                </section>

                <div className="h-px bg-neutral-700/50" />

                <section>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-neutral-300">
                      Escala del Logo
                    </label>
                    <span className="text-xs text-neutral-400">{Math.round(logoScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={logoScale}
                    onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </section>

                <section>
                  <label className="block text-sm font-medium text-neutral-300 mb-3">
                    2. Acciones
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      className="w-full gap-2"
                      disabled={logos.length === 0 || images.length === 0 || isProcessing}
                      onClick={handleProcess}
                      isLoading={isProcessing}
                    >
                      <Wand2 className="w-4 h-4" />
                      Auto Colocar
                    </Button>
                  </div>
                </section>

                <div className="h-px bg-neutral-700/50" />

                <section>
                  <div className="flex items-center gap-2 mb-3 text-neutral-300">
                    <Settings2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Ajustes de Descarga</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-700">
                      <button
                        className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${downloadFormat === 'image/jpeg' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                        onClick={() => setDownloadFormat('image/jpeg')}
                      >
                        JPEG
                      </button>
                      <button
                        className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${downloadFormat === 'image/png' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                        onClick={() => setDownloadFormat('image/png')}
                      >
                        PNG
                      </button>
                    </div>

                    {downloadFormat === 'image/jpeg' && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-neutral-400">Calidad</span>
                          <span className="text-xs text-neutral-400">{Math.round(downloadQuality * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={downloadQuality}
                          onChange={(e) => setDownloadQuality(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={processedImages.length === 0 || isDownloading}
                      onClick={handleDownload}
                      isLoading={isDownloading}
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full gap-2"
                      disabled={processedImages.length === 0}
                      onClick={handleReset}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reiniciar
                    </Button>
                  </div>
                </section>

              </div>
            </div>
          </div>

          {/* Main Content / Gallery */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm min-h-[600px]">
              {processedImages.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Imágenes Procesadas ({processedImages.length})</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {processedImages.map((img, idx) => (
                      <Card key={idx} className="relative group aspect-square">
                        <img
                          src={img.url}
                          alt={`Processed ${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setEditingLogoIndex(idx)}
                          >
                            <Wand2 className="w-4 h-4" />
                          </Button>
                          <a href={img.url} download={`processed-${img.originalName}`}>
                            <Button variant="secondary" size="sm" className="rounded-full">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <ImageUploader />
              )}
            </div>
          </div>
        </main >

        {
          editingLogoIndex !== null && processedImages[editingLogoIndex] && images[editingLogoIndex] && (
            <LogoPlacementEditor
              imageFile={images[editingLogoIndex]}
              logos={logos}
              initialConfig={{
                logoIndex: processedImages[editingLogoIndex].logoIndex,
                x: processedImages[editingLogoIndex].x,
                y: processedImages[editingLogoIndex].y,
                width: processedImages[editingLogoIndex].width,
                height: processedImages[editingLogoIndex].height
              }}
              onSave={(newBlob, newConfig) => {
                const original = processedImages[editingLogoIndex];
                updateProcessedImage(editingLogoIndex, {
                  ...original,
                  blob: newBlob,
                  url: URL.createObjectURL(newBlob),
                  ...newConfig
                });
                setEditingLogoIndex(null);
              }}
              onCancel={() => setEditingLogoIndex(null)}
            />
          )
        }
      </div >
    </div >
  );
}

export default App;
