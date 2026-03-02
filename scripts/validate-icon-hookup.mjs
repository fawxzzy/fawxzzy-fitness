import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ICONS_DIR = path.join(ROOT, 'public/exercises/icons');
const CANON = path.join(ROOT, 'supabase/data/global_exercises_canonical.json');
const ALLOWED = new Set(['.png','.svg','.webp']);

function slugify(name){
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g,'-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g,'')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
}

const canon = JSON.parse(await fs.readFile(CANON,'utf8'));
const names = canon.map(e=>e.name);
const slugs = names.map(slugify);
const files = await fs.readdir(ICONS_DIR);
const avail = new Map();
for(const f of files){
  const ext = path.extname(f).toLowerCase();
  if(!ALLOWED.has(ext)) continue;
  const slug = path.basename(f, ext);
  avail.set(slug, f);
}

const missing = [];
const present = [];
slugs.forEach((slug,i)=>{
  if(avail.has(slug)) present.push({name:names[i], slug, file: avail.get(slug)});
  else missing.push({name:names[i], slug});
});

console.log('PRESENT', present.length);
console.log('MISSING', missing.length);
for(const m of missing.slice(0,100)){
  console.log(' -', m.name, '->', `/exercises/icons/${m.slug}.png`);
}
