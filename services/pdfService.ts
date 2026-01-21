import { VisaChecklist } from '../types';

export const generateChecklistPDF = (checklist: VisaChecklist) => {
  // Create a simple PDF using HTML to PDF approach
  const content = `
    Visa Checklist: ${checklist.countryFrom} → ${checklist.countryTo}
    
    Visa Type: ${checklist.visaType}
    Category: ${checklist.visaCategory}
    Processing Time: ${checklist.estimatedProcessingTime}
    Expected Fee: ${checklist.expectedFee}
    
    General Requirements:
    ${checklist.generalRequirements.map(r => `- ${r}`).join('\n')}
    
    Specific Requirements:
    ${checklist.specificRequirements.map(r => `- ${r}`).join('\n')}
    
    Financial Requirements:
    ${checklist.financialRequirements.map(r => `- ${r}`).join('\n')}
    
    Additional Tips:
    ${checklist.additionalTips.map(t => `- ${t}`).join('\n')}
  `;

  const element = document.createElement('div');
  element.innerHTML = `<pre>${content}</pre>`;
  document.body.appendChild(element);
  window.print();
  document.body.removeChild(element);
};

export const exportChecklistAsJSON = (checklist: VisaChecklist) => {
  const jsonString = JSON.stringify(checklist, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `visa-checklist-${checklist.countryFrom}-to-${checklist.countryTo}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
