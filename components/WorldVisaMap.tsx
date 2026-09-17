import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { COUNTRIES } from '../constants';

const DATA_URL = 'https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso2.csv';
const WORLD_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
// India is deliberately overridden with the Survey-of-India-derived national boundary.
// The global basemap remains a discovery/interaction layer; this avoids relying on a
// generic world dataset for India's politically sensitive boundary depiction.
const INDIA_OFFICIAL_URL = 'https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson';

// Visa categories are the only fill encoding on the map. The selected passport is
// indicated by a boundary, not by a different fill color, so it never conflicts with
// the visa-access legend.
const COLORS = {
  free: '#63ad69',
  voa: '#a9d67f',
  evisa: '#f1c75b',
  required: '#df8585',
  unknown: '#d8dde2',
} as const;
type Category = keyof typeof COLORS;
const LABELS: Record<Category, string> = {
  free: 'Visa free',
  voa: 'Visa on arrival',
  evisa: 'eVisa / online',
  required: 'Visa required',
  unknown: 'Not in dataset',
};
const countryByCode = new Map(COUNTRIES.map(c => [c.code, c]));
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

function countryCode(feature: any): string {
  const properties = feature?.properties ?? {};
  // geo-countries has used both Natural Earth-style ISO_A2 fields and the
  // newer ISO3166-1-Alpha-2 schema. Support both so the visa matrix always
  // joins to the geometry.
  return String(
    properties.ISO_A2 ||
    properties.ISO_A2_EH ||
    properties.ISO_A2_CODE ||
    properties['ISO3166-1-Alpha-2'] ||
    properties.iso_a2 ||
    ''
  ).toUpperCase();
}

function classify(value?: string): Category {
  if (!value) return 'unknown';
  const v = normalize(value);
  if (/^\d+$/.test(value) || v === 'visafree') return 'free';
  if (v === 'visaonarrival') return 'voa';
  if (v === 'evisa' || v === 'eta') return 'evisa';
  if (v === 'visarequired' || v === 'noadmission') return 'required';
  return 'unknown';
}

interface Props { passport: string; onDestinationSelect?: (destination: string, category: Category) => void; }
interface Row { Passport: string; Destination: string; Requirement: string; }

const WorldVisaMap: React.FC<Props> = ({ passport, onDestinationSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rules, setRules] = useState<Row[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const passportCode = COUNTRIES.find(c => c.name === passport)?.code ?? 'IN';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      d3.csv(DATA_URL),
      d3.json<any>(WORLD_URL),
      d3.json<any>(INDIA_OFFICIAL_URL),
    ])
      .then(([csv, world, indiaOfficial]) => {
        if (cancelled) return;
        const worldFeatures = world?.features ?? [];
        const indiaFeature = indiaOfficial?.features?.[0];
        // Replace only India's world-basemap feature. All other countries retain
        // the existing global geometry and therefore the existing visa interaction.
        const mergedFeatures = indiaFeature
          ? [
              ...worldFeatures.filter((feature: any) => countryCode(feature) !== 'IN'),
              {
                ...indiaFeature,
                properties: {
                  ...(indiaFeature.properties ?? {}),
                  ISO_A2: 'IN',
                  ADMIN: 'India',
                  NAME: 'India',
                },
              },
            ]
          : worldFeatures;
        setRules(csv as Row[]);
        setCountries(mergedFeatures);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const rulesByDestination = useMemo(() => {
    const map = new Map<string, string>();
    rules.forEach(r => {
      if (r.Passport?.toUpperCase() === passportCode) {
        map.set(r.Destination?.toUpperCase(), r.Requirement);
      }
    });
    return map;
  }, [rules, passportCode]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { free: 0, voa: 0, evisa: 0, required: 0, unknown: 0 };
    rulesByDestination.forEach(v => { c[classify(v)] += 1; });
    return c;
  }, [rulesByDestination]);

  useEffect(() => {
    if (!svgRef.current || !countries.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const width = 960, height = 500;
    const collection = { type: 'FeatureCollection', features: countries } as any;
    const projection = d3.geoNaturalEarth1().fitSize([width, height], collection);
    const path = d3.geoPath(projection);
    const layer = svg.append('g');

    layer.selectAll('path').data(countries).join('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => COLORS[classify(rulesByDestination.get(countryCode(d)))] )
      .attr('fill-opacity', (d: any) => classify(rulesByDestination.get(countryCode(d))) === 'unknown' ? 0.72 : 1)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.7)
      .style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).attr('stroke', '#17202a').attr('stroke-width', 1.5);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 0.7);
      })
      .on('click', (_event, d: any) => {
        const code = countryCode(d);
        const name = countryByCode.get(code)?.name || d.properties?.ADMIN || d.properties?.NAME || d.properties?.name || 'Destination';
        const category = classify(rulesByDestination.get(code));
        onDestinationSelect?.(name, category);
      })
      .append('title')
      .text((d: any) => {
        const code = countryCode(d);
        const name = countryByCode.get(code)?.name || d.properties?.ADMIN || d.properties?.NAME || d.properties?.name || 'Destination';
        return `${name} — ${LABELS[classify(rulesByDestination.get(code))]}`;
      });

    // Highlight the selected passport country without changing its category fill.
    layer.selectAll('path')
      .filter((d: any) => countryCode(d) === passportCode)
      .attr('stroke', '#17202a')
      .attr('stroke-width', 2.2);
  }, [countries, rulesByDestination, passportCode, onDestinationSelect]);

  return <section>
    <style>{`.vc-map{position:relative;background:#edf0f2;border:1px solid #e1e5e9;border-radius:22px;overflow:hidden}.vc-map svg{display:block;width:100%;height:auto}.vc-map-loading{min-height:360px;display:grid;place-items:center;color:#68737d;font-size:14px}.vc-map-legend{display:flex;flex-wrap:wrap;gap:8px;padding:13px 16px;background:#fff;border-top:1px solid #e1e5e9}.vc-chip{border:0;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:700}.vc-note{font-size:11px;color:#7a848d;margin:9px 4px 0}`}</style>
    <div className="vc-map">
      {loading ? <div className="vc-map-loading">Loading the world visa atlas…</div> : error ? <div className="vc-map-loading">Could not load the visa atlas. Reload to try again.</div> : <svg ref={svgRef} viewBox="0 0 960 500" role="img" aria-label={`Visa access map for ${passport} passport`} />}
      <div className="vc-map-legend">{(['free','voa','evisa','required'] as Category[]).map(k => <span className="vc-chip" key={k} style={{ background: COLORS[k] + '35' }}>{LABELS[k]} · {counts[k]}</span>)}</div>
    </div>
    <p className="vc-note">India's boundary is overridden with the Survey-of-India-derived boundary dataset. Visa access remains a discovery layer based on the Passport Index matrix; individual visa rules must be verified against official government sources.</p>
  </section>;
};

export default WorldVisaMap;
