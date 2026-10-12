/** Run: COMPANYDATA_API_KEY=... npx tsx examples/quickstart.ts */
import { SireneClient } from "../src/index";

const client = new SireneClient({ auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! } });

const company = await client.getBySiren("552100554");
console.log("By SIREN:", company);

const page = await client.search({ cityName: "Paris", hasEmail: true, pageSize: 25 });
console.log("Search:", page.data);
