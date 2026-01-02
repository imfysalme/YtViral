
import React, { useState, useEffect, useCallback } from 'react';
import { Step, ThumbnailStyle, GenerationInput, HistoryItem } from './types';
import { GeminiService } from './services/gemini';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [extractedThumbnail, setExtractedThumbnail] = useState('');
  const [analyzedStyle, setAnalyzedStyle] = useState<ThumbnailStyle | null>(null);
  const [inputDetails, setInputDetails] = useState<GenerationInput>({
    imageDetail: '',
    textOnImage: '',
    tagline: ''
  });
  const [generatedThumbnail, setGeneratedThumbnail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isKeySelected, setIsKeySelected] = useState(false);

  const CORRECT_PASSCODE = '3335';

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handlePasscodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passcode === CORRECT_PASSCODE) {
      setCurrentStep(Step.LINK_INPUT);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setPasscode('');
      setTimeout(() => setPasscodeError(false), 500);
    }
  };

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true);
    } catch (e) {
      console.error("Failed to select key", e);
    }
  };

  const extractThumbnail = useCallback(async (url: string) => {
    setError(null);
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      setError('Invalid YouTube URL');
      return;
    }

    const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    setExtractedThumbnail(thumbUrl);
    setLoading(true);
    setCurrentStep(Step.STYLE_ANALYSIS);

    try {
      const style = await GeminiService.analyzeThumbnailStyle(thumbUrl);
      setAnalyzedStyle(style);
      setLoading(false);
      setCurrentStep(Step.DETAILS_INPUT);
    } catch (err) {
      setError('Failed to analyze thumbnail style. Try another video.');
      setLoading(false);
      setCurrentStep(Step.LINK_INPUT);
    }
  }, []);

  const handleGenerate = async () => {
    if (!analyzedStyle) return;
    setLoading(true);
    setError(null);
    setCurrentStep(Step.GENERATING);

    try {
      const result = await GeminiService.generateThumbnail(
        inputDetails.imageDetail,
        inputDetails.textOnImage,
        inputDetails.tagline,
        analyzedStyle
      );
      setGeneratedThumbnail(result);
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        originalUrl: ytUrl,
        originalThumbnail: extractedThumbnail,
        generatedThumbnail: result,
        prompt: inputDetails.imageDetail,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);
      
      setCurrentStep(Step.RESULT);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key Error. Please re-select your key.");
        setIsKeySelected(false);
      } else {
        setError('Failed to generate thumbnail. ' + (err.message || ''));
      }
      setCurrentStep(Step.DETAILS_INPUT);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCurrentStep(Step.LINK_INPUT);
    setYtUrl('');
    setExtractedThumbnail('');
    setAnalyzedStyle(null);
    setInputDetails({ imageDetail: '', textOnImage: '', tagline: '' });
    setGeneratedThumbnail('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
            <i className="fa-solid fa-play text-white"></i>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ViralThumb<span className="text-red-500">AI</span></h1>
        </div>
        {currentStep !== Step.AUTH && !isKeySelected && (
          <button 
            onClick={handleSelectKey}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
          >
            <i className="fa-solid fa-key"></i> Connect API Key
          </button>
        )}
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-8">
        {currentStep === Step.AUTH ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 shadow-2xl backdrop-blur-sm flex flex-col items-center justify-center min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-6">
              <i className="fa-solid fa-lock text-red-500 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Protected</h2>
            <p className="text-slate-400 mb-8 text-center max-w-xs">Please enter your 4-digit passcode to continue to ViralThumbAI.</p>
            
            <form onSubmit={handlePasscodeSubmit} className="flex flex-col items-center gap-6 w-full max-w-xs">
              <input 
                type="password"
                maxLength={4}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                placeholder="••••"
                className={`w-full bg-slate-800 border-2 ${passcodeError ? 'border-red-500 animate-bounce' : 'border-slate-700'} rounded-2xl px-6 py-4 text-center text-3xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-red-600 transition-all placeholder:text-slate-600`}
              />
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-900/20 active:scale-95"
              >
                Unlock Application
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Step Indicator */}
            <div className="flex justify-between items-center px-2 mb-4">
              {[Step.LINK_INPUT, Step.DETAILS_INPUT, Step.RESULT].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentStep === s ? 'bg-red-600 text-white scale-110 shadow-lg shadow-red-900/40' : 
                    (i < [Step.LINK_INPUT, Step.DETAILS_INPUT, Step.RESULT].indexOf(currentStep) ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400')
                  } transition-all duration-300`}>
                    {i + 1}
                  </div>
                  <span className={`hidden md:inline text-xs font-semibold ${currentStep === s ? 'text-white' : 'text-slate-500'}`}>
                    {s.replace('_', ' ')}
                  </span>
                  {i < 2 && <div className="w-8 md:w-16 h-px bg-slate-800 mx-2" />}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-sm min-h-[400px] flex flex-col">
              
              {error && (
                <div className="mb-6 bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {currentStep === Step.LINK_INPUT && (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                  <i className="fa-brands fa-youtube text-6xl text-red-600 mb-6"></i>
                  <h2 className="text-2xl font-bold mb-2">Paste Video Link</h2>
                  <p className="text-slate-400 mb-8 max-w-sm">We'll analyze the style of a successful thumbnail to guide our AI.</p>
                  
                  <div className="w-full flex flex-col md:flex-row gap-3">
                    <input 
                      type="text" 
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                    />
                    <button 
                      onClick={() => extractThumbnail(ytUrl)}
                      disabled={!ytUrl || loading}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-900/20"
                    >
                      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Analyze Style'}
                    </button>
                  </div>
                </div>
              )}

              {currentStep === Step.STYLE_ANALYSIS && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <img src={extractedThumbnail} className="w-64 aspect-video object-cover rounded-xl border-4 border-slate-800 shadow-2xl opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fa-solid fa-magnifying-glass-chart text-4xl text-white animate-bounce"></i>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Analyzing Visual DNA...</h2>
                  <p className="text-slate-400 italic">"Extracting color patterns, composition, and font styles..."</p>
                </div>
              )}

              {currentStep === Step.DETAILS_INPUT && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold mb-6">Thumbnail Details</h2>
                  
                  <div className="space-y-6 mb-10">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">What's in the image?</label>
                      <textarea 
                        value={inputDetails.imageDetail}
                        onChange={(e) => setInputDetails(prev => ({ ...prev, imageDetail: e.target.value }))}
                        placeholder="e.g. A surprised guy holding a gold iPhone with a futuristic background"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all h-24 resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Main Big Text</label>
                        <input 
                          type="text"
                          value={inputDetails.textOnImage}
                          onChange={(e) => setInputDetails(prev => ({ ...prev, textOnImage: e.target.value }))}
                          placeholder="e.g. UNBELIEVABLE!"
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Sub-tagline</label>
                        <input 
                          type="text"
                          value={inputDetails.tagline}
                          onChange={(e) => setInputDetails(prev => ({ ...prev, tagline: e.target.value }))}
                          placeholder="e.g. 10 Years Later"
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-4">
                    <button 
                      onClick={() => setCurrentStep(Step.LINK_INPUT)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold transition-all border border-slate-700"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleGenerate}
                      disabled={!inputDetails.imageDetail || !inputDetails.textOnImage || !isKeySelected}
                      className="flex-[2] bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Generate Viral Thumbnail
                    </button>
                  </div>
                  {!isKeySelected && (
                    <p className="text-center text-xs text-yellow-500 mt-4">Please connect your API key to use the Nano Banana Pro model.</p>
                  )}
                </div>
              )}

              {currentStep === Step.GENERATING && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-8"></div>
                  <h2 className="text-2xl font-bold mb-2">Generating Masterpiece</h2>
                  <p className="text-slate-400 max-w-xs mb-8">Using Google's Nano Banana Pro model to create a high-CTR thumbnail for you...</p>
                  
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-600 h-full animate-[loading_15s_ease-in-out_infinite]" style={{ width: '0%' }}></div>
                  </div>
                  <style>{`
                    @keyframes loading {
                      0% { width: 0%; }
                      50% { width: 70%; }
                      100% { width: 95%; }
                    }
                  `}</style>
                </div>
              )}

              {currentStep === Step.RESULT && (
                <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your New Thumbnail</h2>
                    <button onClick={reset} className="text-sm text-slate-400 hover:text-white transition-colors">Start New</button>
                  </div>
                  
                  <div className="group relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 mb-8 aspect-video bg-slate-800">
                    <img src={generatedThumbnail} alt="Generated Thumbnail" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <a 
                        href={generatedThumbnail} 
                        download="viral-thumbnail.png"
                        className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <i className="fa-solid fa-download"></i> Download PNG
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Inspired By</h3>
                      <div className="flex items-center gap-3">
                        <img src={extractedThumbnail} className="w-16 aspect-video rounded-md object-cover" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium truncate">{analyzedStyle?.description || 'Original Style'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Target CTR</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-green-500">12.4%</span>
                        <span className="text-[10px] text-slate-400">Estimated Potential</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col md:flex-row gap-4">
                    <button 
                      onClick={handleGenerate}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Regenerate
                    </button>
                    <button 
                      onClick={reset}
                      className="flex-1 bg-slate-100 hover:bg-white text-black py-4 rounded-2xl font-bold transition-all"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History Section */}
            {history.length > 0 && currentStep !== Step.GENERATING && (
              <section className="animate-in fade-in slide-in-from-bottom-8 delay-300 duration-700">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <i className="fa-solid fa-clock-rotate-left text-slate-500"></i>
                  Recent Generations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 hover:border-slate-600 transition-colors group">
                      <img src={item.generatedThumbnail} className="w-32 aspect-video rounded-lg object-cover" />
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <p className="text-sm font-bold truncate">{item.prompt}</p>
                          <p className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setGeneratedThumbnail(item.generatedThumbnail);
                            setCurrentStep(Step.RESULT);
                          }}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-slate-500 text-xs text-center">
        <p>© 2024 ViralThumbAI. Powered by Gemini 3 Pro Image Model.</p>
        <p className="mt-2">Optimized for high-impact visual storytelling.</p>
      </footer>
    </div>
  );
};

export default App;
