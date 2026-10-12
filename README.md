# French Sirene register API by CompanyData

[![npm](https://img.shields.io/npm/v/@companydata/sirene-api.svg)](https://www.npmjs.com/package/@companydata/sirene-api)

A small, typed TypeScript wrapper for looking up **French company data from the Sirene register (INSEE)**: company names, full street addresses, phone, email, website, size and revenue, through one REST call.

This package is a thin convenience layer over the master [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk). It is the same API and the same key, with the country pinned to France and a register-specific helper on top, so you can write `client.getBySiret("45132133500023")` instead of assembling query parameters by hand.

> One schema, one key. Every CompanyData register wrapper returns records in the same shape, so moving from Sirene to another country's register is a one-line change.

## At a glance

| | |
| --- | --- |
| Country | 🇫🇷 France (`countryCode: "FR"`) |
| Register | French Sirene register |
| Businesses in CompanyData | 14.5M |
| With phone number | 4.05M |
| With email address | 1.52M |
| Lookup key | SIRET (14 digits (SIREN + 5-digit NIC)) |
| Verified example | Carrefour Hypermarches, `45132133500023` |
| Live demo and comparison | [companydata.com/sirene-api](https://companydata.com/sirene-api/) |
| Official register | [api.insee.fr](https://api.insee.fr) |

Counts are from the live API on 2026-10-12 and grow over time.

## What is Sirene?

**Sirene** is the French national register of companies and establishments, maintained by INSEE. Every legal unit gets a 9-digit SIREN and every establishment a 14-digit SIRET. The official API at [api.insee.fr](https://api.insee.fr) is free and returns the legal and administrative record.

What the official Sirene API does **not** give you: no phone number, no email address, no website, no directors' contact details, and a per-minute rate limit that makes pulling a whole segment slow.

**CompanyData adds the missing fields.** 14.5M French businesses with full addresses, phone, email, website, directors and firmographics, filterable and exportable in bulk through one live REST API. Comparison and a live lookup: [companydata.com/sirene-api](https://companydata.com/sirene-api/).

## Installation

```bash
npm install @companydata/sirene-api
```

Get an API key at [app.companydata.com/signup-api](https://app.companydata.com/signup-api). Your first calls are free.

## Quickstart

```ts
import { SireneClient } from "@companydata/sirene-api";

const client = new SireneClient({
  auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! }
});

// Look up one business by its SIRET.
const company = await client.getBySiret("45132133500023"); // Carrefour Hypermarches

// Search with filters (country is always FR here).
const page = await client.search({
  cityName: "PARIS",
  hasEmail: true,
  hasWebsite: true,
  page: 1,
  pageSize: 25
});
console.log(page.totalCount, page.records[0]?.["Company Name"]);
```

> **City and province names are UPPER CASE.** Filter on `cityName: "PARIS"`, not `"Paris"` (which returns 0). The same goes for `provinceName: "ESSONNE"`. List exact names per country with `GET /api/cities`. Full field and filter reference: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

Run the full example against the live API with your key:

```bash
git clone https://github.com/companydatacom/sirene-api && cd sirene-api && npm install
COMPANYDATA_API_KEY=... npm run test:live
```

## What a record looks like

Every record is a flat object with human-readable keys. This is Carrefour Hypermarches as returned by `getBySiret`:

```json
{
  "Company Name": "Carrefour Hypermarches",
  "Trade Name": "CARREFOUR",
  "Company Registration Number": "45132133500023",
  "Address 1": "Zae Saint Guenault",
  "Postal Code": "91000",
  "City": "Évry-courcouronnes",
  "State/Province": "Essonne",
  "Country": "France",
  "Phone Number": "+3*****79",
  "Email": "*****@*****",
  "Website": "traiteur.*****",
  "Founding Year": 2006,
  "Employees Total": 38766,
  "Yearly Revenue in U.S. Dollars": 12447161473,
  "Business Category Code 1 - Description": "Grocery Stores",
  "Business Legal Type - Description": "Corporation"
}
```

**Search is a preview, export is the full record.** `search` (and the lookup helper, which uses it) returns about 20 fields with phone, email and website masked as `*****`, and does not spend credits. `export`, `exportWithScroll` and `iterate` return the full record (about 35 fields, unmasked contact details, SIC and national industry codes, legal status, group structure) and spend one credit per company you have not exported before. Which fields are on a record depends on your key's configuration. See the [field reference](https://companydata.com/api-docs/request-company/) and [plans and credits](https://companydata.com/api-docs/authentication/).

## Methods

| Method | Returns | Does |
| --- | --- | --- |
| `client.search(params)` | `SirenePage` | Search French businesses with filters. |
| `client.getBySiret(id, scope?)` | `CompanyRecord \| null` | Fetch one business by SIRET. `scope` adds extra filters when a number is not unique. |
| `client.export(params)` | `SirenePage` | Export one page of results (standard pagination). |
| `client.exportWithScroll(params)` | `SireneScrollBatch` | One scroll batch (max 50 records). Pass `scrollId` back in for the next. |
| `client.iterate(params, { maxRecords })` | `AsyncGenerator<CompanyRecord>` | Streams every matching record across scroll batches. |
| `client.raw` | `ApiClient` | The underlying master SDK client, for anything not wrapped here. |
| `normalizeSireneId(id)` | `string` | The SIRET normalisation the lookup helper applies. |

```ts
interface SirenePage {
  records: CompanyRecord[];   // flat objects, keys like "Company Name", "City", "Email"
  totalCount: number;         // matches across all pages
  page: number;
  totalPages: number;
  pageSize: number;
}

interface SireneScrollBatch {
  records: CompanyRecord[];
  scrollId: string | null;    // pass back in to get the next batch
  hasMoreRecords: boolean;
  pageSize: number;
}
```

`params` is the master SDK's filter set with `countryCode` removed, because it is always `"FR"` here. For cross-border queries, use the master SDK directly.

### Lookup by SIRET

`getBySiret` takes the 14-digit SIRET of an establishment. Spaces are stripped, so `"451 321 335 00023"` and `"45132133500023"` match the same establishment. The 9-digit SIREN alone is not accepted by the API, see Known limitations.

## Recipes

**Find a company by name, pinned to a city**

```ts
const { records, totalCount } = await client.search({
  search: "Carrefour",
  cityName: "PARIS",
  pageSize: 5
});
```

**Build a segment: companies in a province with 50 or more employees**

```ts
const page = await client.search({
  provinceName: "ESSONNE",
  employeesTotal: { min: 50 },
  hasPhone: true,
  pageSize: 100
});
```

**Stream a whole segment with scroll export**

```ts
for await (const company of client.iterate(
  { cityName: "PARIS", hasEmail: true },
  { maxRecords: 5000 }
)) {
  console.log(company["Company Name"], company["Email"]);
}
```

**Drive the scroll loop yourself**

```ts
let batch = await client.exportWithScroll({ cityName: "PARIS", hasEmail: true, pageSize: 50 });
while (batch.records.length > 0) {
  process(batch.records);
  if (!batch.hasMoreRecords || !batch.scrollId) break;
  batch = await client.exportWithScroll({ cityName: "PARIS", hasEmail: true, scrollId: batch.scrollId, pageSize: 50 });
}
```

**Anything else: drop to the master client**

```ts
const res = await client.raw.company.search({ countryCode: "DE", cityName: "BERLIN", pageSize: 10 });
```

### Common filters

| Filter | Example | Notes |
| --- | --- | --- |
| `search` | `"Carrefour"` | Free text over company and trade names. |
| `nationalId` | `"45132133500023"` | Registration number. The lookup helper sets this for you. |
| `cityName` | `"PARIS"` | UPPER CASE. |
| `provinceName` | `"ESSONNE"` | Admin-2 name, UPPER CASE (the record's `State/Province`). |
| `postalCode` | `"91000"` | Exact match. |
| `hasEmail`, `hasPhone`, `hasWebsite` | `true` | Contact availability. |
| `employeesTotal`, `annualSales`, `foundingYears` | `{ min: 50, max: 500 }` | Range filters. |
| `sic4Digits` | `"7372"` | 4-digit SIC industry code. |

Full list: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

## Known limitations

- The API matches registration numbers on the full 14-digit SIRET. A 9-digit SIREN returns nothing. If you only have a SIREN, use `search` with the company name, or look up the head office SIRET first (usually SIREN + `00001` or the NIC from the Sirene record).

## Four ways to integrate

Pick whichever fits how you build. All four hit the same data behind the same key.

1. **This register SDK** (`@companydata/sirene-api`): French lookups with a Sirene-specific helper. You are here.
2. **Master SDK** ([`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk)): all 200+ countries in one typed client, keyed by `countryCode`.
3. **MCP server**: connect an AI agent (Claude, Cursor and others) to `https://companydata.com/mcp/` with your key in the `x-api-key` header. See [companydata-mcp-server](https://github.com/companydatacom/companydata-mcp-server).
4. **Raw REST**: call `GET https://app.companydata.com/api/company/search?countryCode=FR&cityName=PARIS` with an `x-api-key` header. Contract: [companydata.com/openapi.json](https://companydata.com/openapi.json).

```bash
curl -H "x-api-key: $COMPANYDATA_API_KEY" \
  "https://app.companydata.com/api/company/search?countryCode=FR&nationalId=45132133500023&pageSize=1"
```

## Error handling

Failed requests throw `ApiError` with the HTTP status. The client retries transient failures (429 and 5xx) with backoff before giving up.

```ts
import { ApiError } from "@companydata/sirene-api";

try {
  await client.search({ cityName: "PARIS" });
} catch (err) {
  if (err instanceof ApiError) {
    // 401: bad or missing key, 429: rate limited,
    // "Export credit limit exceeded" (code credits_limit_exceeded): export credits used up
    console.error(err.status, err.message);
  }
}
```

A scroll batch that is larger than your remaining credits is rejected as a whole, so keep `pageSize` small when a key is close to its limit.

## All register wrappers

Same pattern, one per official register. Every wrapper returns the same record shape.

| Country | Register | Package | Lookup helper |
| --- | --- | --- | --- |
| 🇳🇱 Netherlands | KVK | [`@companydata/kvk-api`](https://github.com/companydatacom/kvk-api) | `getByKvkNumber` |
| 🇩🇪 Germany | Handelsregister | [`@companydata/handelsregister-api`](https://github.com/companydatacom/handelsregister-api) | `getByRegistrationNumber` |
| 🇬🇧 United Kingdom | Companies House | [`@companydata/companies-house-api`](https://github.com/companydatacom/companies-house-api) | `getByCompanyNumber` |
| 🇫🇷 France | Sirene | [`@companydata/sirene-api`](https://github.com/companydatacom/sirene-api) | `getBySiret` |
| 🇧🇪 Belgium | KBO/BCE | [`@companydata/kbo-api`](https://github.com/companydatacom/kbo-api) | `getByEnterpriseNumber` |
| 🇵🇱 Poland | KRS | [`@companydata/krs-api`](https://github.com/companydatacom/krs-api) | `getByNip` |
| 🇸🇪 Sweden | Bolagsverket | [`@companydata/bolagsverket-api`](https://github.com/companydatacom/bolagsverket-api) | `getByOrgNumber` |
| 🇨🇭 Switzerland | Zefix | [`@companydata/zefix-api`](https://github.com/companydatacom/zefix-api) | `getByUid` |
| 🇨🇿 Czech Republic | ARES | [`@companydata/ares-api`](https://github.com/companydatacom/ares-api) | `getByIco` |
| 🇩🇰 Denmark | CVR | [`@companydata/cvr-api`](https://github.com/companydatacom/cvr-api) | `getByCvr` |
| 🇧🇷 Brazil | CNPJ | [`@companydata/cnpj-api`](https://github.com/companydatacom/cnpj-api) | `getByCnpj` |
| 🇦🇺 Australia | ABR | [`@companydata/abn-lookup-api`](https://github.com/companydatacom/abn-lookup-api) | `getByAbn` |
| 🇺🇸 United States | SEC EDGAR | [`@companydata/sec-edgar-api`](https://github.com/companydatacom/sec-edgar-api) | `getByRegistrationNumber` |

Plus the master SDK for every other country: [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk).

## License

MIT. Built and maintained by [CompanyData.com](https://companydata.com).
