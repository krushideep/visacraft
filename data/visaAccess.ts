export type VisaAccessCategory = 'free' | 'voa' | 'evisa' | 'required' | 'unknown';

export interface VisaAccessRecord {
  passport: string;
  destination: string;
  category: VisaAccessCategory;
  stay?: string;
}

/**
 * UI seed data shaped like the Kaggle Passport Index dataset.
 * Replace this file with the normalized, source-verified rules dataset before production.
 */
export const VISA_ACCESS: VisaAccessRecord[] = [
  { passport: 'India', destination: 'Japan', category: 'evisa' },
  { passport: 'India', destination: 'Thailand', category: 'free' },
  { passport: 'India', destination: 'Indonesia', category: 'free' },
  { passport: 'India', destination: 'Malaysia', category: 'free' },
  { passport: 'India', destination: 'Singapore', category: 'required' },
  { passport: 'India', destination: 'United States of America', category: 'required' },
  { passport: 'India', destination: 'Canada', category: 'required' },
  { passport: 'India', destination: 'Australia', category: 'evisa' },
  { passport: 'India', destination: 'United Kingdom', category: 'evisa' },
  { passport: 'India', destination: 'France', category: 'free' },
  { passport: 'India', destination: 'Germany', category: 'free' },
  { passport: 'India', destination: 'Italy', category: 'free' },
  { passport: 'India', destination: 'United Arab Emirates', category: 'voa' },
  { passport: 'India', destination: 'Maldives', category: 'voa' },
  { passport: 'India', destination: 'Nepal', category: 'free' },
  { passport: 'India', destination: 'Bhutan', category: 'free' },
  { passport: 'India', destination: 'Sri Lanka', category: 'evisa' },
  { passport: 'India', destination: 'Vietnam', category: 'evisa' },
  { passport: 'India', destination: 'Türkiye', category: 'evisa' },
  { passport: 'India', destination: 'Georgia', category: 'free' },
];

export const VISA_ACCESS_LABELS: Record<VisaAccessCategory, string> = {
  free: 'Visa free',
  voa: 'Visa on arrival',
  evisa: 'eVisa / online',
  required: 'Visa required',
  unknown: 'Not in dataset',
};
