import React, { useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { VISA_ACCESS, VISA_ACCESS_LABELS, VisaAccessCategory } from '../data/visaAccess';

const COLORS: Record<VisaAccessCategory, string> = {
  free: '#78a978',
  voa: '#a8c28b',
  evisa: '#d4b36c',
  required: '#cc8b82',
  unknown: '#d7dadd',
};

const ALIASES: Record<string, string> = {
  'United States': 'United States of America',
  USA: 'United States of America',
  UK: 'United Kingdom',
  Türkiye: 'Türkiye',
  Turkey: 'Türkiye',
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function categoryFor(passport: string, destination: string): VisaAccessCategory {
  const target = ALIASES[destination] ?? destination;
  return VISA_ACCESS.find(
    (record) => normalize(record.passport) === normalize(passport) && normalize(record.destination) === normalize(target),
  )?.category ?? 'unknown';
}

export interface WorldVisaMapProps {
  passport: string;
  onDestinationSelect?: (destination: string, category: VisaAccessCategory) => void;
}

const WorldVisaMap: React.FC<WorldVisaMapProps> = ({ passport, onDestinationSelect }) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((response) => {
        if (!response.ok) throw new Error('Map data could not be loaded');
        return response.json();
      })
      .then((world) => {
        if (!cancelled) {
          const collection = feature(world, world.objects.countries) as any;
          setCountries(collection.features ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const projection = useMemo(() => d3.geoNaturalEarth1().fitSize([960, 500], { type: 'FeatureCollection', features: countries }), [countries]);
  const path = useMemo(() => d3.geoPath(projection), [projection]);

  const counts = useMemo(() => {
    const result: Record<VisaAccessCategory, number> = { free: 0, voa: 0, evisa: 0, required: 0, unknown: 0 };
    VISA_ACCESS.filter((r) => normalize(r.passport) === normalize(passport)).forEach((r) => { result[r.category] += 1; });
    return result;
  }, [passport]);

  return (
    <Box sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden', background: '#eef0f2' }}>
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360, color: 'text.secondary' }}>
            <CircularProgress size={26} /><Typography variant="caption" sx={{ mt: 1 }}>Loading world map…</Typography>
          </Stack>
        )}
        {!loading && countries.length === 0 && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360, p: 3 }}>
            <Typography fontWeight={700}>World map unavailable</Typography>
            <Typography variant="body2" color="text.secondary">Check your network connection and reload.</Typography>
          </Stack>
        )}
        {!loading && countries.length > 0 && (
          <svg viewBox="0 0 960 500" width="100%" role="img" aria-label={`Visa access map for ${passport} passport`}>
            <rect width="960" height="500" fill="#eef0f2" />
            {countries.map((country, index) => {
              const destination = country.properties?.name ?? `Country ${country.id}`;
              const category = categoryFor(passport, destination);
              return (
                <path
                  key={`${country.id}-${index}`}
                  d={path(country) ?? undefined}
                  fill={COLORS[category]}
                  stroke="#fff"
                  strokeWidth="0.7"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onDestinationSelect?.(destination, category)}
                >
                  <title>{destination} — {VISA_ACCESS_LABELS[category]}</title>
                </path>
              );
            })}
          </svg>
        )}
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ p: 1.5, background: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
        {(['free', 'voa', 'evisa', 'required'] as VisaAccessCategory[]).map((category) => (
          <Chip key={category} size="small" label={`${VISA_ACCESS_LABELS[category]} · ${counts[category]}`} sx={{ background: COLORS[category] + '35', fontWeight: 650 }} />
        ))}
      </Stack>
    </Box>
  );
};

export default WorldVisaMap;
