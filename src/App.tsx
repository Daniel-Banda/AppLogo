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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-20 text-left border-l-2 border-white pl-6">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6">
            COLOCADOR<br/>
            DIGITAL.
          </h1>
          <p className="text-neutral-500 max-w-xl text-lg font-light leading-relaxed">
            Arquitectura visual para la marca. Automatización inteligente de contraste y posicionamiento.
          </p>
        </header>


        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar / Controls */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-neutral-950 border border-neutral-800 rounded-none p-8 sticky top-12 shadow-[0_0_50px_rgba(255,255,255,0.02)]">
              <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold mb-10 flex items-center gap-3 text-white">
                <Wand2 className="w-4 h-4 text-[#FFB800]" />
                Panel de Control
              </h2>

              <div className="space-y-6">
                <section>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-[#FFB800] mb-2">
                    Paso 01. Identidad
                  </label>
                  <p className="text-[10px] text-neutral-500 mb-4 uppercase tracking-tighter">Carga los logos que deseas estampar</p>
                  <LogoUploader />
                </section>

                <div className="h-px bg-neutral-700/50" />

                <section>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] uppercase tracking-widest font-bold text-[#FFB800]">
                      Paso 02. Escala
                    </label>
                    <span className="text-[10px] font-mono text-white">{Math.round(logoScale * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mb-4 uppercase tracking-tighter">Ajusta el tamaño global del logo</p>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={logoScale}
                    onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                    className="w-full accent-[#FFB800] cursor-crosshair h-1 bg-neutral-900 rounded-none appearance-none"
                  />
                </section>

                <section>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-[#FFB800] mb-2">
                    Paso 03. Acción
                  </label>
                  <p className="text-[10px] text-neutral-500 mb-4 uppercase tracking-tighter">Procesa todas las imágenes con IA</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="gold"
                      className="w-full gap-2 py-6 text-sm"
                      disabled={logos.length === 0 || images.length === 0 || isProcessing}
                      onClick={handleProcess}
                      isLoading={isProcessing}
                    >
                      <Wand2 className="w-4 h-4" />
                      AUTO COLOCAR LOGOS
                    </Button>
                  </div>
                </section>

                <div className="h-px bg-neutral-700/50" />

                <section>
                  <div className="flex items-center gap-3 mb-4 text-neutral-400">
                    <Settings2 className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-medium">Salida de Archivo</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex bg-black rounded-none p-1 border border-neutral-800">
                      <button
                        className={`flex-1 text-[10px] py-2 rounded-none transition-all ${downloadFormat === 'image/jpeg' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                        onClick={() => setDownloadFormat('image/jpeg')}
                      >
                        JPEG
                      </button>
                      <button
                        className={`flex-1 text-[10px] py-2 rounded-none transition-all ${downloadFormat === 'image/png' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                        onClick={() => setDownloadFormat('image/png')}
                      >
                        PNG
                      </button>
                    </div>

                    {downloadFormat === 'image/jpeg' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] uppercase tracking-widest text-[#FFB800] font-bold">Compresión</span>
                          <span className="text-[10px] font-mono text-white">{Math.round(downloadQuality * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={downloadQuality}
                          onChange={(e) => setDownloadQuality(parseFloat(e.target.value))}
                          className="w-full accent-[#FFB800] h-1 bg-neutral-900 rounded-none appearance-none"
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
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-none p-10 min-h-[700px]">
              {processedImages.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-10 border-b border-neutral-800 pb-6">
                    <h2 className="text-sm uppercase tracking-[0.2em] font-medium text-neutral-400">Galería Procesada // {processedImages.length}</h2>
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

        {/* SEO & Info Section */}
        <footer className="mt-32 pt-20 border-t border-neutral-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-[#FFB800] text-sm uppercase tracking-[0.3em] font-bold mb-8">Información Técnica // SEO</h2>
              <h3 className="text-3xl font-light mb-6 leading-tight">HERRAMIENTA PROFESIONAL DE BRANDING Y AUTOMATIZACIÓN.</h3>
              <p className="text-neutral-500 font-light leading-relaxed mb-6">
                Optimiza el flujo de trabajo de tu marca con nuestra IA de posicionamiento. Diseñada para arquitectos visuales y fotógrafos que requieren precisión clínica en la marca de agua y protección de derechos de autor.
              </p>
              <div className="flex gap-8 text-[10px] uppercase tracking-widest text-neutral-600 font-mono">
                <span>// Contraste Dinámico</span>
                <span>// IA Generativa</span>
                <span>// Batch Processing</span>
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h4 className="text-white text-[11px] uppercase tracking-widest font-bold mb-4">Guía de Uso Rápido</h4>
                <ul className="space-y-3 text-sm text-neutral-500 font-light">
                  <li className="flex gap-3"><span className="text-[#FFB800] font-mono">01.</span> Carga tu logotipo en formato PNG o SVG para mejor calidad.</li>
                  <li className="flex gap-3"><span className="text-[#FFB800] font-mono">02.</span> Sube las fotografías originales en la galería principal.</li>
                  <li className="flex gap-3"><span className="text-[#FFB800] font-mono">03.</span> Ejecuta el procesador dinámico y ajusta individualmente si es necesario.</li>
                </ul>
              </div>
              <div className="pt-8 border-t border-neutral-900">
                <p className="text-[10px] text-neutral-700 uppercase tracking-widest">THRTN | DEFINING THE UNKNOWN © 2026</p>
              </div>
            </div>
          </div>
        </footer>
      </div >
    </div >
  );
}

export default App;
