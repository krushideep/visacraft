
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
}

export interface ChecklistItem {
  title: string;
  requirements: string[];
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
