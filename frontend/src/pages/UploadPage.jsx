import OCRUploader from '../components/OCRUploader';

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Upload Survey</h1>
        <p className="text-sm text-surface-200/50 mt-1">
          Upload paper survey images to automatically extract and create need records using OCR
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-start gap-3 mb-6 p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="text-sm font-semibold text-primary-400">How it works</h4>
            <ol className="text-xs text-surface-200/50 mt-1 space-y-1 list-decimal list-inside">
              <li>Upload a photo of a paper survey or field report</li>
              <li>Our OCR engine extracts text from the image</li>
              <li>NLP analyzes the text to identify needs, categories, and urgency</li>
              <li>Extracted data is shown for review before creating records</li>
            </ol>
          </div>
        </div>

        <OCRUploader onComplete={(data) => console.log('OCR complete:', data)} />
      </div>
    </div>
  );
}
