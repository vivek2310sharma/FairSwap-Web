// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { checkoutRelease, validateDeployment, verifyDeployment } from '../../tools/ads01-release-authority.mjs';

const sha='a3ebb1ab6f84a642c91a1aff47b2b132d26a43ac';
const host='fairswap-immutable-fixture-fairswap.vercel.app';
const deployment=()=>({id:'dpl_fixture',url:host,projectId:'prj_mapIxQi99X2TDre2UuCVf4VsAjvn',
  team:{id:'team_Fk8MZq6cxDXPS4ViXloT6AZW'},readyState:'READY',target:null,
  meta:{githubCommitSha:sha,githubOrg:'vivek2310sharma',githubRepo:'FairSwap-Web'},
  gitSource:{type:'github',sha}});
afterEach(()=>vi.unstubAllGlobals());

it('derives the full candidate from the repository rather than an environment SHA',()=>{
  expect(checkoutRelease()).toMatch(/^[a-f0-9]{40}$/);
});
it('accepts complete matching metadata',()=>expect(()=>validateDeployment(deployment(),host,sha)).not.toThrow());
it.each([
  {projectId:'prj_wrong'}, {team:{id:'team_wrong'}}, {target:'production'}, {readyState:'ERROR'},
  {url:'movable-alias.vercel.app'}, {id:undefined}, {gitSource:{type:'github',sha:'b'.repeat(40)}},
  {meta:{githubCommitSha:'b'.repeat(40),githubOrg:'vivek2310sharma',githubRepo:'FairSwap-Web'}},
  {meta:{githubCommitSha:sha,githubOrg:'attacker',githubRepo:'FairSwap-Web'}},
  {meta:{githubCommitSha:sha,githubOrg:'vivek2310sharma',githubRepo:'other'}},
  {gitSource:undefined},
])('rejects mismatching or missing independent deployment metadata %j',change=>{
  expect(()=>validateDeployment({...deployment(),...change},host,sha)).toThrow('Release authority check failed');
});
it('rejects shortened candidate SHAs',()=>expect(()=>validateDeployment(deployment(),host,sha.slice(0,7))).toThrow());
it('reads only authenticated fixed-origin metadata, rejects redirects and bounds request time',async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>deployment()});vi.stubGlobal('fetch',fetcher);
  await verifyDeployment(host,sha,'private-vercel-token');
  const [url,options]=fetcher.mock.calls[0];
  expect(url.origin).toBe('https://api.vercel.com');
  expect(url.pathname).toBe(`/v13/deployments/${host}`);
  expect(url.searchParams.get('teamId')).toBe('team_Fk8MZq6cxDXPS4ViXloT6AZW');
  expect(url.searchParams.get('withGitRepoInfo')).toBe('true');
  expect(options).toMatchObject({method:'GET',redirect:'error',headers:{Authorization:'Bearer private-vercel-token'}});
  expect(options.signal).toBeDefined();
});
it('fails closed on denied metadata access',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
  await expect(verifyDeployment(host,sha,'private-vercel-token')).rejects.toThrow();
});
it('fails closed on network failure or malformed metadata',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('private transport details')));
  await expect(verifyDeployment(host,sha,'private-vercel-token')).rejects.toThrow();
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({})}));
  await expect(verifyDeployment(host,sha,'private-vercel-token')).rejects.toThrow();
});
it('does not request metadata without authentication',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(verifyDeployment(host,sha,'')).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
