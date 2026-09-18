import { VisaChecklist, VisaType } from "../types";
import { EU_SCHENGEN, getCountryCode } from "../constants";
import { getVisaSources } from "./visaSources";
import { findVisaRule } from "./visaRules";

const CACHE_PREFIX="visacraft_cache_v6_";
const CACHE_EXPIRY=1000*60*60*24;

type VisaAccessCategory="free"|"voa"|"evisa"|"required"|"unknown";
const categoryLabel:Record<VisaAccessCategory,string>={free:"Visa-free access",voa:"Visa on arrival",evisa:"eVisa / online authorization",required:"Visa required",unknown:"Visa requirement needs verification"};

const getCachedResult=(key:string):VisaChecklist|null=>{try{const cached=localStorage.getItem(key);if(!cached)return null;const{timestamp,data}=JSON.parse(cached);if(Date.now()-timestamp<CACHE_EXPIRY)return data;localStorage.removeItem(key)}catch{try{localStorage.removeItem(key)}catch{/* ignore */}}return null};
const saveCachedResult=(key:string,data:VisaChecklist)=>{try{localStorage.setItem(key,JSON.stringify({timestamp:Date.now(),data}))}catch{/* ignore */}};

const baseChecklist=(countryFrom:string,countryTo:string,visaType:VisaType,category:VisaAccessCategory):VisaChecklist=>{
 const codeTo=getCountryCode(countryTo), sources=getVisaSources(codeTo), rule=findVisaRule(getCountryCode(countryFrom),codeTo,visaType);
 const effective=rule?.category??category, label=categoryLabel[effective];
 const route=rule?.requirements?.[0]??(effective==="free"?"No visa application is indicated by the discovery dataset; verify stay limits and any separate authorization.":effective==="voa"?"Visa on arrival is indicated by the discovery dataset; verify eligibility, arrival procedure, fee and stay before departure.":effective==="evisa"?"Online authorization/eVisa is indicated; use the official destination-government portal below.":"Confirm the exact visa route with the official destination authority below.");
 const sourceLinks=(rule?.sources??sources.map(s=>({title:s.title,url:s.url})));
 const general=rule?.requirements??[
   "Passport validity and blank-page rules are destination-specific — verify the official source",
   "Entry conditions depend on nationality, travel purpose and intended stay",
   route,
   "Requirements can change; re-check the official source before submitting or travelling"
 ];
 return {
  countryFrom,countryTo,visaType,visaCategory:label,
  estimatedProcessingTime:rule?.processing??"See official source below",
  expectedFee:rule?.fee??"See official source below",
  generalRequirements:general,
  specificRequirements:[route,"Confirm maximum permitted stay and entry/exit conditions","Check whether an electronic authorization, registration, arrival card or biometric step is additionally required","Use only the official application route and current fee shown by the competent authority"],
  financialRequirements:["Check whether proof of funds is required for this nationality and purpose","If required, use the document period and minimum amount specified by the official authority","Do not rely on an old minimum-funds figure copied from third-party websites"],
  additionalTips:["VisaCraft uses the atlas classification for discovery; official government sources are the authority for the actual rule","Check the official source again close to departure because entry policies can change","Keep the approval/authorization and supporting documents accessible during travel",...(sourceLinks.length===0?["No curated official source is currently registered for this destination; use the destination government's immigration or foreign-affairs website."]:[])],
  officialLinks:sourceLinks.map(s=>({title:s.title,url:s.url})),
  applicationForms:sources.filter(s=>s.kind==="application").map(s=>({title:s.title,url:s.url})),
  checklistItems:[
   {title:"1. Passport",requirements:rule?[rule.requirements.find(x=>/passport/i.test(x))??"Valid passport; verify validity and blank-page requirements on the official source"]:[ "Valid passport in the traveler's name","Verify required validity period and blank pages on the official source"]},
   {title:"2. Travel purpose",requirements:[`Purpose: ${visaType}`,"Ensure stated purpose and dates are consistent across documents","Check whether this purpose has a separate visa category or conditions"]},
   {title:"3. Visa / entry authorization",requirements:[route,"Open the official source below and confirm eligibility for the selected passport","Confirm whether the process is online, on arrival, or through an embassy/consulate/authorized centre"]},
   {title:"4. Destination-specific requirements",requirements:rule?.requirements??["Follow the current document list published by the competent authority","Provide photographs, identity, civil-status or supporting documents only when required"]},
   {title:"5. Financial evidence",requirements:["Check the official source for proof-of-funds requirements","Use the authority's specified statement period, minimum amount and currency"]},
   {title:"6. Accommodation",requirements:["Prepare accommodation details if requested","If staying with a host, verify whether invitation/host documentation is required"]},
   {title:"7. Travel itinerary",requirements:["Prepare intended arrival and departure details","Check whether onward/return travel evidence is required"]},
   {title:"8. Insurance and health",requirements:["Check whether travel medical insurance is mandatory","Verify current health declarations, vaccination or other entry requirements if applicable"]},
   {title:"9. Supporting documents",requirements:["Employment, study, business, invitation or sponsor evidence may depend on the visa purpose","Check whether documents need translation, legalization or certification"]},
   {title:"10. Final verification",requirements:["Verify eligibility, permitted stay, validity, processing time and fee on the official source","Use the official application portal linked below where available","Re-check entry conditions before departure"]},
  ]
 };
};

export const generateVisaChecklist=async(countryFrom:string,countryTo:string,visaType:VisaType,accessCategory:VisaAccessCategory="unknown"):Promise<VisaChecklist>=>{
 const codeFrom=getCountryCode(countryFrom),codeTo=getCountryCode(countryTo);
 const cacheKey=`${CACHE_PREFIX}${codeFrom}_${codeTo}_${visaType.replace(/\s+/g,"_")}_${accessCategory}`;
 const cached=getCachedResult(cacheKey);if(cached)return cached;
 const isSchengenTo=EU_SCHENGEN.includes(codeTo);
 const effective=isSchengenTo&&(visaType===VisaType.TOURIST||visaType===VisaType.BUSINESS)?"required":accessCategory;
 const result=baseChecklist(countryFrom,countryTo,visaType,effective);saveCachedResult(cacheKey,result);return result;
};
