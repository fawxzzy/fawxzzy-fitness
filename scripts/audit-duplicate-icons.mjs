import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ICONS_DIR = path.resolve(process.cwd(), 'public/exercises/icons');
const exts = new Set(['.png', '.webp', '.svg']);

function sha1(buf){ const h=createHash('sha1'); h.update(buf); return h.digest('hex'); }
function compactSlug(s){ return s.toLowerCase().replace(/[-_\s]/g,'').replace(/\.(png|svg|webp)$/,''); }
function baseSlug(s){ return s.toLowerCase().replace(/\.(png|svg|webp)$/,''); }

function levenshtein(a,b){
  const m=a.length,n=b.length; const dp=Array.from({length:m+1},(_,i)=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

const files = (await fs.readdir(ICONS_DIR)).filter(f=>exts.has(path.extname(f).toLowerCase()));
const byHash = new Map();
const hashes = {};
for(const f of files){
  const buf = await fs.readFile(path.join(ICONS_DIR,f));
  const h = sha1(buf);
  if(!byHash.has(h)) byHash.set(h,[]);
  byHash.get(h).push(f);
  hashes[f]=h;
}

const exactDuplicates = [...byHash.values()].filter(group=>group.length>1);

// Compact-collision groups (hyphens/underscores/space ignored)
const byCompact = new Map();
for(const f of files){
  const key = compactSlug(f);
  if(!byCompact.has(key)) byCompact.set(key,[]);
  byCompact.get(key).push(f);
}
const compactGroups = [...byCompact.entries()].filter(([_,g])=>g.length>1);

// Name-similar pairs by Levenshtein distance <= 2 (on base slug w/o extension)
const similarPairs = [];
for(let i=0;i<files.length;i++){
  for(let j=i+1;j<files.length;j++){
    const a = baseSlug(files[i]);
    const b = baseSlug(files[j]);
    const d = levenshtein(a,b);
    if(d>0 && d<=2) similarPairs.push({a: files[i], b: files[j], d});
  }
}

// Summarize
console.log('EXACT_DUPLICATES');
for(const g of exactDuplicates){ console.log(' - '+g.join(' | ')); }
console.log('COMPACT_NAME_COLLISIONS');
for(const [k,g] of compactGroups){ console.log(` - ${k}: ${g.join(' | ')}`); }
console.log('SIMILAR_NAME_PAIRS');
for(const p of similarPairs.slice(0,200)){ console.log(` - (d=${p.d}) ${p.a} <> ${p.b}`); }
