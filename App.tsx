import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogContent, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import VisaAssistant from './components/VisaAssistant';
import WorldVisaMap from './components/WorldVisaMap';
import { generateVisaChecklist } from './services/aiService';
import { fetchLiveVisaCheck } from './services/liveVisaService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

type MapCategory = 'free'|'voa'|'evisa'|'required'|'unknown';
const categoryLabel:Record<MapCategory,string>={free:'Visa free',voa:'Visa on arrival',evisa:'eVisa / online',required:'Visa required',unknown:'Verify requirements'};
const categoryTone:Record<MapCategory,'success'|'warning'|'info'|'error'|'default'>={free:'success',voa:'success',evisa:'warning',required:'error',unknown:'default'};
const flag=(code:string)=>/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...code.split('').map(c=>127397+c.charCodeAt(0))):'🌐';

const liveCategoryToLabel:Record<string,string>={
  visa_free:'Visa-free access',
  visa_on_arrival:'Visa on arrival',
  evisa_or_online:'eVisa / online authorization',
  visa_required:'Visa required',
  needs_review:'Needs verification'
};

const App:React.FC=()=>{
 const [passport,setPassport]=useState('India'),[atlasData,setAtlasData]=useState<Record<string,MapCategory>>({}),[destination,setDestination]=useState(''),[purpose,setPurpose]=useState<VisaType>(VisaType.TOURIST),[selectedCategory,setSelectedCategory]=useState<MapCategory|null>(null),[checklist,setChecklist]=useState<VisaChecklist|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null),[exploreOpen,setExploreOpen]=useState(false),[destinationQuery,setDestinationQuery]=useState('');
 const passportCode=useMemo(()=>COUNTRIES.find(c=>c.name===passport)?.code??'IN',[passport]);
 const ranked=useMemo(()=>{const preferred=['TH','MY','VN','LK','JP','GE','ID','NP','AE','OM','MV','MU'];const available=COUNTRIES.filter(c=>c.code!==passportCode&&atlasData[c.code]);const rank=(c:{code:string})=>{const i=preferred.indexOf(c.code);return i<0?999:i};return [...available].sort((a,b)=>rank(a)-rank(b));},[passportCode,atlasData]);
 const popular=ranked.slice(0,4);
 const searchResults=useMemo(()=>{const q=destinationQuery.trim().toLowerCase();return ranked.filter(c=>!q||c.name.toLowerCase().includes(q)).slice(0,30)},[ranked,destinationQuery]);
 const openDestination=(name:string,category:MapCategory='unknown')=>{setDestination(name);setSelectedCategory(category);setError(null);setExploreOpen(true)};
 const choosePassport=(value:string)=>{setPassport(value);setDestination('');setSelectedCategory(null);setAtlasData({});setDestinationQuery('');setError(null)};
 const checkRequirements=async()=>{
   if(!destination)return;
   setLoading(true);setError(null);setExploreOpen(false);
   try{
     const base=await generateVisaChecklist(passport,destination,purpose,selectedCategory??'unknown');
     const live=await fetchLiveVisaCheck(passportCode,COUNTRIES.find(c=>c.name===destination)?.code??destination,purpose,selectedCategory??'unknown');
     if(live){
       const liveLabel=liveCategoryToLabel[live.jev.category]??base.visaCategory;
       const liveSources=live.sourceEvidence.map(s=>({title:s.title,url:s.url}));
       setChecklist({
         ...base,
         visaCategory: liveLabel,
         officialLinks: liveSources.length ? liveSources : base.officialLinks,
         additionalTips:[
           ...base.additionalTips,
           live.live?.status === 'verified'
             ? `LIVE VERIFIED: official-source evidence was checked and Jev classified this case on ${new Date(live.sourceCheckedAt).toLocaleString()}.`
             : `LIVE CHECK: ${live.live?.reason ?? 'The evidence was insufficient for automatic verification.'} The displayed classification should be verified against the official source.`,
           live.live?.sourceCount != null ? `Official sources retrieved: ${live.live.sourceCount}.` : 'Official-source retrieval completed.',
           live.jev.confidence != null ? `Jev classification confidence: ${Math.round(live.jev.confidence*100)}%.` : 'Jev classification completed.',
         ],
         liveVerification:{
           status: live.live?.status === 'verified' ? 'verified' : 'needs_review',
           checkedAt:live.sourceCheckedAt,
           sourceEvidence:live.sourceEvidence.map(s=>({title:s.title,url:s.url})),
           jevCategory:live.jev.category,
           jevConfidence:live.jev.confidence,
           jevNeedsReview:live.jev.needsReview,
         },
       });
     } else {
       const reason='The live verification request did not reach the VisaCraft API. The checklist below is the deterministic rule/discovery result.';
       setChecklist({
         ...base,
         additionalTips:[...base.additionalTips, reason],
         liveVerification:{
           status:'unavailable',
           checkedAt:new Date().toISOString(),
           sourceEvidence:[],
           reason,
         },
       });
     }
   }catch(err){setError(err instanceof Error?err.message:'Could not generate visa checklist.')}finally{setLoading(false)}
 };
 if(checklist)return <Box sx={{minHeight:'100vh',bgcolor:'#f7f7f3'}}><Header/><Container maxWidth="lg" sx={{py:{xs:3,md:5}}}><Stack spacing={3}><ChecklistResult checklist={checklist} onReset={()=>setChecklist(null)}/><VisaAssistant context={{passport:checklist.countryFrom,destination:checklist.countryTo,purpose:checklist.visaType}}/></Stack></Container></Box>;
 return <Box sx={{minHeight:'100vh',bgcolor:'#f7f7f3',color:'#171816'}}><Header/><Container maxWidth="xl" sx={{py:{xs:3,md:6},px:{xs:2,md:4}}}><Stack spacing={{xs:3,md:4}}>
  <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" alignItems={{md:'flex-end'}} spacing={3}><Box sx={{maxWidth:760}}><Typography variant="overline" sx={{letterSpacing:'.16em',fontWeight:800,color:'text.secondary'}}>PASSPORT ATLAS</Typography><Typography sx={{mt:1,fontSize:{xs:'3rem',sm:'4.2rem',md:'5.5rem'},lineHeight:.94,letterSpacing:'-.065em',fontWeight:850}}>Where can your passport take you?</Typography></Box><Card sx={{minWidth:{md:220},borderRadius:3,boxShadow:'none',bgcolor:'#fff',border:'1px solid #dfdfd8'}}><CardContent sx={{p:2}}><Typography variant="caption" color="text.secondary">YOUR PASSPORT</Typography><Typography fontWeight={800} fontSize={19}>{flag(passportCode)} {passport}</Typography><Button size="small" onClick={()=>{setDestination('');setExploreOpen(true)}} sx={{px:0,textTransform:'none'}}>Change passport</Button></CardContent></Card></Stack>
  <Box sx={{'& > div':{borderRadius:'28px !important'},overflow:'hidden'}}><WorldVisaMap passport={passport} onAtlasData={setAtlasData} onDestinationSelect={openDestination}/></Box>
  <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{px:.5}}>{(['free','voa','evisa','required'] as MapCategory[]).map(c=><Typography key={c} variant="caption" sx={{mr:1,color:'text.secondary'}}>● {categoryLabel[c]}</Typography>)}</Stack>
  <Box sx={{display:'flex',justifyContent:'center',py:1}}><Button onClick={()=>{setDestination('');setSelectedCategory(null);setDestinationQuery('');setExploreOpen(true)}} variant="contained" size="large" sx={{borderRadius:99,px:3,py:1.4,bgcolor:'#181916',textTransform:'none',fontWeight:800,'&:hover':{bgcolor:'#000'}}}>Find somewhere to go →</Button></Box>
  <Box sx={{pt:2}}><Typography sx={{fontSize:28,fontWeight:800,letterSpacing:'-.04em',mb:2}}>Popular from {flag(passportCode)} {passport}</Typography><Box sx={{display:'grid',gridTemplateColumns:{xs:'repeat(2,1fr)',md:'repeat(4,1fr)'},gap:1.5}}>{popular.map(c=><Card key={c.code} onClick={()=>openDestination(c.name,atlasData[c.code])} sx={{cursor:'pointer',borderRadius:3,boxShadow:'none',border:'1px solid #e1e1da',transition:'.18s','&:hover':{transform:'translateY(-2px)',boxShadow:'0 8px 25px rgba(0,0,0,.06)'}}}><CardContent sx={{p:{xs:1.7,md:2.2}}}><Typography fontSize={30}>{flag(c.code)}</Typography><Typography fontWeight={800} sx={{mt:1.5}}>{c.name}</Typography><Typography variant="caption" color="text.secondary">{categoryLabel[atlasData[c.code]]}</Typography><Box sx={{mt:1.3}}><Chip label={atlasData[c.code]==='free'?'No visa':atlasData[c.code]==='voa'?'On arrival':atlasData[c.code]==='evisa'?'Online':'Visa required'} size="small" color={categoryTone[atlasData[c.code]]}/></Box></CardContent></Card>)}</Box></Box>
  <Typography variant="caption" color="text.secondary" sx={{textAlign:'center',pt:2}}>Discovery data helps you explore. Individual visa decisions are checked against available official sources when you request the full process.</Typography>
 </Stack></Container>
 <Dialog open={exploreOpen} onClose={()=>setExploreOpen(false)} fullWidth maxWidth="sm" PaperProps={{sx:{borderRadius:'24px 24px 8px 8px',p:1}}}><DialogContent sx={{p:{xs:2,md:3}}}><Stack spacing={2.5}><Box><Typography variant="overline" color="text.secondary">{destination?'DESTINATION':'EXPLORE'}</Typography><Typography sx={{fontSize:36,fontWeight:850,letterSpacing:'-.05em'}}>{destination||'Where do you want to go?'}</Typography></Box>
  {!destination?<><FormControl fullWidth><InputLabel>Passport</InputLabel><Select value={passport} label="Passport" onChange={e=>choosePassport(e.target.value)}>{COUNTRIES.map(c=><MenuItem key={c.code} value={c.name}>{flag(c.code)} {c.name}</MenuItem>)}</Select></FormControl><TextField fullWidth label="Search destinations" value={destinationQuery} onChange={e=>setDestinationQuery(e.target.value)} placeholder="Try Japan, Thailand, France…"/><Stack spacing={.5} sx={{maxHeight:330,overflowY:'auto'}}>{searchResults.map(c=><Button key={c.code} onClick={()=>openDestination(c.name,atlasData[c.code])} sx={{justifyContent:'space-between',textTransform:'none',px:1.5,py:1.2,color:'inherit'}}><span>{flag(c.code)} {c.name}</span><Chip label={categoryLabel[atlasData[c.code]]} size="small" color={categoryTone[atlasData[c.code]]}/></Button>)}</Stack></>:<><Chip label={categoryLabel[selectedCategory??'unknown']} color={categoryTone[selectedCategory??'unknown']} sx={{alignSelf:'flex-start',fontWeight:700}}/><Divider/><Typography fontWeight={750}>Travel to {destination}</Typography><Typography variant="body2" color="text.secondary">Your selected passport is {flag(passportCode)} {passport}. The full process performs a live official-source check and Jev classification when available.</Typography><FormControl fullWidth><InputLabel>Purpose</InputLabel><Select value={purpose} label="Purpose" onChange={e=>setPurpose(e.target.value as VisaType)}>{Object.values(VisaType).map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl><Button variant="contained" size="large" onClick={checkRequirements} disabled={loading} sx={{borderRadius:2,bgcolor:'#181916',textTransform:'none',fontWeight:800}}>{loading?'Checking official sources…':'View full visa process →'}</Button></>}</Stack></DialogContent></Dialog>
 {error&&<Alert severity="error" sx={{position:'fixed',bottom:16,left:16,right:16,zIndex:1400}}>{error}</Alert>}</Box>;
};
export default App;
