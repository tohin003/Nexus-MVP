#!/usr/bin/env node
/** Applies scripts/schema.sql to the Neon database. DATABASE_URL from env or Vercel. */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

async function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const token = readFileSync('.env.vercel', 'utf8').match(/^VERCEL_TOKEN=(.+)$/m)?.[1];
    if (!token) throw new Error('no token');
    const res = await fetch('https://api.vercel.com/v9/projects/prj_3s4pHLMzKc007WfJJ36fXf4HStZJ/env?teamId=team_N5idOJlO1oMP54wXhPZsaDQM', { headers: { Authorization: `Bearer ${token}` } });
    const { envs } = await res.json();
    const row = envs.find(e => e.key === 'DATABASE_URL');
    const detail = await (await fetch(`https://api.vercel.com/v1/projects/prj_3s4pHLMzKc007WfJJ36fXf4HStZJ/env/${row.id}?teamId=team_N5idOJlO1oMP54wXhPZsaDQM`, { headers: { Authorization: `Bearer ${token}` } })).json();
    if (!detail.value) throw new Error('DATABASE_URL not readable from Vercel');
    return detail.value;
  } catch (error) {
    console.error('Set DATABASE_URL locally or make it readable: ', error.message);
    process.exit(1);
  }
}

const client = new Client({ connectionString: await resolveUrl() });
await client.connect();
const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
try {
  await client.query(sql);
  const { rows } = await client.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log('migration OK — tables:', rows.map(r => r.table_name).join(', '));
} finally { await client.end(); }
