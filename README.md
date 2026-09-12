# VisaCraft V1

A focused prototype of the next VisaCraft direction:

**structured visa requirements → document intake → AI application review**

### What V1 does

- Australia Visitor Visa as the initial deterministic requirement set
- Applicant profile
- Multi-document upload
- Filename-based document classification
- AI-generated application readiness score
- AI gap/consistency review
- Server-side OpenAI API call (API key is never exposed to the browser)

### What V1 deliberately does not do

- Predict visa approval
- Treat an LLM as the immigration rules database
- Claim legal advice
- Reliably OCR arbitrary PDFs yet

### Run

```bash
npm install
cp .env.example .env.local
# add OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000

### Next step

Replace filename classification with a document-ingestion pipeline:
PDF/image -> OCR -> structured fields -> requirement matching -> cross-document consistency graph.
