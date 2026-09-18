export interface VisaChecklist {
  countryFrom: string;
  countryTo: string;
  visaType: string;
  estimatedProcessingTime: string;
  expectedFee: string;
  visaCategory: string;
  generalRequirements: string[];
  specificRequirements: string[];
  financialRequirements: string[];
  additionalTips: string[];
  officialLinks: { title: string; url: string }[];
  applicationForms: { title: string; url: string }[];
  checklistItems: ChecklistItem[];
  liveVerification?: {
    status: 'verified' | 'needs_review' | 'unavailable';
    checkedAt: string;
    sourceEvidence: { title: string; url: string }[];
    jevCategory?: string;
    jevConfidence?: number;
    jevNeedsReview?: boolean;
    jevProcessingTime?: string;
    jevFee?: string;
    reason?: string;
  };
}

export interface ChecklistItem {
  title: string;
  requirements: string[];
}

export type DocumentCategory =
  | 'passport'
  | 'financial'
  | 'accommodation'
  | 'itinerary'
  | 'insurance'
  | 'photo'
  | 'form'
  | 'other';

export interface DocumentVerificationResult {
  status: 'verified' | 'failed' | 'needs_review' | 'expired';
  method: 'mrz' | 'llm_sanity_check' | 'unattempted';
  category: DocumentCategory;
  checkedAt: string;
  confidence: number;
  summary: string;
  fields?: Record<string, string>;
  concerns?: string[];
  ocrConfidence?: number;
  inputMode: 'ocr' | 'manual_entry' | 'ocr_corrected';
}

export enum VisaType {
  TOURIST = 'Tourist',
  BUSINESS = 'Business',
  STUDENT = 'Study',
  WORK = 'Work',
  TRANSIT = 'Transit',
  RESIDENCY = 'Permanent Residency'
}

export interface Country {
  name: string;
  code: string;
}
