import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  ExternalLink,
  Edit2,
  Check,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { uploadToImageKit } from '../../lib/imagekit';

export interface ModelImageFieldProps {
  imageUrl?: string;
  modelName?: string;
  categoryLabel?: string;
  onImageChange: (newUrl: string) => void;
  disabled?: boolean;
}

export const ModelImageField: React.FC<ModelImageFieldProps> = ({
  imageUrl,
  modelName,
  categoryLabel = 'Model Visual',
  onImageChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `model_${Date.now()}_${cleanBaseName}.${ext}`;

      const res = await uploadToImageKit(file, fileName, 'quotations/models');
      onImageChange(res.url);
    } catch (err: any) {
      console.error('Failed to upload model visual to ImageKit:', err);
      setUploadError(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    const trimmed = customUrlInput.trim();
    if (trimmed) {
      onImageChange(trimmed);
    }
    setEditingUrl(false);
    setCustomUrlInput('');
  };

  const hasImage = Boolean(imageUrl && imageUrl.trim());

  return (
    <div className="mt-3 p-3 rounded-xl bg-[#0c0b1e] border border-white/10 space-y-2">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#7FB706]/10 text-[#7FB706]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{categoryLabel}</span>
              {hasImage && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#7FB706]/20 text-[#7FB706] font-semibold border border-[#7FB706]/30">
                  Attached
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              Placed on the right side of hardware list on Quotation PDF Page 2
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Upload custom image via ImageKit CDN"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7FB706]" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>{hasImage ? 'Replace Image' : 'Upload Image'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => {
              setCustomUrlInput(imageUrl || '');
              setEditingUrl((v) => !v);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Paste image URL directly"
          >
            <Edit2 className="w-3 h-3 text-cyan-400" />
            <span>{editingUrl ? 'Cancel URL' : 'Enter URL'}</span>
          </button>

          {hasImage && (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onImageChange('')}
              className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[32px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium border border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove model visual image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Direct URL input */}
      {editingUrl && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://... image URL (ImageKit, Unsplash, CDN)"
            className="flex-1 bg-[#050512] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7FB706] text-black font-semibold text-xs hover:bg-[#8fd007] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Apply
          </button>
          <button
            type="button"
            onClick={() => setEditingUrl(false)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
          {uploadError}
        </p>
      )}

      {/* Visual Preview Card if image is attached */}
      {hasImage ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[#151428] border border-white/10">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/15 flex-shrink-0 flex items-center justify-center p-1 group">
            <img
              src={imageUrl}
              alt={modelName || 'Model visual'}
              className="max-w-full max-h-full object-contain"
            />
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              title="Open full size image"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate">
                {modelName || 'Selected Model Visual'}
              </span>
              <span className="text-[10px] text-[#7FB706] flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Ready for PDF
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate mt-0.5" title={imageUrl}>
              {imageUrl}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#7FB706] hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Size</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 italic bg-white/2 p-2 rounded-lg border border-dashed border-white/10 flex items-center justify-between">
          <span>No image attached. Selecting a standard model above will auto-assign its image, or you can upload a custom photo.</span>
        </div>
      )}
    </div>
  );
};

export default ModelImageField;
