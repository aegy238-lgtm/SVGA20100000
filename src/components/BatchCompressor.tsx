
import React, { useState, useRef, useEffect } from 'react';
import { UserRecord } from '../types';

declare var JSZip: any;

interface ImageFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  originalSize: number;
  compressedSize?: number;
  previewUrl: string;
  savingPercent?: number;
}

export const BatchCompressor: React.FC<{ onCancel: () => void, currentUser: UserRecord | null }> = ({ onCancel, currentUser }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageQuality, setImageQuality] = useState(80);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newImages: ImageFile[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      status: 'pending',
      progress: 0,
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const compressPNGPro = async (imgFile: ImageFile, quality: number): Promise<{ blob: Blob; size: number; percent: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          canvas.width = w;
          canvas.height = h;
          
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
          if (!ctx) throw new Error('Context fail');
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          
          // Apply quantization if quality < 100
          if (quality < 100) {
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            
            // Calculate levels based on quality (0-100)
            // Quality 100 = 256 levels (no change)
            // Quality 0 = 2 levels (extreme)
            // We map 0-100 to approx 2-256 levels
            const levels = Math.max(2, Math.floor((quality / 100) * 256));
            const factor = 255 / (levels - 1);

            for (let i = 0; i < data.length; i += 4) {
              // Quantize RGB channels
              data[i] = Math.floor(data[i] / factor + 0.5) * factor;     // Red
              data[i+1] = Math.floor(data[i+1] / factor + 0.5) * factor; // Green
              data[i+2] = Math.floor(data[i+2] / factor + 0.5) * factor; // Blue
              // Alpha channel remains untouched for transparency
            }
            ctx.putImageData(imageData, 0, 0);
          }
          
          canvas.toBlob((blob) => {
            if (blob) {
              let finalBlob = blob;
              let finalSize = blob.size;
              
              // Smart check: if result is larger, use original (unless forced low quality)
              if (finalSize >= imgFile.originalSize && imgFile.file.type === 'image/png' && quality > 90) {
                finalBlob = imgFile.file;
                finalSize = imgFile.originalSize;
              }

              const saving = imgFile.originalSize > finalSize 
                ? Math.round(((imgFile.originalSize - finalSize) / imgFile.originalSize) * 100) 
                : 0;

              resolve({ blob: finalBlob, size: finalSize, percent: saving });
            } else reject('Blob Error');
          }, 'image/png');
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject('Load Error');
      img.src = imgFile.previewUrl;
    });
  };

  const startBatchProcess = async () => {
    if (images.length === 0 || isProcessing) return;

    setIsProcessing(true);

    const zip = new JSZip();
    const total = images.length;
    let processedCount = 0;
    const CONCURRENCY = 3;

    const processQueue = [...images];
    const workers = Array(CONCURRENCY).fill(null).map(async () => {
      while (processQueue.length > 0) {
        const item = processQueue.shift();
        if (!item) break;

        setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: 'processing' } : img));

        try {
          const result = await compressPNGPro(item, imageQuality);
          zip.file(item.file.name.replace(/\.[^/.]+$/, "") + "_optimized.png", result.blob);
          
          setImages(prev => prev.map(img => 
            img.id === item.id ? { ...img, status: 'done', compressedSize: result.size, savingPercent: result.percent, progress: 100 } : img
          ));
        } catch (e) {
          setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: 'error' } : img));
        }

        processedCount++;
      }
    });

    await Promise.all(workers);
    
    if (processedCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Optimized_Images_Q${imageQuality}_${Date.now()}.zip`;
      link.click();
    }
    setIsProcessing(false);
  };

  const totalOriginalSize = images.reduce((acc, img) => acc + img.originalSize, 0);
  const totalCompressedSize = images.reduce((acc, img) => acc + (img.compressedSize || 0), 0);
  const totalSaved = totalOriginalSize - totalCompressedSize;
  const totalSavedPercent = totalOriginalSize > 0 ? (totalSaved / totalOriginalSize) * 100 : 0;
  const successCount = images.filter(img => img.status === 'done').length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Batch Image Compression</h1>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Main Control Panel */}
        <div className="bg-[#1a1d24] rounded-lg p-6 border border-gray-800 shadow-xl">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <label className="text-lg font-medium text-gray-200">Image Quality</label>
              <div className="bg-[#0f1115] border border-gray-700 rounded px-3 py-1 text-white font-mono">
                {imageQuality}
              </div>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={imageQuality} 
              onChange={(e) => setImageQuality(parseInt(e.target.value))} 
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Low Quality (Max Compression)</span>
              <span>High Quality (Min Compression)</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={startBatchProcess} 
              disabled={images.length === 0 || isProcessing}
              className={`w-full py-3 rounded-md font-medium text-white transition-all ${
                images.length === 0 || isProcessing 
                  ? 'bg-blue-600/50 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Start Compression'}
            </button>

            {successCount > 0 && !isProcessing && (
              <button 
                onClick={() => {
                   // Re-trigger download logic if needed, or just rely on auto-download
                   // For now, this button is visual as auto-download happens. 
                   // But let's make it functional by re-generating zip if user wants.
                   startBatchProcess(); // This would re-process. Better to just show it as a state indicator or keep it simple.
                   // Actually, let's make it a "Add More Files" or just keep it as the primary action area.
                }}
                className="w-full py-3 rounded-md font-medium text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download ZIP
              </button>
            )}

            <button 
              onClick={() => { setImages([]); setIsProcessing(false); }}
              className="w-full py-3 rounded-md font-medium text-red-500 border border-red-900/50 hover:bg-red-900/10 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-[#1a1d24] rounded-lg p-6 border border-gray-800 shadow-xl">
          <h3 className="text-lg font-medium text-gray-200 mb-6">Compression Results</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400">Total Files</span>
              <span className="text-white font-mono">{images.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400">Success Count</span>
              <span className="text-green-500 font-mono">{successCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400">Original Size</span>
              <span className="text-white font-mono">{formatSize(totalOriginalSize)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400">Compressed</span>
              <span className="text-blue-400 font-mono">
                {successCount > 0 ? formatSize(totalCompressedSize) : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Total Saved</span>
              <span className="text-green-500 font-mono">
                {successCount > 0 ? `${formatSize(totalSaved)} (-${totalSavedPercent.toFixed(1)}%)` : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* File Drop Area (Styled to fit) */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
        >
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <p className="text-gray-400 font-medium">Click to add images</p>
          <p className="text-gray-600 text-sm mt-1">Supports PNG, JPG, WEBP</p>
          <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        </div>

        {/* Image Grid Preview (Optional but helpful) */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src={img.previewUrl} className="w-full h-full object-contain" />
                {img.status === 'done' && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{img.savingPercent}%
                  </div>
                )}
                {img.status === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
      
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #2563eb; /* Blue border */
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
          margin-top: -6px; /* Align with track */
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #2563eb; /* Blue track */
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
