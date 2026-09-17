import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import VisaAssistant from './components/VisaAssistant';
import WorldVisaMap from './components/WorldVisaMap';
import { generateVisaChecklist } from './services/aiService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

type MapCategory = 'free' | 'voa' | 'evisa' | 'required' | 'unknown';

const App: React.FC = () => {
  const [passport, setPassport] = useState('India');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState<VisaType>(VisaType.TOURIST);
  const [checklist, setChecklist] = useState<VisaChecklist | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MapCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectDestination = (name: string, category: MapCategory) => { setDestination(name); setSelectedCategory(category); setError(null); };
  const checkRequirements = async () => {
    if (!passport || !destination) return setError('Select a passport and destination first.');
    if (passport === destination) return setError('Passport country and destination cannot be the same.');
    setLoading(true); setError(null);
    try { setChecklist(await generateVisaChecklist(passport, destination, purpose, selectedCategory ?? 'unknown')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not generate visa checklist.'); }
    finally { setLoading(false); }
  };

  if (checklist) return <Box sx={{ minHeight: '100vh', background: '#f7f8f5' }}><Header /><Container maxWidth="lg" sx={{ py: 5 }}><Stack spacing={3}><ChecklistResult checklist={checklist} onReset={() => setChecklist(null)} /><VisaAssistant context={{ passport: checklist.countryFrom, destination: checklist.countryTo, purpose: checklist.visaType }} /></Stack></Container></Box>;

  return <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f7f8f5 0%,#fff 72%)' }}>
    <Header /><Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}><Stack spacing={3}>
      <Box sx={{ maxWidth: 850 }}><Typography sx={{ fontSize: { xs: '2.8rem', md: '5rem' }, fontWeight: 850, letterSpacing: '-.06em', lineHeight: .98 }}>Know where your passport can take you.</Typography><Typography color="text.secondary" sx={{ mt: 2, fontSize: { xs: 16, md: 19 } }}>Explore the world by visa requirement. Select a destination to go from the map to the full visa process.</Typography></Box>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}><CardContent sx={{ p: { xs: 2, md: 3 } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl fullWidth><InputLabel>Passport</InputLabel><Select value={passport} label="Passport" onChange={e => { setPassport(e.target.value); setDestination(''); setSelectedCategory(null); }}>{COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Destination</InputLabel><Select value={destination} label="Destination" onChange={e => { setDestination(e.target.value); const code = COUNTRIES.find(c => c.name === e.target.value)?.code; setSelectedCategory(code ? 'unknown' : null); }}>{COUNTRIES.filter(c => c.name !== passport).map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Purpose</InputLabel><Select value={purpose} label="Purpose" onChange={e => setPurpose(e.target.value as VisaType)}>{Object.values(VisaType).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
      </Stack></CardContent></Card>
      {error && <Alert severity="error">{error}</Alert>}
      <WorldVisaMap passport={passport} onDestinationSelect={selectDestination} />
      {destination && <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ sm: 'center' }}><Box><Typography variant="overline" color="text.secondary">Selected destination</Typography><Typography variant="h4" fontWeight={800}>{destination}</Typography>{selectedCategory && <Typography color="text.secondary">{selectedCategory === 'free' ? 'Visa free' : selectedCategory === 'voa' ? 'Visa on arrival' : selectedCategory === 'evisa' ? 'eVisa / online' : selectedCategory === 'required' ? 'Visa required' : 'Requirement classification will be verified'}</Typography>}</Box><Button variant="contained" size="large" onClick={checkRequirements} disabled={loading} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>{loading ? 'Checking…' : 'View visa process →'}</Button></Stack></CardContent></Card>}
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>The map is a discovery layer. Individual visa decisions should be verified against official immigration sources.</Typography>
    </Stack></Container>
  </Box>;
};

export default App;
