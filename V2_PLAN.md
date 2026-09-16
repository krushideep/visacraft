# VisaCraft V2

## Product loop
1. Traveler describes trip.
2. VisaCraft normalizes passport, destination, purpose, duration and existing visas.
3. Deterministic rules/data layer decides requirements.
4. WebLLM explains the result locally in the browser.
5. Every material requirement points to an official source and verification date.
6. Traveler completes a checklist and can save/share the result.

## Important boundary
WebLLM is the conversational interface, not the authority. It must not invent visa requirements, fees, processing times, exemptions or URLs.

## Current implementation
- Added `@mlc-ai/web-llm`.
- Added `services/webllmService.ts`.
- Added `components/VisaAssistant.tsx`.
- Redesigned the main search flow around a simpler travel-first experience.
- Added trip context to the assistant.
- Kept the existing checklist generation path intact.

## Next implementation milestones
- Replace model-generated visa facts with a structured verified rules dataset.
- Add duration, residence and existing-visa inputs.
- Add official-source metadata to every rule.
- Add `Where can I go?` destination discovery.
- Add saved travel profile locally.
- Add shareable result URLs/cards.
- Add automated data verification/update jobs.
- Add cloud AI fallback only when WebGPU is unavailable, with clear privacy disclosure.
