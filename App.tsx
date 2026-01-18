
import React, { useState } from 'react';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import { generateVisaChecklist } from './services/aiService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VisaChecklist | null>(null);

  // Form State
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [visaType, setVisaType] = useState<VisaType>(VisaType.TOURIST);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCountry || !toCountry) {
      setError("Please select both origin and destination countries.");
      return;
    }

    if (fromCountry === toCountry) {
      setError("Origin and destination cannot be the same.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateVisaChecklist(fromCountry, toCountry, visaType);
      setChecklist(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Visa checklist error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setChecklist(null);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 w-full">
        {!checklist ? (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-50">
              <div className="mb-10 text-center">
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Plan Your Journey</h2>
                <p className="text-slate-500 font-medium italic">Instant AI-generated visa requirements for any destination.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* From */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-[#005fb0] flex items-center gap-2">
                      <i className="fa-solid fa-earth-americas"></i>
                      Your Citizenship
                    </label>
                    <div className="relative group">
                      <select
                        value={fromCountry}
                        onChange={(e) => setFromCountry(e.target.value)}
                        className="w-full h-16 pl-6 pr-12 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-[#005fb0] transition-all appearance-none outline-none font-semibold text-slate-800 text-lg shadow-sm"
                      >
                        <option value="">Select country...</option>
                        {COUNTRIES.map(c => (
                          <option key={`from-${c.code}`} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-[#005fb0]"></i>
                    </div>
                  </div>

                  {/* To */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                      <i className="fa-solid fa-location-dot"></i>
                      Target Destination
                    </label>
                    <div className="relative group">
                      <select
                        value={toCountry}
                        onChange={(e) => setToCountry(e.target.value)}
                        className="w-full h-16 pl-6 pr-12 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-rose-500 transition-all appearance-none outline-none font-semibold text-slate-800 text-lg shadow-sm"
                      >
                        <option value="">Select country...</option>
                        {COUNTRIES.map(c => (
                          <option key={`to-${c.code}`} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-rose-500"></i>
                    </div>
                  </div>
                </div>

                {/* Visa Type */}
                <div className="space-y-5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <i className="fa-solid fa-briefcase"></i>
                    Purpose of Travel
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {Object.values(VisaType).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setVisaType(type)}
                        className={`py-4 px-2 rounded-2xl border-2 text-[10px] uppercase tracking-tighter font-black transition-all ${visaType === type
                          ? 'bg-[#005fb0] border-[#005fb0] text-white shadow-lg shadow-blue-100'
                          : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                    <i className="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-20 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-4 bg-slate-900 text-white hover:bg-black"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      Building Roadmap...
                    </>
                  ) : (
                    <>
                      <span>Secure Checklist</span>
                      <i className="fa-solid fa-arrow-right-long text-blue-400"></i>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <ChecklistResult checklist={checklist} onReset={handleReset} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-10 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} VisaCraft. Helping the world move, one stamp at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
