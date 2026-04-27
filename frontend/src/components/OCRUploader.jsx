import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { needsAPI } from '../services/api';

export default function OCRUploader({ onComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.tiff'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await needsAPI.bulkUpload(formData);
      setResult(data);
      onComplete?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      {!result && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/10 hover:border-primary-500/30 hover:bg-white/[0.02]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-4">📄</div>
          <p className="text-surface-200/70 text-sm">
            {isDragActive
              ? 'Drop the image here...'
              : 'Drag & drop a survey image here, or click to select'}
          </p>
          <p className="text-surface-200/30 text-xs mt-2">Supports JPEG, PNG, WebP, TIFF (max 10MB)</p>
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Preview</h4>
            <button onClick={reset} className="text-xs text-surface-200/40 hover:text-danger-400">Remove</button>
          </div>
          <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto object-contain" />
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing OCR...
                </>
              ) : (
                <>📤 Process & Extract</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-danger-500/30 bg-danger-500/5">
          <p className="text-danger-400 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold mb-2 text-success-400">✅ OCR Complete</h4>
            <p className="text-xs text-surface-200/50 mb-3">
              {result.needs?.length || 0} need(s) created from extracted data
            </p>

            {/* OCR Text */}
            <details className="mb-3">
              <summary className="text-xs text-surface-200/40 cursor-pointer hover:text-surface-200/60">
                View raw OCR text
              </summary>
              <pre className="mt-2 text-xs bg-surface-800/50 p-3 rounded-lg overflow-x-auto max-h-40 text-surface-200/60">
                {result.ocr_text}
              </pre>
            </details>

            {/* Extracted needs */}
            {result.needs?.map((need, i) => (
              <div key={i} className="glass-card p-3 mb-2">
                <p className="text-sm font-medium">{need.title}</p>
                <div className="flex gap-2 mt-1 text-xs text-surface-200/50">
                  <span className="capitalize">{need.category}</span>
                  <span>•</span>
                  <span>{need.area_name}</span>
                  <span>•</span>
                  <span>Urgency: {Math.round(need.urgency_score * 100)}%</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={reset} className="btn-secondary text-sm">Upload Another</button>
        </div>
      )}
    </div>
  );
}
