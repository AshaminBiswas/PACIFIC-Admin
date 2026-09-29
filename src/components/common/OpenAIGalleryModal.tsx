import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  generate4GalleryAngles,
  generateCuratedGalleryAngles,
  getOpenAIApiKey,
  setOpenAIApiKey,
  isOpenAIConfigured,
  CAMERA_ANGLES,
  AngleGenerationProgress,
  GeneratedAngleResult,
} from '@/lib/openaiImageService';

interface OpenAIGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainCoverUrl: string;
  modelTitle: string;
  category: string;
  description?: string;
  onSuccess: (generatedUrls: string[]) => void;
}

export default function OpenAIGalleryModal({
  isOpen,
  onClose,
  mainCoverUrl,
  modelTitle,
  category,
  description = '',
  onSuccess,
}: OpenAIGalleryModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<AngleGenerationProgress>({
    step: 0,
    total: 4,
    currentAngle: 'Ready to generate',
    status: 'idle',
    resultsSoFar: [],
  });
  const [results, setResults] = useState<GeneratedAngleResult[]>([]);
  const [error, setError] = useState('');

  // Check key on open
  useEffect(() => {
    if (isOpen) {
      const existing = getOpenAIApiKey();
      setHasKey(Boolean(existing));
      setApiKey(existing || '');
      setError('');
      setIsGenerating(false);
      setProgress({
        step: 0,
        total: 4,
        currentAngle: 'Ready to generate',
        status: 'idle',
        resultsSoFar: [],
      });
      setResults([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid OpenAI API key (starts with sk-...)');
      return;
    }
    setOpenAIApiKey(apiKey.trim());
    setHasKey(true);
    setIsEditingKey(false);
    setError('');
  };

  const handleStartGeneration = async () => {
    if (!mainCoverUrl) {
      setError('Please provide or upload a Main Cover photo first.');
      return;
    }

    if (!hasKey && !apiKey.trim()) {
      setIsEditingKey(true);
      setError('OpenAI API key is required. Please set VITE_OPENAI_API_KEY in .env or enter it below.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setResults([]);

    try {
      const generated = await generate4GalleryAngles({
        mainCoverUrl,
        modelTitle: modelTitle || `${category} Model`,
        category,
        description,
        onProgress: (p) => {
          setProgress(p);
          if (p.resultsSoFar && p.resultsSoFar.length > 0) {
            setResults(p.resultsSoFar);
          }
        },
      });

      setResults(generated);
      setProgress({
        step: 4,
        total: 4,
        currentAngle: 'All 4 angles generated successfully!',
        status: 'completed',
        resultsSoFar: generated,
      });
    } catch (err: any) {
      console.error('[OpenAI Modal] Error during multi-angle generation:', err);
      setError(err.message || 'Generation failed. Please verify your OpenAI API key and balance.');
      setProgress((prev) => ({ ...prev, status: 'error' }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartCuratedGeneration = async () => {
    setError('');
    setIsGenerating(true);
    setResults([]);

    try {
      const generated = await generateCuratedGalleryAngles({
        mainCoverUrl,
        modelTitle: modelTitle || `${category} Model`,
        category,
        description,
        onProgress: (p) => {
          setProgress(p);
          if (p.resultsSoFar && p.resultsSoFar.length > 0) {
            setResults(p.resultsSoFar);
          }
        },
      });

      setResults(generated);
      setProgress({
        step: 4,
        total: 4,
        currentAngle: 'All 4 angles generated in 4:3 WebP and uploaded to ImageKit!',
        status: 'completed',
        resultsSoFar: generated,
      });
    } catch (err: any) {
      console.error('[Curated Modal] Error:', err);
      setError(err.message || 'Failed to process curated angles.');
      setProgress((prev) => ({ ...prev, status: 'error' }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToGallery = () => {
    if (results.length === 0) return;
    const urls = results.map((r) => r.url);
    onSuccess(urls);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0e0e1e] border border-[#7FB706]/30 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#12122a] via-[#0e0e1e] to-[#12122a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-black font-black shadow-lg shadow-[#7FB706]/20">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Multi-Angle Gallery Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/30 font-semibold uppercase tracking-wider">
                  DALL-E 3 • 4:3 WebP
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Auto-generates 4 architectural camera angles from your cover photo & stores on ImageKit.io CDN
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* API Key Banner / Form */}
          {(!hasKey || isEditingKey) && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <Key className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-300">OpenAI API Key Configuration</h4>
                  <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                    Enter your OpenAI API key below or set <code className="px-1 py-0.5 bg-black/40 rounded text-amber-200">VITE_OPENAI_API_KEY</code> in your <code className="px-1 py-0.5 bg-black/40 rounded text-amber-200">.env</code> file.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="flex-1 bg-black/60 border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-xl transition"
                >
                  Save Key
                </button>
                {hasKey && (
                  <button
                    type="button"
                    onClick={() => setIsEditingKey(false)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Model & Source Cover Preview */}
          <div className="flex items-center gap-4 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
            <div className="w-20 h-15 aspect-[4/3] rounded-xl overflow-hidden bg-black border border-[#7FB706]/40 shrink-0">
              {mainCoverUrl ? (
                <img src={mainCoverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/30 uppercase tracking-wider">
                  {category}
                </span>
                <span className="text-xs text-gray-400 truncate">Source Hero Image</span>
              </div>
              <h4 className="text-sm font-bold text-white truncate mt-1">
                {modelTitle || 'Untitled Product Model'}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                Target Ratio: 4:3 (1200×900) • Multi-angle architectural simulation
              </p>
            </div>
            {hasKey && !isEditingKey && (
              <button
                type="button"
                onClick={() => setIsEditingKey(true)}
                className="text-[11px] text-gray-400 hover:text-white underline shrink-0"
              >
                Change Key
              </button>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3 text-xs text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div className="flex-1 leading-relaxed font-medium">{error}</div>
              </div>
              {(error.includes('credits') || error.includes('429') || error.includes('Exhausted')) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
                  <a
                    href="https://platform.openai.com/settings/organization/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Add OpenAI Credits ($5+)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingKey(true);
                      setError('');
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-semibold transition"
                  >
                    Switch API Key
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCuratedGeneration}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:opacity-95 text-black rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    Use Curated 4:3 Angles (Backup Demo)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4 Camera Angles Blueprint */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#7FB706]" />
                4 Architectural Angles Generated In 4:3 Ratio
              </label>
              <span className="text-[11px] text-gray-400 font-mono">
                {results.length}/4 Created
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CAMERA_ANGLES.map((angle, idx) => {
                const isGenerated = results.some((r) => r.angleName === angle.name);
                const isCurrentlyGenerating = isGenerating && progress.step === idx + 1;
                const resultObj = results.find((r) => r.angleName === angle.name);

                return (
                  <div
                    key={angle.key}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                      isGenerated
                        ? 'border-[#7FB706]/50 bg-[#7FB706]/10'
                        : isCurrentlyGenerating
                        ? 'border-[#B5F823] bg-[#B5F823]/10 ring-1 ring-[#B5F823]'
                        : 'border-white/5 bg-[#121226]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 font-mono">
                            0{idx + 1}.
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {angle.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-snug">
                          {angle.description}
                        </p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {isGenerated ? (
                          <CheckCircle2 className="w-4 h-4 text-[#7FB706]" />
                        ) : isCurrentlyGenerating ? (
                          <Loader2 className="w-4 h-4 text-[#B5F823] animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        )}
                      </div>
                    </div>

                    {resultObj && (
                      <div className="mt-2.5 rounded-xl overflow-hidden aspect-[4/3] bg-black border border-[#7FB706]/40 relative group">
                        <img src={resultObj.url} alt={angle.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <a
                            href={resultObj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View CDN
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Progress Bar when generating */}
          {isGenerating && (
            <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#7FB706] animate-spin" />
                  {progress.currentAngle}
                </span>
                <span className="text-[#B5F823] font-bold font-mono">
                  {Math.round((progress.step / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7FB706] to-[#B5F823] transition-all duration-500"
                  style={{ width: `${Math.max(5, (progress.step / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                Generating high-fidelity photographic render & uploading 4:3 WebP to ImageKit...
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-[#0a0a16] flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition disabled:opacity-40"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {results.length > 0 && !isGenerating && (
              <button
                type="button"
                onClick={handleApplyToGallery}
                className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/30"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                Apply {results.length} Photos to Gallery
              </button>
            )}

            {results.length === 0 && (
              <button
                type="button"
                disabled={isGenerating || !mainCoverUrl}
                onClick={handleStartGeneration}
                className="px-5 py-2.5 bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:opacity-95 text-black text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Generating Angles (1-2 min)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Generate 4 Gallery Angles (AI)</span>
                  </>
                )}
              </button>
            )}

            {results.length > 0 && results.length < 4 && !isGenerating && (
              <button
                type="button"
                onClick={handleStartGeneration}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
