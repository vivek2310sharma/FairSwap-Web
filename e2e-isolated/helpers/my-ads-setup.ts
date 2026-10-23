import http from 'node:http';

// Synthetic read-only transport. Binding fails if a real local stack owns this port.
export default async function setup() {
  const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const rows=Array.from({length:13},(_,i)=>({id:`ad-${i}`,seller_id:user.id,category_id:'goods',slug:`ad-${i}`,title:`Synthetic Goods ${i}`,status:i===0?'reserved':i<12?'active':'draft',price_type:'fixed',price_paise:12345000,renewal_count:0,revision:1,updated_at:'2026-10-23T00:00:00Z',categories:{name:'Electronics',slug:'electronics'},cities:{name:'Mumbai'},cover_photo_id:null}));
  const server=http.createServer((req,res)=>{
    res.setHeader('content-type','application/json');
    res.setHeader('access-control-allow-origin','*');
    res.setHeader('access-control-allow-headers','*');
    const url=new URL(req.url!,'http://127.0.0.1:54321');
    if(req.method==='OPTIONS'){res.end();return;}
    if(req.method!=='GET'&&req.method!=='HEAD'&&!url.pathname.includes('/rpc/')){res.writeHead(405);res.end();return;}
    if(url.pathname==='/auth/v1/user'){res.end(JSON.stringify(user));return;}
    if(url.pathname.endsWith('/rpc/get_my_listing_counts')){res.writeHead(404);res.end(JSON.stringify({message:'RPC absent'}));return;}
    if(url.pathname.endsWith('/rpc/has_current_policy_acceptance')||url.pathname.endsWith('/rpc/is_listing_publicly_visible')){res.end('true');return;}
    if(url.pathname==='/rest/v1/listings'){
      // Reject any dashboard read missing its authenticated seller predicate.
      if(url.searchParams.get('seller_id')!==`eq.${user.id}`){res.writeHead(403);res.end('{}');return;}
      const statuses=url.searchParams.get('status')?.slice(4,-1).split(',');
      const selected=rows.filter(r=>!statuses||statuses.includes(r.status));
      const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??100);
      res.setHeader('content-range',`*/${selected.length}`);
      res.end(req.method==='HEAD'?undefined:JSON.stringify(selected.slice(offset,offset+limit)));return;
    }
    res.end('[]');
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(54321,'127.0.0.1',resolve);});
  return async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));};
}
