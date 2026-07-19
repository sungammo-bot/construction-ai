# Byggeplads-AI — MVP-kode

Denne kode implementerer MVP'en fra konceptdokumentet: kamera → snapshot →
AI-analyse (Claude) → Supabase → dashboard på Vercel.

## Hvad er bygget

- **Login** (`/login`) — magic link via e-mail (Supabase Auth), ingen kodeord at holde styr på.
- **Dashboard** (`/`) — liste over dine projekter med dagens status (følger planen / afviger / ingen data endnu).
- **Projektside** (`/projects/[id]`) — viser projektets tidsplan og seneste AI-observationer med billede, med knapper til manuelt at bekræfte/afvise tvivlsomme observationer (jf. konceptdokumentets afsnit om menneskelig bekræftelse).
- **Tidsplan-upload** — indsæt projektets faktiske tidsplan som CSV direkte på projektsiden (jf. afsnit 6.1 i konceptdokumentet — AI'en vurderer op imod *dette specifikke projekts* plan).
- **`POST /api/ingest-snapshot`** — det endpoint n8n/FTP-broen kalder, hver gang kameraet har et nyt billede. Uploader billedet til Supabase Storage, kalder Claude med et struktureret prompt (kun antal + faggruppe, aldrig navn/identitet — se GDPR-afsnittet i konceptdokumentet), og gemmer resultatet.

## Hvad er IKKE bygget endnu (bevidst udeladt fra MVP)

- Notifikationer ved afvigelse (e-mail/Slack) — nævnt i roadmap fase 3, ikke inkluderet her endnu.
- FTP-modtager/bro mellem kameraet og dette API — kameraet (fx Reolink Go PT) sender FTP, ikke et JSON POST-kald direkte. Du skal bruge en lille mellemstation (fx en n8n-flow eller en simpel VPS-tjeneste), der modtager kameraets FTP-upload og kalder `/api/ingest-snapshot` med billedet som base64. Det er beskrevet i konceptdokumentets arkitektur-afsnit.
- Automatisk sammenligning af `matches_plan` med konkrete klokkeslæt/tærskler — AI'en foreslår selv `matches_plan`, men der er ingen serverside-logik, der fx alarmerer, hvis en faggruppe slet ikke er dukket op i løbet af dagen. Godt sted at bygge videre fra efter pilotkørslen.

## Kom i gang lokalt

```bash
npm install
cp .env.example .env.local
# udfyld .env.local — se hvor hver nøgle findes nedenfor
npm run dev
```

### Sådan finder du dine nøgler

- **Supabase URL + anon key + service role key**: i dit Supabase-projekt (nmufxelukboqamknwvpd) → Project Settings → API.
- **ANTHROPIC_API_KEY**: console.anthropic.com → API Keys.
- **INGEST_API_SECRET**: find selv på en lang, tilfældig streng (fx `openssl rand -hex 32`) — brug samme værdi i din n8n-flow.

### Databaseopsætning

Kør `supabase/migrations/0001_init.sql` i Supabase SQL Editor (eller via `supabase db push`, hvis du bruger Supabase CLI). Den opretter alle tabeller, RLS-policies og storage-bucketten `snapshots`.

## Sådan får du koden i dit GitHub-repo og deployet

Du har allerede et tomt (eller næsten tomt) repo på
`github.com/sungammo-bot/construction-ai` forbundet til Vercel, og et
Supabase-projekt forbundet til samme repo. For at få denne kode ind:

1. Klon dit eksisterende repo lokalt: `git clone https://github.com/sungammo-bot/construction-ai.git`
2. Kopiér alle filerne fra denne mappe ind i din klonede repo-mappe (undtagen `node_modules` og `.next`, som ikke skal med — de er allerede i `.gitignore`).
3. `git add . && git commit -m "MVP: dashboard, ingest-API og AI-analyse" && git push origin main`
   (skriv til mig, hvis du bruger en anden branch end `main` — så Vercel-importen peger rigtigt).
4. I Vercel: sæt miljøvariablerne fra `.env.example` under Project Settings → Environment Variables (samme fire som i `.env.local`, plus Supabase-nøglerne).
5. Vercel bygger og deployer automatisk ved push, da repoet allerede er forbundet.

## Test af ingest-endpointet uden et fysisk kamera

Indtil kameraet er sat op, kan du teste hele pipelinen manuelt:

```bash
curl -X POST https://<dit-vercel-domæne>/api/ingest-snapshot \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: <din INGEST_API_SECRET>" \
  -d '{
    "project_id": "<uuid fra projects-tabellen>",
    "captured_at": "2026-07-18T09:00:00Z",
    "media_type": "image/jpeg",
    "image_base64": "<base64 af et testbillede>"
  }'
```

