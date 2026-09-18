import React, { useState } from 'react';
import type { DocumentCategory, DocumentVerificationResult } from '../types';
import { runOcr, runMrzLineOcr } from '../services/ocrService';
import { verifyPassportText, verifyGenericDocument } from '../services/documentVerificationService';
import { encodeMrzLine1, encodeMrzLine2 } from '../services/mrzService';
import { isPdf, pdfFirstPageToImageBlob } from '../services/pdfService';

interface DocumentVerificationPanelProps {
  requirementId: string;
  requirementText: string;
  category: DocumentCategory;
  existingResult?: DocumentVerificationResult;
  onVerified: (requirementId: string, result: DocumentVerificationResult) => void;
}

type Stage = 'idle' | 'ocr_running' | 'needs_correction' | 'manual_entry' | 'verifying' | 'result';

const OCR_CONFIDENCE_THRESHOLD = 0.6;

const STATUS_STYLES: Record<DocumentVerificationResult['status'], { pill: string; label: string }> = {
  verified: { pill: 'bg-emerald-100 text-emerald-700', label: 'Verified' },
  failed: { pill: 'bg-rose-100 text-rose-700', label: 'Failed' },
  expired: { pill: 'bg-amber-100 text-amber-700', label: 'Expired' },
  needs_review: { pill: 'bg-slate-100 text-slate-600', label: 'Needs review' },
};

export const statusDotClass = (status?: DocumentVerificationResult['status']) => {
  switch (status) {
    case 'verified': return 'bg-emerald-500';
    case 'failed': return 'bg-rose-500';
    case 'expired': return 'bg-amber-500';
    case 'needs_review': return 'bg-slate-400';
    default: return 'bg-slate-200';
  }
};

const runVerification = async (
  category: DocumentCategory,
  text: string,
  requirementText: string,
  inputMode: DocumentVerificationResult['inputMode'],
  ocrConfidence?: number
): Promise<DocumentVerificationResult> => {
  const result =
    category === 'passport'
      ? verifyPassportText(text, inputMode)
      : await verifyGenericDocument(text, category, requirementText, inputMode);
  return ocrConfidence != null ? { ...result, ocrConfidence } : result;
};

const DocumentVerificationPanel: React.FC<DocumentVerificationPanelProps> = ({
  requirementId,
  requirementText,
  category,
  existingResult,
  onVerified,
}) => {
  const [stage, setStage] = useState<Stage>(existingResult ? 'result' : 'idle');
  const [draftText, setDraftText] = useState('');
  const [mrzLine1, setMrzLine1] = useState('');
  const [mrzLine2, setMrzLine2] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentVerificationResult | undefined>(existingResult);
  const [showFieldCorrection, setShowFieldCorrection] = useState(false);
  const [correctedFields, setCorrectedFields] = useState<Record<string, string>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setStage('ocr_running');
    try {
      // OCR only understands images — a PDF is rendered to an image (its
      // first page only) entirely client-side before anything else touches
      // it, so the rest of this flow never needs to know the input was a PDF.
      const imageFile = isPdf(file) ? await pdfFirstPageToImageBlob(file) : file;

      if (category === 'passport') {
        // Run a general-print pass and an OCR-B pass (tuned for the MRZ's
        // font) in parallel. Overall OCR confidence isn't a reliable signal
        // for picking between them — the OCR-B model reads garbage on the
        // non-MRZ regions (photo, printed name fields), which drags its
        // average confidence down even when the MRZ line itself is read
        // perfectly. Instead, rank by whether each pass actually produced a
        // checksum-computable MRZ result — that's a much stronger,
        // domain-specific correctness signal than raw OCR confidence.
        const [ocrbPass, engPass, lineOcrPass] = await Promise.all([
          runOcr(imageFile, 'ocrb'),
          runOcr(imageFile, 'eng'),
          // Heavier (loads OpenCV.js) but meaningfully more accurate: isolates
          // and OCRs each MRZ line individually rather than the whole image.
          // Caught separately so a failure here (e.g. OpenCV.js didn't load)
          // doesn't take down the two whole-image candidates above.
          runMrzLineOcr(imageFile).catch(() => null),
        ]);
        const rank = (r: DocumentVerificationResult) =>
          r.status === 'verified' || r.status === 'expired' ? 2 : r.status === 'failed' ? 1 : 0;

        const candidates = [
          { verification: verifyPassportText(ocrbPass.text, 'ocr'), ocrConfidence: ocrbPass.confidence },
          { verification: verifyPassportText(engPass.text, 'ocr'), ocrConfidence: engPass.confidence },
          ...(lineOcrPass
            ? [{
                verification: verifyPassportText(`${lineOcrPass.line1}\n${lineOcrPass.line2}`, 'ocr'),
                ocrConfidence: lineOcrPass.confidence,
              }]
            : []),
        ];
        const best = candidates.reduce((a, b) => (rank(b.verification) > rank(a.verification) ? b : a));

        if (rank(best.verification) > 0) {
          setOcrConfidence(best.ocrConfidence);
          const verified = { ...best.verification, ocrConfidence: best.ocrConfidence };
          setResult(verified);
          onVerified(requirementId, verified);
          setStage('result');
          return;
        }

        // Neither pass found MRZ-shaped lines at all. Pre-fill correction with
        // the eng pass's text — OCR-B output on non-MRZ regions is mostly
        // unreadable noise and wouldn't help a human correct it.
        setOcrConfidence(engPass.confidence);
        setDraftText(engPass.text);
        setStage('needs_correction');
        return;
      }

      const { text, confidence } = await runOcr(imageFile, 'eng');
      setOcrConfidence(confidence);

      if (confidence < OCR_CONFIDENCE_THRESHOLD) {
        setDraftText(text);
        setStage('needs_correction');
        return;
      }

      setStage('verifying');
      const verified = await runVerification(category, text, requirementText, 'ocr', confidence);
      setResult(verified);
      onVerified(requirementId, verified);
      setStage('result');
    } catch {
      setError(
        isPdf(file)
          ? 'Reading this PDF failed. Try a clearer scan, or enter the details manually.'
          : 'Reading this image failed. Try a clearer photo, or enter the details manually.'
      );
      setStage('idle');
    }
  };

  const submitDraftText = async () => {
    setStage('verifying');
    const inputMode = ocrConfidence != null ? 'ocr_corrected' : 'manual_entry';
    const verified = await runVerification(category, draftText, requirementText, inputMode, ocrConfidence);
    setResult(verified);
    onVerified(requirementId, verified);
    setStage('result');
  };

  const submitMrz = async () => {
    setStage('verifying');
    const combined = `${mrzLine1.padEnd(44, '<').slice(0, 44)}\n${mrzLine2.padEnd(44, '<').slice(0, 44)}`;
    const verified = await runVerification('passport', combined, requirementText, 'manual_entry');
    setResult(verified);
    onVerified(requirementId, verified);
    setStage('result');
  };

  const reset = () => {
    setStage('idle');
    setDraftText('');
    setMrzLine1('');
    setMrzLine2('');
    setOcrConfidence(undefined);
    setError(null);
    setShowFieldCorrection(false);
    setCorrectedFields({});
  };

  const openFieldCorrection = () => {
    setCorrectedFields(result?.fields ?? {});
    setShowFieldCorrection(true);
  };

  const submitFieldCorrection = async () => {
    setStage('verifying');
    const line1 = encodeMrzLine1({
      issuingCountry: correctedFields.issuingCountry ?? '',
      surname: correctedFields.surname ?? '',
      givenNames: correctedFields.givenNames ?? '',
    });
    const line2 = encodeMrzLine2({
      passportNumber: correctedFields.passportNumber ?? '',
      nationality: correctedFields.nationality ?? '',
      dob: correctedFields.dob ?? '',
      sex: correctedFields.sex ?? '',
      expiry: correctedFields.expiry ?? '',
    });
    const verified = await runVerification('passport', `${line1}\n${line2}`, requirementText, 'ocr_corrected');
    setResult(verified);
    onVerified(requirementId, verified);
    setShowFieldCorrection(false);
    setStage('result');
  };

  const fieldCorrectionValid =
    /^\d{6}$/.test(correctedFields.dob ?? '') &&
    /^\d{6}$/.test(correctedFields.expiry ?? '') &&
    (correctedFields.passportNumber ?? '').trim().length > 0 &&
    (correctedFields.passportNumber ?? '').length <= 9 &&
    /^[A-Za-z]{3}$/.test(correctedFields.nationality ?? '') &&
    /^[A-Za-z]{3}$/.test(correctedFields.issuingCountry ?? '');

  if (stage === 'idle') {
    return (
      <div className="flex items-center gap-3 mt-1" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs font-bold text-[#005fb0] cursor-pointer hover:underline">
          <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={handleFileChange} />
          Upload &amp; verify
        </label>
        <button
          type="button"
          onClick={() => setStage(category === 'passport' ? 'manual_entry' : 'needs_correction')}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 hover:underline"
        >
          Enter details manually
        </button>
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </div>
    );
  }

  if (stage === 'ocr_running' || stage === 'verifying') {
    return (
      <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400" onClick={(e) => e.stopPropagation()}>
        <i className="fa-solid fa-circle-notch fa-spin"></i>
        {stage === 'ocr_running' ? 'Reading document locally…' : 'Checking locally…'}
      </div>
    );
  }

  if (stage === 'needs_correction' || (stage === 'manual_entry' && category !== 'passport')) {
    return (
      <div className="mt-2 p-4 rounded-2xl border border-slate-200 bg-slate-50" onClick={(e) => e.stopPropagation()}>
        {ocrConfidence != null && (
          <p className="text-xs font-bold text-amber-600 mb-2">
            This didn't scan cleanly — please review and correct the text below, or re-upload a clearer photo.
          </p>
        )}
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={4}
          placeholder="Paste or type the key details from this document"
          className="w-full text-sm p-3 rounded-xl border border-slate-200 font-mono"
        />
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={submitDraftText}
            disabled={!draftText.trim()}
            className="px-4 py-2 rounded-xl bg-[#005fb0] text-white text-xs font-bold disabled:opacity-40"
          >
            Verify this text
          </button>
          <button type="button" onClick={reset} className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold">
            {ocrConfidence != null ? 'Re-upload' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'manual_entry' && category === 'passport') {
    return (
      <div className="mt-2 p-4 rounded-2xl border border-slate-200 bg-slate-50" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold text-slate-500 mb-2">
          Paste or type the two MRZ lines from the bottom of the passport photo page (44 characters each).
        </p>
        <input
          value={mrzLine1}
          onChange={(e) => setMrzLine1(e.target.value.toUpperCase())}
          maxLength={44}
          placeholder="P<COUNTRYSURNAME<<GIVENNAMES<<<<<<<<<<<<<<<"
          className="w-full text-xs p-2 mb-2 rounded-lg border border-slate-200 font-mono tracking-wider"
        />
        <input
          value={mrzLine2}
          onChange={(e) => setMrzLine2(e.target.value.toUpperCase())}
          maxLength={44}
          placeholder="PASSPORTNO0COUNTRYYYMMDDSEXYYMMDD<<<<<<<<<<0"
          className="w-full text-xs p-2 mb-2 rounded-lg border border-slate-200 font-mono tracking-wider"
        />
        <p className="text-[10px] text-slate-400 mb-2">{mrzLine1.length}/44 · {mrzLine2.length}/44 characters</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={submitMrz}
            disabled={mrzLine1.length !== 44 || mrzLine2.length !== 44}
            className="px-4 py-2 rounded-xl bg-[#005fb0] text-white text-xs font-bold disabled:opacity-40"
          >
            Verify this text
          </button>
          <button type="button" onClick={reset} className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'result' && result) {
    const style = STATUS_STYLES[result.status];
    return (
      <div className="mt-2 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.pill}`}>{style.label}</span>
          <span className="text-[10px] text-slate-400">{new Date(result.checkedAt).toLocaleString()}</span>
        </div>
        <p className="text-sm text-slate-600 mt-2">{result.summary}</p>
        {result.concerns && result.concerns.length > 0 && (
          <ul className="mt-2 text-xs text-slate-500 list-disc list-inside">
            {result.concerns.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}

        {result.method === 'mrz' && result.fields && result.status !== 'verified' && (
          <div className="mt-3">
            {!showFieldCorrection ? (
              <button
                type="button"
                onClick={openFieldCorrection}
                className="text-xs font-bold text-[#005fb0] hover:underline"
              >
                Values look wrong? Correct them
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500 mb-3">
                  Enter the values exactly as printed in your passport — we'll recompute the checksums from what you enter.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['surname', 'Surname'],
                    ['givenNames', 'Given names'],
                    ['passportNumber', 'Passport number'],
                    ['issuingCountry', 'Issuing country (3 letters)'],
                    ['nationality', 'Nationality (3 letters)'],
                    ['dob', 'Date of birth (YYMMDD)'],
                    ['expiry', 'Expiry (YYMMDD)'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {label}
                      <input
                        value={correctedFields[key] ?? ''}
                        onChange={(e) => setCorrectedFields((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 font-mono normal-case font-normal"
                      />
                    </label>
                  ))}
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Sex
                    <select
                      value={correctedFields.sex ?? ''}
                      onChange={(e) => setCorrectedFields((prev) => ({ ...prev, sex: e.target.value }))}
                      className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 font-normal normal-case"
                    >
                      <option value="">—</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="X">X</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={submitFieldCorrection}
                    disabled={!fieldCorrectionValid}
                    className="px-4 py-2 rounded-xl bg-[#005fb0] text-white text-xs font-bold disabled:opacity-40"
                  >
                    Re-check with these values
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFieldCorrection(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={reset} className="mt-3 text-xs font-bold text-[#005fb0] hover:underline">
          Verify a different document
        </button>
      </div>
    );
  }

  return null;
};

export default DocumentVerificationPanel;
