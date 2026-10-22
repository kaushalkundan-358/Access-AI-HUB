# AccessHub AI Backend

REST API for the AccessHub AI Unified Accessibility Dashboard. It uses Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT authentication, PDF text extraction with OCR fallback, and an OpenAI-compatible AI provider.

## Requirements

- Node.js 20 or later and npm
- PostgreSQL 14 or later
- A PostgreSQL database, for example `accesshub_ai`
- An AI provider API key for simplify/summarize/explain/translate

OCR uses Tesseract.js and PDF.js with `@napi-rs/canvas`. On first OCR use, Tesseract.js may download the configured language data; the runtime needs network access and a writable cache.

## Setup

From the project root (`D:\Access AI HUB`):

```powershell
npm install
Copy-Item .\backend\.env.example .\backend\.env
```

The root `package.json` is an npm workspace that delegates backend scripts to `backend`. You can also run `npm install` and all backend commands from the `backend` directory.

Edit `backend/.env` before starting. Set `DATABASE_URL` to your PostgreSQL connection string and replace `JWT_SECRET` with a random secret of at least 32 characters. Configure `AI_API_KEY` for real AI responses. The default AI endpoint/model use the OpenAI API; `AI_BASE_URL` and `AI_MODEL` can target a compatible provider. If `AI_API_KEY` is empty, AI routes return `503 AI_NOT_CONFIGURED` rather than synthetic results.

## Environment variables

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `4000` | HTTP listen port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string used by Prisma |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Single allowed browser origin |
| `JWT_SECRET` | Yes | — | Signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | No | `1d` | JWT lifetime |
| `UPLOAD_MAX_MB` | No | `10` | Maximum PDF upload size (1-50 MB) |
| `PDF_MAX_PAGES` | No | `30` | Maximum pages processed per PDF |
| `OCR_LANGUAGES` | No | `eng+hin` | Tesseract language codes separated by `+` |
| `AI_API_KEY` | For AI | empty | Provider credential; do not commit it |
| `AI_BASE_URL` | No | OpenAI API | OpenAI-compatible API base URL |
| `AI_MODEL` | No | `gpt-4o-mini` | Provider model identifier |
| `AI_TIMEOUT_MS` | No | `30000` | AI provider timeout |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | API rate-limit window |
| `RATE_LIMIT_MAX` | No | `100` | Requests per client per window |

## Database and commands

Create the database in PostgreSQL, then run:

```powershell
npm run db:migrate -- --name init
npm run dev
```

The development server is `http://localhost:4000`. Useful commands:

```powershell
npm run build
npm start
npm test
npm run typecheck
npm run db:deploy
npm run db:studio
```

Use `npm run db:migrate -- --name <migration-name>` for later schema changes. In production, deploy already-created migrations with `npm run db:deploy`; do not run `migrate dev` in production.

## Authentication

Create an account with `POST /api/users/register` or sign in with `POST /api/users/login`. Both return an `accessToken`. Send it on protected API requests as `Authorization: Bearer <token>`. Passwords are stored as bcrypt hashes. Profiles and documents are scoped to the authenticated account.

## API reference

The OpenAPI 3.0 description is in [`openapi.yaml`](./openapi.yaml). All responses have a `success` property. Success responses also include `message` and `data`; errors include `error.code` and `error.message`.
`GET /api/docs` redirects to the served OpenAPI YAML at `/openapi.yaml`.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | API and database health |
| `POST` | `/api/users/register` | No | Register, return token |
| `POST` | `/api/users/login` | No | Login, return token |
| `GET` | `/api/users/me` | Yes | Current user |
| `POST` | `/api/documents/upload` | Yes | Upload PDF as multipart field `file`, extract text/OCR, save metadata and text |
| `GET` | `/api/documents/:id/text` | Yes | Fetch extracted text for an owned document |
| `POST` | `/api/ai/simplify` | Yes | Simplify text |
| `POST` | `/api/ai/summarize` | Yes | Summarize text |
| `POST` | `/api/ai/explain` | Yes | Explain text, optionally with a `topic` |
| `POST` | `/api/ai/translate` | Yes | Translate to English (`en`) or Hindi (`hi`) |
| `GET` | `/api/profiles` | Yes | List accessibility profiles |
| `POST` | `/api/profiles` | Yes | Create profile |
| `PUT` | `/api/profiles/:id` | Yes | Update profile |
| `DELETE` | `/api/profiles/:id` | Yes | Delete profile |

### Example requests

Register:

```powershell
curl.exe -X POST http://localhost:4000/api/users/register `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"reader@example.com\",\"password\":\"A-long-password-123\"}"
```

Simplify text (replace the token):

```powershell
curl.exe -X POST http://localhost:4000/api/ai/simplify `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"The policy was implemented subsequent to the review.\"}"
```

Translate to Hindi:

```powershell
curl.exe -X POST http://localhost:4000/api/ai/translate `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"Welcome to AccessHub AI.\",\"targetLanguage\":\"hi\"}"
```

Create a profile:

```powershell
curl.exe -X POST http://localhost:4000/api/profiles `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Large text\",\"fontSize\":\"large\",\"contrastMode\":\"high\",\"preferredLanguage\":\"en\",\"readingPreferences\":{\"lineSpacing\":1.5}}"
```

Upload a PDF:

```powershell
curl.exe -X POST http://localhost:4000/api/documents/upload `
  -H "Authorization: Bearer <token>" `
  -F "file=@C:\path\to\document.pdf"
```

## Operational notes

- Uploaded bytes are checked for the PDF signature and parsed as PDF; MIME type and `.pdf` extension are also required. Files are randomly named in `uploads/temp/` and removed after each processing attempt. Only extracted text and document metadata are retained in PostgreSQL.
- PDF size and page count are bounded. OCR runs only when embedded text is effectively absent; scans are rendered page-by-page and sent to Tesseract.js.
- AI inputs are limited to 20,000 characters. Provider errors are reported as `502`; absent credentials are reported as `503`.
- Submitted text is sent to the configured AI provider for the requested operation. Review that provider's data-handling terms before using sensitive documents.
- Helmet, restrictive CORS, JSON/form body limits, and a global IP-based rate limit are enabled. Set the production frontend origin explicitly.
- No account recovery, email verification, token revocation, or multi-factor authentication is implemented. Configure TLS and secret management at the deployment layer.
