
import React, { useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Grid,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Header from './components/Header';
import ChecklistResult from './components/ChecklistResult';
import { generateVisaChecklist } from './services/aiService';
import { COUNTRIES } from './constants';
import { VisaChecklist, VisaType } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VisaChecklist | null>(null);

  // Form State
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [visaType, setVisaType] = useState<VisaType>(VisaType.TOURIST);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCountry || !toCountry) {
      setError("Please select both origin and destination countries.");
      return;
    }

    if (fromCountry === toCountry) {
      setError("Origin and destination cannot be the same.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateVisaChecklist(fromCountry, toCountry, visaType);
      setChecklist(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Visa checklist error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setChecklist(null);
    setError(null);
  };

  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      <Box
        component="main"
        sx={{
          flex: 1,
          py: { xs: 4, md: 8 },
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Container maxWidth="md">
          {!checklist ? (
            <Box
              sx={{
                animation: 'fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                  <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography
                      variant="h2"
                      sx={{
                        mb: 1,
                        fontSize: { xs: '1.75rem', md: '2.5rem' },
                        color: theme.palette.text.primary,
                      }}
                    >
                      Visa Requirements, Simplified
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                        fontSize: '1.05rem',
                      }}
                    >
                      Get a clear, up-to-date checklist for your visa — based on your passport, destination, and travel purpose.
                    </Typography>
                  </Box>

                  <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
                    <Stack spacing={3}>
                      {/* Country Selection Row */}
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel id="from-country-label">Passport Issuing Country</InputLabel>
                            <Select
                              labelId="from-country-label"
                              id="from-country"
                              value={fromCountry}
                              onChange={(e) => setFromCountry(e.target.value)}
                              label="  Passport Issuing Country  "
                              sx={{
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8f9fa',
                                  '&:hover': {
                                    backgroundColor: theme.palette.background.paper,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="">
                                <em>Select country...</em>
                              </MenuItem>
                              {COUNTRIES.map((c) => (
                                <MenuItem key={`from-${c.code}`} value={c.name}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel id="to-country-label">Where are you travelling to?</InputLabel>
                            <Select
                              labelId="to-country-label"
                              id="to-country"
                              value={toCountry}
                              onChange={(e) => setToCountry(e.target.value)}
                              label="Where are you travelling to?"
                              sx={{
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8f9fa',
                                  '&:hover': {
                                    backgroundColor: theme.palette.background.paper,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="">
                                <em>Select country...</em>
                              </MenuItem>
                              {COUNTRIES.map((c) => (
                                <MenuItem key={`to-${c.code}`} value={c.name}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* Visa Type Selection */}
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mb: 1.5,
                            color: theme.palette.text.secondary,
                            fontWeight: 700,
                          }}
                        >
                          Purpose of Travel
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {Object.values(VisaType).map((type) => (
                            <Button
                              key={type}
                              variant={visaType === type ? 'contained' : 'outlined'}
                              onClick={() => setVisaType(type)}
                              size="small"
                              sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                px: 2,
                                py: 1,
                              }}
                            >
                              {type}
                            </Button>
                          ))}
                        </Stack>
                      </Box>

                      {/* Error Message */}
                      {error && (
                        <Alert
                          severity="error"
                          sx={{
                            borderRadius: 2,
                            animation: 'fadeIn 0.3s ease-in',
                            '@keyframes fadeIn': {
                              from: { opacity: 0 },
                              to: { opacity: 1 },
                            },
                          }}
                        >
                          {error}
                        </Alert>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                          py: 1.75,
                          fontSize: '1rem',
                          borderRadius: 2,
                          textTransform: 'none',
                          backgroundColor: theme.palette.text.primary,
                          '&:hover': {
                            backgroundColor: theme.palette.text.primary,
                            opacity: 0.9,
                          },
                          '&:disabled': {
                            opacity: 0.6,
                          },
                        }}
                      >
                        {loading ? 'Generating Visa Checklist...' : 'Generate Visa Checklist'}
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <ChecklistResult checklist={checklist} onReset={handleReset} />
          )}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          py: 3,
          backgroundColor: theme.palette.background.paper,
          mt: 'auto',
          '&.no-print': {
            '@media print': {
              display: 'none',
            },
          },
        }}
        className="no-print"
      >
        <Container maxWidth="lg">
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: theme.palette.text.secondary,
            }}
          >
            &copy; {new Date().getFullYear()} VisaCraft. Helping the world move, one stamp at a time.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default App;
