import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogContent, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import VisaAssistant from './components/VisaAssistant';
import WorldVisaMap from './components/WorldVisaMap';
import { generateVisaChecklist } from './services/aiService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

type MapCategory = 'free' | 'voa' | 'evisa' | 'required' | 'unknown';
const categoryLabel: Record<MapCategory, string> = { free:'Visa free', voa:'Visa on arrival', evisa:'eVisa / online', required:'Visa required', unknown:'Verify requirements' };
const categoryTone: Record<MapCategory, 'success'|'warning'|'info'|'error'|'default'> = { free:'success', voa:'success', evisa:'warning', required:'error', unknown:'default' };

const passportFlag = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)));
};

const App: React.FC = () => {
  const [passport, setPassport] = useState('India');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState<VisaType>(VisaType.TOURIST);
  const [selectedCategory, setSelectedCategory] = useState<MapCategory|null>(null);
  const [checklist, setChecklist] = useState<VisaChecklist|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);

  const passportCode = useMemo(() => COUNTRIES.find(c => c.name === passport)?.code ?? 'IN', [passport]);
  const flag = passportFlag(passportCode);

  const popular = useMemo(() => {
    const pool = COUNTRIES.filter(c => c.code !== passportCode);
    // Destination cards are intentionally derived from the selected passport's atlas,
    // rather than a hard-coded list. The map remains the authoritative discovery UI.
    const preferred = ['TH','MY','VN','LK','JP','GE','ID','NP','AE','OM','MV','MU'];
    return [...preferred.map(code => pool.find(c => c.code === code)).filter(Boolean) as typeof pool,
      ...pool.filter(c => !preferred.includes(c.code))].slice(0, 4);
  }, [passportCode]);

  const openDestination = (name: string, category: MapCategory = 'unknown') => {
    setDestination(name); setSelectedCategory(category); setError(null); setExploreOpen(true);
  };

  const choosePassport = (value: string) => {
    setPassport(value); setDestination(''); setSelectedCategory(null); setError(null); setExploreOpen(false);
  };

  const checkRequirements = async () => {
    if (!destination) return;
    setLoading(true); setError(null); setExploreOpen(false);
    try { setChecklist(await generateVisaChecklist(passport, destination, purpose, selectedCategory ?? 'unknown')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not generate visa checklist.'); }
    finally { setLoading(false); }
  };

  if (checklist) return <Box sx={{ minHeight:'100vh', bgcolor:'#f7f7f3' }}><Header/><Container maxWidth="lg" sx={{py:{xs:3,md:5}}}><Stack spacing={3}><ChecklistResult checklist={checklist} onReset={()=>setChecklist(null)}/><VisaAssistant context={{passport:checklist.countryFrom,destination:checklist.countryTo,purpose:checklist.visaType}}/></Stack></Container></Box>;

  return <Box sx={{minHeight:'100vh',bgcolor:'#f7f7f3',color:'#171816'}}>
    <Header/>
    <Container maxWidth="xl" sx={{py:{xs:3,md:6},px:{xs:2,md:4}}}>
      <Stack spacing={{xs:3,md:4}}>
        <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" alignItems={{md:'flex-end'}} spacing={3}>
          <Box sx={{maxWidth:760}}><Typography variant="overline" sx={{letterSpacing:'.16em',fontWeight:800,color:'text.secondary'}}>PASSPORT ATLAS</Typography><Typography sx={{mt:1,fontSize:{xs:'3rem',sm:'4.2rem',md:'5.5rem'},lineHeight:.94,letterSpacing:'-.065em',fontWeight:850}}>Where can your passport take you?</Typography></Box>
          <Card sx={{minWidth:{md:220},borderRadius:3,boxShadow:'none',bgcolor:'#fff',border:'1px solid #dfdfd8'}}>
            <CardContent sx={{p:2}}><Typography variant="caption" color="text.secondary">YOUR PASSPORT</Typography><Typography fontWeight={800} fontSize={19}>{flag} {passport}</Typography><Button size="small" onClick={()=>setExploreOpen(true)} sx={{px:0,textTransform:'none'}}>Change passport</Button></CardContent>
          </Card>
        </Stack>

        <Box sx={{'& > div':{borderRadius:'28px !important'},overflow:'hidden'}}><WorldVisaMap passport={passport} onDestinationSelect={openDestination}/></Box>
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{px:.5}}>{(['free','voa','evisa','required'] as MapCategory[]).map(c=><Typography key={c} variant="caption" sx={{mr:1,color:'text.secondary'}}>● {categoryLabel[c]}</Typography>)}</Stack>

        <Box sx={{display:'flex',justifyContent:'center',py:1}}><Button onClick={()=>setExploreOpen(true)} variant="contained" size="large" sx={{borderRadius:99,px:3,py:1.4,bgcolor:'#181916',textTransform:'none',fontWeight:800,'&:hover':{bgcolor:'#000'}}}>Find somewhere to go →</Button></Box>

        <Box sx={{pt:2}}>
          <Typography sx={{fontSize:28,fontWeight:800,letterSpacing:'-.04em',mb:2}}>Popular from {passport}</Typography>
          <Box sx={{display:'grid',gridTemplateColumns:{xs:'repeat(2,1fr)',md:'repeat(4,1fr)'},gap:1.5}}>
            {popular.map(c=><Card key={c.code} onClick={()=>openDestination(c.name)} sx={{cursor:'pointer',borderRadius:3,boxShadow:'none',border:'1px solid #e1e1da',transition:'.18s','&:hover':{transform:'translateY(-2px)',boxShadow:'0 8px 25px rgba(0,0,0,.06)'}}}>
              <CardContent sx={{p:{xs:1.7,md:2.2}}}><Typography fontSize={30}>{passportFlag(c.code)}</Typography><Typography fontWeight={800} sx={{mt:1.5}}>{c.name}</Typography><Typography variant="caption" color="text.secondary">Explore visa access</Typography></CardContent>
            </Card>)}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{textAlign:'center',pt:2}}>Discovery data helps you explore. Individual visa decisions should be verified against official immigration sources.</Typography>
      </Stack>
    </Container>

    <Dialog open={exploreOpen} onClose={()=>setExploreOpen(false)} fullWidth maxWidth="sm" PaperProps={{sx:{borderRadius:'24px 24px 8px 8px',p:1}}}>
      <DialogContent sx={{p:{xs:2,md:3}}}><Stack spacing={2.5}>
        <Box><Typography variant="overline" color="text.secondary">EXPLORE</Typography><Typography sx={{fontSize:36,fontWeight:850,letterSpacing:'-.05em'}}>{destination || 'Choose your passport'}</Typography></Box>
        {!destination ? <FormControl fullWidth><InputLabel>Passport</InputLabel><Select value={passport} label="Passport" onChange={e=>choosePassport(e.target.value)}>{COUNTRIES.map(c=><MenuItem key={c.code} value={c.name}>{passportFlag(c.code)} {c.name}</MenuItem>)}</Select></FormControl> : <>
          <Chip label={categoryLabel[selectedCategory ?? 'unknown']} color={categoryTone[selectedCategory ?? 'unknown']} sx={{alignSelf:'flex-start',fontWeight:700}}/>
          <Divider/><Typography fontWeight={750}>Travel to {destination}</Typography>
          <Typography variant="body2" color="text.secondary">Your selected passport is {flag} {passport}. Check the full entry process and official source requirements for this trip.</Typography>
          <FormControl fullWidth><InputLabel>Purpose</InputLabel><Select value={purpose} label="Purpose" onChange={e=>setPurpose(e.target.value as VisaType)}>{Object.values(VisaType).map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
          <Button variant="contained" size="large" onClick={checkRequirements} disabled={loading} sx={{borderRadius:2,bgcolor:'#181916',textTransform:'none',fontWeight:800}}>{loading?'Preparing…':'View full visa process →'}</Button>
        </>}
      </Stack></DialogContent>
    </Dialog>
    {error && <Alert severity="error" sx={{position:'fixed',bottom:16,left:16,right:16,zIndex:1400}}>{error}</Alert>}
  </Box>;
};
export default App;
