import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const allowedPackages=new Set(['react','next/navigation','next/link','lucide-react','zod']);
const seen=new Set();
const proposalFiles=new Set(['src/lib/listings/csv-fields/two-wheeler-proposal.ts','src/lib/listings/csv-fields/proposals/two-wheelers.v1.json']);
function visit(relative,server=false){const file=path.resolve(root,relative);if(!server&&relative.endsWith('catalogues.v1.json'))throw Error('Full catalogue leaked into client graph');if(seen.has(file))return;seen.add(file);if(file.endsWith('.json'))return;const source=fs.readFileSync(file,'utf8').replace(/import\s+type[\s\S]*?;/g,'');if(/import\s*\(|require\s*\(/.test(source))throw Error('Dynamic import requires preview graph review: '+relative);for(const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)){const spec=match[1];if(spec.endsWith('.css'))continue;if(!spec.startsWith('.')&&!spec.startsWith('@/')){if(!allowedPackages.has(spec))throw Error('Unapproved runtime dependency: '+spec);continue;}const base=spec.startsWith('@/')?path.join(root,'src',spec.slice(2)):path.resolve(path.dirname(file),spec);const resolved=['','.tsx','.ts','.mjs'].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());if(!resolved)throw Error('Unresolved import: '+spec);const rel=path.relative(root,resolved).replaceAll('\\','/');if(!rel.startsWith('tools/post-ad-preview/')&&!proposalFiles.has(rel)&&!['src/components/listings/PostAdFlow.tsx','src/components/listings/MacroCategorySelector.tsx','src/components/listings/ListingFormFields.tsx','src/lib/listings/macro-category.ts','src/lib/listings/csv-fields/contract.ts','src/lib/listings/csv-fields/rules.ts','src/lib/listings/csv-fields/catalogue.ts','src/lib/listings/csv-fields/generated/categories.v1.json','src/lib/listings/csv-fields/generated/catalogues.v1.json'].includes(rel))throw Error('Production module outside reviewed UI boundary: '+rel);visit(rel,server);}}
for(const entry of ['tools/post-ad-preview/app/layout.tsx','tools/post-ad-preview/app/page.tsx','tools/post-ad-preview/instrumentation.ts'])visit(entry);
visit('tools/post-ad-preview/app/api/catalogue/route.ts',true);
// Independently walk the real Goods graph without executing any modules.
const goodsSeen=new Set();
function verifyGoods(relative){
 const file=path.resolve(root,relative);if(goodsSeen.has(file))return;goodsSeen.add(file);
 if(proposalFiles.has(relative))throw Error('Proposal overlay entered real Goods graph: '+relative);
 if(file.endsWith('.json'))return;
 const source=fs.readFileSync(file,'utf8').replace(/import\s+type[\s\S]*?;/g,'');
 for(const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)){
  const spec=match[1];if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;if(spec.endsWith('.css'))continue;
  const base=spec.startsWith('@/')?path.join(root,'src',spec.slice(2)):path.resolve(path.dirname(file),spec);
  const resolved=[...['','.tsx','.ts','.mjs','.json'].map(ext=>base+ext),path.join(base,'index.ts'),path.join(base,'index.tsx')].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!resolved)throw Error('Unresolved Goods graph import: '+spec);
  verifyGoods(path.relative(root,resolved).replaceAll('\\','/'));
 }
}
for(const entry of ['src/components/listings/GoodsPostAdEntry.tsx','src/components/listings/ListingForm.tsx','src/app/account/listings/new/page.tsx'])verifyGoods(entry);
console.log('Real Goods import graph PASS: '+goodsSeen.size+' modules; no proposed two-wheeler overlay.');
console.log('Preview runtime import graph PASS: '+seen.size+' local modules; no auth, actions, DB, location service, media, sitemap or production instrumentation.');
