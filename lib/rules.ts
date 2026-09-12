export type Requirement = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  accepts: string[];
};

export const AUSTRALIA_VISITOR: Requirement[] = [
  { id:"passport", title:"Valid passport", description:"Provide a clear copy of your passport biodata page.", required:true, accepts:["passport"] },
  { id:"funds", title:"Financial evidence", description:"Evidence supporting your ability to fund the proposed trip.", required:true, accepts:["bank","financial"] },
  { id:"employment", title:"Employment / income evidence", description:"Evidence of your employment, income or other economic circumstances.", required:true, accepts:["employment","salary","income"] },
  { id:"itinerary", title:"Travel purpose / itinerary", description:"Evidence explaining the purpose and proposed itinerary.", required:true, accepts:["itinerary","flight","travel"] },
  { id:"accommodation", title:"Accommodation evidence", description:"Accommodation or host details where applicable.", required:false, accepts:["hotel","accommodation","invitation","host"] }
];