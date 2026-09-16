import React, { useState } from 'react';
import { Box, Container, TextField, Select, MenuItem, Button, Card, CardContent, Stack, Typography, Alert, FormControl, InputLabel, Grid, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import VisaAssistant from './components/VisaAssistant';
import { generateVisaChecklist } from './services/aiService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VisaChecklist | null>(null);
  const [fromCountry, setFromCountry] = useState('India');
  const [toCountry, setToCountry] = useState('');
  const [visaType, setVisaType] = useState<VisaType>(VisaType.TOURIST);
  const theme = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCountry || !toCountry) return setError('Please select both passport country and destination.');
    if (fromCountry === toCountry) return setError('Passport country and destination cannot be the same.');
    setLoading(true); setError(null);
    try { setChecklist(await generateVisaChecklist(fromCountry, toCountry, visaType)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not generate visa checklist.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setChecklist(null); setError(null); };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f7f8f5 0%,#fff 70%)' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        {!checklist ? (
          <Stack spacing={4} alignItems="center">
            <Box sx={{ textAlign: 'center', maxWidth: 760 }}>
              <Chip label="YOUR TRAVEL READINESS ASSISTANT" color="success" variant="outlined" sx={{ mb: 2, fontWeight: 800, letterSpacing: '.06em' }} />
              <Typography sx={{ fontSize: { xs: '3rem', md: '5.2rem' }, fontWeight: 850, letterSpacing: '-.06em', lineHeight: .98 }}>Know before<br />you go.</Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 19 }, mt: 2, lineHeight: 1.55 }}>Tell VisaCraft about your trip. Get a clear, personalized visa plan — then verify it against official sources.</Typography>
            </Box>
            <Card sx={{ width: '100%', maxWidth: 860, borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 20px 60px rgba(20,40,30,.08)' }}>
              <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2.5}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}><FormControl fullWidth><InputLabel>Passport country</InputLabel><Select value={fromCountry} label="Passport country" onChange={e => setFromCountry(e.target.value)}>{COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
                      <Grid size={{ xs: 12, md: 6 }}><FormControl fullWidth><InputLabel>Destination</InputLabel><Select value={toCountry} label="Destination" onChange={e => setToCountry(e.target.value)}><MenuItem value=""><em>Select destination…</em></MenuItem>{COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
                    </Grid>
                    <Box><Typography variant="caption" fontWeight={800} color="text.secondary">PURPOSE</Typography><Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>{Object.values(VisaType).map(t => <Button key={t} variant={visaType === t ? 'contained' : 'outlined'} onClick={() => setVisaType(t)} sx={{ borderRadius: 2 }}>{t}</Button>)}</Stack></Box>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.6, borderRadius: 2.5, fontWeight: 800, textTransform: 'none' }}>{loading ? 'Checking requirements…' : 'Check visa requirements →'}</Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
            <Typography variant="caption" color="text.secondary">✦ WebLLM-powered private assistant available on WebGPU-compatible browsers.</Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <ChecklistResult checklist={checklist} onReset={reset} />
            <VisaAssistant context={{ passport: checklist.countryFrom, destination: checklist.countryTo, purpose: checklist.visaType }} />
          </Stack>
        )}
      </Container>
    </Box>
  );
};

export default App;
