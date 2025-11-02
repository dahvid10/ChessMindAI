import React, { useState, useCallback, useEffect } from 'react';
import { analyzeChessPosition } from './services/geminiService';

// --- HELPER TYPES ---
interface ImageFile {
  file: File;
  base64: string;
}

interface Analysis {
  bestMove: string;
  explanation: string;
  details: string;
  diagram: string | null;
}

// --- SVG ICONS (Defined outside main component) ---
const ChessKnightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C11.18 2 9.8 2.5 9 3.5c-1 1.25-1.5 3-1 4.5l-3 4-1.5-1L2 12.5 3.5 14l1.5 1-1 3.5 1.5 1.5 3.5-1 1 1.5L14 22l1.5-1.5-1-1.5 4-3c1.5.5 3.25 0 4.5-1 .9-.8 1.5-2.18 1.5-3s-2.5-9.8-3.5-9C21.5 4.5 19.75 3 18.5 2c-.9-.8-2.18-1-3-1zm0 2c.62 0 1.5.5 2 1s1 1.38 1 2-1 2.5-1 2.5-2.5-1-2.5-1S11.5 5.5 12 4z" />
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.138 0 4.127-.69 5.808-1.846z" />
  </svg>
);


// --- HELPER COMPONENTS ---
interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-slate-500 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="h-6 w-6" />
      ) : (
        <SunIcon className="h-6 w-6" />
      )}
    </button>
);

const Header: React.FC<{ theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ theme, toggleTheme }) => (
  <header className="flex items-center justify-between py-6">
    <div className="flex items-center justify-center gap-3 text-amber-500 dark:text-amber-300">
      <ChessKnightIcon className="h-10 w-10" />
      <h1 className="text-4xl font-serif tracking-tighter text-slate-800 dark:text-white">ChessMind AI</h1>
    </div>
    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
  </header>
);

interface ImagePreviewProps {
  imageDataUrl: string;
  onClear: () => void;
}
const ImagePreview: React.FC<ImagePreviewProps> = ({ imageDataUrl, onClear }) => (
  <div className="relative mt-4 group">
    <img src={imageDataUrl} alt="Chess board preview" className="rounded-lg w-full max-w-sm mx-auto object-cover border-2 border-slate-300 dark:border-slate-600" />
    <button
      onClick={onClear}
      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-2 focus:ring-amber-400"
      aria-label="Remove image"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

const StrategyDiagram: React.FC<{ diagram: string }> = ({ diagram }) => (
  <div>
    <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Strategic Diagram</h2>
    <div className="mt-2 p-4 bg-slate-200 dark:bg-slate-900 rounded-md overflow-x-auto">
      <pre className="font-mono text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre">
        {diagram}
      </pre>
    </div>
  </div>
);

interface AnalysisDisplayProps {
  analysis: Analysis | null;
}
const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="text-center text-slate-500 dark:text-slate-400 p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg mt-6">
        <ChessKnightIcon className="mx-auto h-12 w-12" />
        <h3 className="mt-2 text-lg font-medium text-slate-700 dark:text-slate-300">Awaiting Analysis</h3>
        <p className="mt-1 text-sm">Your expert move will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white dark:bg-slate-800/50 rounded-lg p-6 animate-fade-in shadow-lg dark:shadow-none">
      <div>
        <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Best Move</h2>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-sans">{analysis.bestMove}</p>
      </div>
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Explanation</h2>
        <p className="text-lg text-slate-600 dark:text-slate-200 mt-1 italic">"{analysis.explanation}"</p>
      </div>
      <div className="h-px bg-slate-200 dark:bg-slate-700 my-5"></div>
      <div>
        <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Detailed Analysis</h2>
        <p className="text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{analysis.details}</p>
      </div>
      {analysis.diagram && (
        <>
          <div className="h-px bg-slate-200 dark:bg-slate-700 my-5"></div>
          <StrategyDiagram diagram={analysis.diagram} />
        </>
      )}
    </div>
  );
};


// --- UTILITY FUNCTIONS ---
const fetchImageFromUrl = async (url: string): Promise<{ base64: string; mimeType: string; objectUrl: string }> => {
  try {
    new URL(url);
  } catch (_) {
    throw new Error("The provided text is not a valid URL.");
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image. Server responded with status: ${response.status}`);
    }
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('The URL does not point to a valid image file (e.g., PNG, JPG).');
    }
     if (blob.size > 4 * 1024 * 1024) { // 4MB limit
        throw new Error("Image from URL cannot exceed 4MB.");
    }
    const objectUrl = URL.createObjectURL(blob);
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
    return { base64, mimeType: blob.type, objectUrl };
  } catch (error) {
    console.error("Error details:", error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error("Could not fetch the image. This might be due to a network issue or CORS restrictions on the image's server.");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while processing the image URL.");
  }
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

const parseAnalysis = (text: string): Analysis | null => {
  if (text.startsWith("Error:")) {
    return null;
  }

  const parts = text.split('---').map(p => p.trim());

  if (parts.length < 2) {
    return {
      bestMove: "Analysis Received",
      explanation: "Could not parse the AI's response format.",
      details: text,
      diagram: null,
    };
  }
  
  const moveAndExplanationPart = parts[0];
  const analysisPart = parts[1];
  const diagramPart = parts.length > 2 ? parts[2] : null;

  const bestMoveMatch = moveAndExplanationPart.match(/^Best Move: (.*)$/m);
  const explanationMatch = moveAndExplanationPart.match(/^Explanation: (.*)$/m);

  if (!bestMoveMatch || !explanationMatch) {
    return {
      bestMove: "Parsing Error",
      explanation: "Could not extract move or explanation.",
      details: text,
      diagram: null
    };
  }

  const bestMove = bestMoveMatch[1].trim();
  const explanation = explanationMatch[1].trim();
  const details = analysisPart.replace(/^Analysis:/, '').trim();
  const diagram = diagramPart ? diagramPart.replace(/^Strategic Diagram:/, '').trim() : null;

  return { bestMove, explanation, details, diagram };
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError("Image size cannot exceed 4MB.");
        return;
      }
      setError(null);
      const base64 = await fileToBase64(file);
      setImageFile({ file, base64 });
      setImageDataUrl(URL.createObjectURL(file));
      setInputMode('upload'); // Switch to upload tab when a file is chosen
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImageDataUrl(null);
    setImageUrl(''); // Clear URL input as well
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please describe the chess scenario.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    let imagePart = null;

    if (inputMode === 'upload' && imageFile) {
      imagePart = {
        inlineData: { mimeType: imageFile.file.type, data: imageFile.base64 },
      };
    } else if (inputMode === 'url' && imageUrl.trim()) {
      try {
        const fetchedImage = await fetchImageFromUrl(imageUrl.trim());
        imagePart = {
          inlineData: { mimeType: fetchedImage.mimeType, data: fetchedImage.base64 },
        };
        // Update UI to show the fetched image.
        setImageDataUrl(fetchedImage.objectUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching the image.';
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
    }

    const result = await analyzeChessPosition(prompt, imagePart);
    
    if (result.startsWith("Error:")) {
      setError(result);
      setAnalysis(null);
    } else {
      const parsed = parseAnalysis(result);
      if (parsed) {
        setAnalysis(parsed);
      } else {
        setError("Failed to parse the analysis from the AI. Displaying raw output.");
        setAnalysis({ bestMove: "Raw Output", explanation: "Could not parse explanation.", details: result, diagram: null });
      }
    }
    
    setIsLoading(false);
  }, [prompt, imageFile, inputMode, imageUrl]);


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gradient-to-br from-slate-900 to-gray-900 text-slate-800 dark:text-white font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="max-w-2xl mx-auto">
        <Header theme={theme} toggleTheme={toggleTheme} />

        <main className="mt-4">
          <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/20">
            <form onSubmit={handleSubmit}>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Describe the chess scenario (e.g., "White to move, Sicilian Defense opening") and optionally upload a board image.
              </p>
              
              <div className="mb-4">
                <label htmlFor="scenario" className="sr-only">Chess Scenario</label>
                <textarea
                  id="scenario"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-lg p-3 text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-amber-500 dark:focus:border-amber-400 transition"
                  placeholder="e.g., Black to move, checkmate in 2..."
                />
              </div>

              <div className="mb-4">
                <div className="flex border-b border-slate-300 dark:border-slate-600">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 ${
                      inputMode === 'upload'
                        ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('url')}
                    className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 ${
                      inputMode === 'url'
                        ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
                <div className="pt-5">
                  {inputMode === 'upload' ? (
                    <label
                      htmlFor="image-upload"
                      className="relative flex justify-center w-full h-32 px-6 border-2 border-slate-400 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 transition-colors group"
                    >
                      <div className="space-y-1 text-center self-center">
                        <UploadIcon className="mx-auto h-10 w-10 text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
                        <div className="flex text-sm text-slate-500 dark:text-slate-400">
                          <p className="pl-1">
                            {imageFile ? 'Replace image' : 'Upload a board image'}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 4MB</p>
                      </div>
                      <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div>
                      <label htmlFor="image-url" className="sr-only">Image URL</label>
                      <input
                        id="image-url"
                        name="image-url"
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-lg p-3 text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-amber-500 dark:focus:border-amber-400 transition"
                        placeholder="https://example.com/chessboard.png"
                      />
                    </div>
                  )}
                </div>
              </div>

              {imageDataUrl && <ImagePreview imageDataUrl={imageDataUrl} onClear={clearImage} />}

              {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-amber-500/50"
              >
                {isLoading ? (
                  <>
                    <Spinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Analyzing...
                  </>
                ) : (
                  'Find Best Move'
                )}
              </button>
            </form>
          </div>

          {(isLoading || analysis || error) && (
            <div className="mt-8">
              {isLoading && (
                <div className="text-center p-8">
                  <Spinner className="mx-auto h-8 w-8 text-amber-500 dark:text-amber-400 animate-spin"/>
                  <p className="mt-4 text-slate-700 dark:text-slate-300">ChessMind is thinking...</p>
                </div>
              )}
              {!isLoading && analysis && <AnalysisDisplay analysis={analysis} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
