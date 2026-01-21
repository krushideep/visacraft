
import React, { useState, useRef } from 'react';
import { VisaChecklist } from '../types';

interface ChecklistResultProps {
  checklist: VisaChecklist;
  onReset: () => void;
}

const ChecklistResult: React.FC<ChecklistResultProps> = ({ checklist, onReset }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const checklistRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    const h2p = (window as any).html2pdf;
    if (!h2p) { window.print(); return; }

    setIsExporting(true);

    try {
      // 1. STAGE TO LOCALSTORAGE (Intermediate file simulation)
      const TEMP_KEY = 'visacraft_temp_export';
      localStorage.setItem(TEMP_KEY, JSON.stringify(checklist));

      // 2. RETRIEVE FROM STORAGE
      const storedData = localStorage.getItem(TEMP_KEY);
      if (!storedData) throw new Error('Data staging failed');
      const data: VisaChecklist = JSON.parse(storedData);

      // 3. GENERATE FORMATTED TEMPLATE
      const template = `
        <div style="font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; color: #1e293b; max-width: 850px; margin: 0 auto; background: white;">
          <!-- Formal Header -->
          <div style="background: #f8fafc; padding: 30px 35px 20px; border-bottom: 3px solid #005fb0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
              <div>
                <h1 style="margin: 0; font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -1px; text-transform: uppercase;">Visa Roadmap</h1>
                <p style="margin: 4px 0 0; font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 11px; font-weight: 700; color: #005fb0; text-transform: uppercase; letter-spacing: 1.5px;">Global Compliance Blueprint</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Generated on</div>
                <div style="font-size: 11px; font-weight: 700; color: #1e293b;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div>
                <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Passport Issuing Country</div>
                <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 13px; font-weight: 700; color: #0f172a;">${data.countryFrom}</div>
              </div>
              <div>
                <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Target Destination</div>
                <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 13px; font-weight: 700; color: #0f172a;">${data.countryTo}</div>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px 0 0 6px;">
                  <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Processing Window</div>
                  <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 12px; font-weight: 700; color: #1e293b;">${data.estimatedProcessingTime}</div>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Official Fees</div>
                  <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 12px; font-weight: 700; color: #1e293b;">${data.expectedFee.split('(')[0].trim()}</div>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 0 6px 6px 0;">
                  <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Visa Classification</div>
                  <div style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 12px; font-weight: 700; color: #1e293b;">${data.visaCategory}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Main Content -->
          <div style="padding: 25px 35px;">
            ${(data.checklistItems || []).map((item, idx) => `
              <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <div style="width: 16px; height: 16px; border: 2px solid #005fb0; border-radius: 4px; margin-right: 12px; flex-shrink: 0;"></div>
                  <h3 style="margin: 0; font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                    ${item.title.replace(/^\d+\.\s*/, '')}
                  </h3>
                </div>
                
                <div style="margin-left: 28px; border-left: 2px solid #f1f5f9; padding-left: 18px;">
                  ${item.requirements.map(req => `
                    <div style="margin-bottom: 6px; display: flex; align-items: flex-start;">
                      <div style="width: 4px; height: 4px; background: #005fb0; border-radius: 50%; margin-top: 6px; margin-right: 10px; flex-shrink: 0;"></div>
                      <span style="font-size: 11px; font-weight: 450; color: #334155; line-height: 1.5; letter-spacing: 0.1px;">${req}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Professional Footer -->
          <footer style="margin-top: 15px; padding: 20px 35px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            ${(data.officialLinks?.length > 0 || data.applicationForms?.length > 0) ? `
              <div style="margin-bottom: 15px;">
                <h4 style="font-family: 'Helvetica Neue', 'Helvetica', sans-serif; font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Official Resources</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  ${[...(data.officialLinks || []), ...(data.applicationForms || [])].map(resource => `
                    <div style="padding: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 6px;">
                      <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${resource.title}</div>
                      <div style="font-size: 8px; color: #005fb0; text-decoration: none; margin-top: 2px; word-break: break-all;">${resource.url}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <p style="font-size: 9px; font-weight: 500; color: #64748b; margin: 0 0 6px; max-width: 450px; line-height: 1.5;">
                  <strong>Disclaimer:</strong> This blueprint is for planning purposes only. Visa regulations are subject to frequent policy shifts. Always confirm documentation with official diplomatic channels.
                </p>
                <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Document ID: VC-${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
              </div>
            </div>
          </footer>
        </div>
      `;

      // 4. GENERATE AND SAVE PDF
      const opt = {
        margin: [10, 10],
        filename: `Visa_Checklist_${data.countryTo.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await h2p().from(template).set(opt).save();

      // 5. CLEANUP TEMP FILE
      localStorage.removeItem(TEMP_KEY);

    } catch (err) {
      console.error('Data-driven PDF export failed:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };


  const toggleItem = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SummaryCard = ({ label, value, colorClass, borderClass, textClass }: { label: string, value: string, colorClass: string, borderClass: string, textClass: string }) => (
    <div className={`flex-1 min-w-[160px] p-6 rounded-3xl border ${borderClass} ${colorClass} shadow-sm animate-fade-in`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${textClass} opacity-60`}>
        {label}
      </p>
      <p className="text-xl font-black text-slate-800 leading-tight">
        {value}
      </p>
    </div>
  );

  const Section = ({ title, items, icon, colorClass }: { title: string, items: string[], icon: string, colorClass: string }) => (
    <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-lg`}>
          <i className={`fa-solid ${icon} text-lg`}></i>
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {items.map((item, idx) => {
          const itemKey = `${title}-${idx}`;
          const isChecked = checkedItems[itemKey];
          return (
            <div
              key={itemKey}
              onClick={() => toggleItem(itemKey)}
              className={`flex items-start gap-4 p-5 rounded-[1.25rem] border transition-all cursor-pointer ${isChecked
                ? 'bg-slate-50 border-slate-100 opacity-60'
                : 'bg-white border-slate-100 hover:border-[#005fb0] hover:shadow-md'
                }`}
            >
              <div className={`mt-1 w-6 h-6 rounded-lg flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isChecked
                ? 'bg-[#005fb0] border-[#005fb0] text-white'
                : 'bg-white border-slate-200 text-transparent'
                }`}>
                <i className="fa-solid fa-check text-[10px]"></i>
              </div>
              <p className={`text-base font-medium leading-relaxed ${isChecked ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                {item}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <i className="fa-solid fa-arrow-left"></i>
          Back to Navigator
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold shadow-xl transition-all ${isExporting
              ? 'bg-slate-400 cursor-not-allowed text-white'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 hover:-translate-y-0.5'
              }`}
          >
            {isExporting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Staging Document...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-pdf"></i>
                Download PDF Checklist
              </>
            )}
          </button>
        </div>
      </div>

      <div
        ref={checklistRef}
        className="checklist-container bg-white border border-slate-100 shadow-2xl rounded-[2rem] mb-12 overflow-hidden animate-fade-in"
      >
        <div className="bg-gradient-to-br from-[#005fb0] to-[#001b3e] p-10 md:p-14 text-white">
          <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest opacity-60 mb-4">
            <span>{checklist.countryFrom}</span>
            <i className="fa-solid fa-arrow-right-long text-[10px]"></i>
            <span>{checklist.countryTo}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-10 tracking-tight leading-tight">
            {checklist.visaType} <span className="opacity-50">Visa Blueprint</span>
          </h2>

          {/* Action Cards / Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Processing Window</div>
              <div className="text-xl font-black">{checklist.estimatedProcessingTime}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Official Fees</div>
              <div className="text-xl font-black">{checklist.expectedFee.split('(')[0].trim()}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Visa Classification</div>
              <div className="text-xl font-black">{checklist.visaCategory}</div>
            </div>
          </div>
        </div>

        <div className="p-10 md:p-14">
          <div className="grid grid-cols-1 gap-12">
            {checklist.checklistItems?.map((item, sectionIdx) => {
              const sectionKey = `section-${sectionIdx}`;
              const isSectionChecked = checkedItems[sectionKey];

              return (
                <div key={sectionIdx} className="animate-fade-in">
                  <div
                    onClick={() => toggleItem(sectionKey)}
                    className="flex items-center gap-4 mb-6 cursor-pointer group"
                  >
                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${isSectionChecked
                      ? 'bg-[#005fb0] border-[#005fb0] text-white'
                      : 'border-slate-200 text-transparent group-hover:border-[#005fb0]'}`}
                    >
                      <i className="fa-solid fa-check text-sm"></i>
                    </div>
                    <h3 className={`text-2xl font-black tracking-tight transition-all ${isSectionChecked ? 'text-slate-400 line-through opacity-60' : 'text-slate-900'}`}>
                      {item.title.replace(/^\d+\.\s*/, '')}
                    </h3>
                  </div>
                  <div className="ml-14 space-y-3">
                    {item.requirements.map((req, reqIdx) => {
                      const itemKey = `section-${sectionIdx}-req-${reqIdx}`;
                      const isChecked = checkedItems[itemKey];
                      return (
                        <div
                          key={itemKey}
                          onClick={() => toggleItem(itemKey)}
                          className={`flex items-start gap-3 py-1 cursor-pointer group transition-all`}
                        >
                          <div className="mt-1 text-[#005fb0] opacity-40 group-hover:opacity-100 transition-opacity">
                            •
                          </div>
                          <p className={`text-lg font-medium leading-relaxed ${isChecked ? 'text-slate-400 line-through opacity-60' : 'text-slate-700'}`}>
                            {req}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {(checklist.officialLinks?.length > 0 || checklist.applicationForms?.length > 0) && (
            <div className="mt-16 pt-12 border-t border-slate-100 no-print">
              <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Official Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {checklist.officialLinks?.map((link, idx) => (
                  <a
                    key={`link-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-6 bg-slate-50 rounded-2xl hover:bg-white hover:border-[#005fb0] border border-transparent transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900 group-hover:text-[#005fb0] transition-colors">{link.title}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-slate-300 group-hover:text-[#005fb0] text-sm"></i>
                    </div>
                    <span className="text-xs text-slate-400 truncate font-mono uppercase tracking-wider">Official Portal</span>
                  </a>
                ))}

                {checklist.applicationForms?.map((form, idx) => (
                  <a
                    key={`form-${idx}`}
                    href={form.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-6 bg-blue-50/30 rounded-2xl hover:bg-white hover:border-[#005fb0] border border-transparent transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900 group-hover:text-[#005fb0] transition-colors">{form.title}</span>
                      <i className="fa-solid fa-file-pdf text-blue-400 group-hover:text-[#005fb0] text-sm"></i>
                    </div>
                    <span className="text-xs text-blue-400 truncate font-mono uppercase tracking-wider">Application Form</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 p-8 text-center">
          <p className="text-slate-400 text-sm italic mb-2">
            Official requirements are subject to change. Always verify with the consulate.
          </p>
        </div>
      </div>
    </div>
  );
};


export default ChecklistResult;
