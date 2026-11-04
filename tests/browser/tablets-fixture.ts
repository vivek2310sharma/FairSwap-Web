import {expect,type Page} from "@playwright/test";
import sharp from "sharp";
import {randomUUID} from "node:crypto";
const city="55555555-5555-4555-8555-555555555555",locality="66666666-6666-4666-8666-666666666666";
export async function api(page: Page, options: {capacity?:boolean;loseCreateResponse?:boolean;rotation?:boolean;loseClaimResponse?:boolean;accessorySuccess?:boolean} = {}) {
    let fail = true;
    let submit = 0;
    const media = new Map<string, {
        id: string;
        state: string;
        url: string;
        session_id: string;
    }>();
    const sessions: string[] = [];
    const calls:{id:string;operation:string}[]=[];
    const emptyRequests=new Map<string,string>();
    const active = new Map<string,{id:string;state:string;created_at:string;expires_at:string;can_abandon:boolean;draft_protected:boolean;can_rotate:boolean}>();
    const entry=(id:string,can_abandon=true)=>({id,state:'open',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString(),can_abandon,draft_protected:true,can_rotate:false});
    if(options.capacity||options.rotation) for(let i=1;i<=5;i++){const id=`90000000-0000-4000-8000-${String(i).padStart(12,'0')}`;const value=entry(id,i<5);value.created_at=new Date(Date.now()-(6-i)*60000).toISOString();if(options.rotation&&(i===1||i===3)){value.draft_protected=false;value.can_rotate=true;}active.set(id,value);}
    let lose=!!options.loseCreateResponse;let loseClaim=!!options.loseClaimResponse;
    let releases=0;
    const activeCount=()=>[...active.values()].filter(s=>s.state==='open'||s.state==='finalizing').length;
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#08704a' } }).png().toBuffer();
    const pixel = 'data:image/png;base64,' + bytes.toString('base64');
    await page.context().route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname.startsWith('/api/location/pincode/'))
            return route.fulfill({ json: { success: true, state: 'Karnataka', district: 'Bengaluru', city_id: city, districts: [{ name: 'Bengaluru', city_id: city }], localities: [{ id: locality, name: 'Koramangala', city_id: city, district: 'Bengaluru' }] } });
        if (url.pathname === '/api/post-ad/tablets/sessions') {
            if(req.method()==='GET'&&url.searchParams.has('session_id'))return route.fulfill({json:{session:active.get(url.searchParams.get('session_id')!),media:[]}});
            if(req.method()==='GET') return route.fulfill({json:{limit:5,sessions:[...active.values()].filter(s=>s.state==='open'||s.state==='finalizing')}});
            const requested=req.postDataJSON().session_id;
            const operation=req.postDataJSON().operation??"create";
            const id=operation==="create_empty"?(active.has(requested)?requested:emptyRequests.get(requested)??randomUUID()):operation==="acquire_draft"&&!active.has(requested)?(emptyRequests.get(requested)??requested):requested;
            if(req.method()==='DELETE') {
                releases++;const current=active.get(id);
                if(!current?.can_abandon||current.state!=='open') return route.fulfill({status:409,json:{code:'UPLOAD_SESSION_PROTECTED'}});
                current.state='expired';return route.fulfill({json:{session:current,media:[]}});
            }
            calls.push({id:requested,operation});
            if(operation==='claim_draft'||(operation==='acquire_draft'&&id!==requested)){
                const current=active.get(id);
                if(!current)return route.fulfill({status:503,json:{code:'UPLOAD_SESSION_UNAVAILABLE'}});
                if(current.state==='expired')return route.fulfill({status:410,json:{code:'UPLOAD_SESSION_EXPIRED'}});
                current.draft_protected=true;current.can_rotate=false;
                if(loseClaim){loseClaim=false;return route.fulfill({status:503,json:{code:'UPLOAD_SESSION_UNAVAILABLE'}});}
                return route.fulfill({json:{session:current,media:[]}});
            }
            sessions.push(id);
            if(!active.has(id)&&activeCount()>=5) {
                const blank=[...active.values()].filter(s=>s.state==='open'&&s.can_rotate&&!s.draft_protected&&s.can_abandon).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))[0];
                if(!blank)return route.fulfill({status:429,json:{code:'UPLOAD_SESSION_LIMIT'}});
                blank.state='expired';
            }
            if(!active.has(id)){
                const value=entry(id);if(operation==='create_empty'){value.draft_protected=false;value.can_rotate=true;emptyRequests.set(requested,id);}
                active.set(id,value);
            }
            const current=active.get(id)!;
            if(operation!=="create_empty"||id===requested){current.draft_protected=true;current.can_rotate=false;}
            if(current.state==='expired')return route.fulfill({status:410,json:{code:'UPLOAD_SESSION_EXPIRED'}});
            if(lose){lose=false;return route.fulfill({status:503,json:{code:'UPLOAD_SESSION_UNAVAILABLE'}});}
            return route.fulfill({ json: { session: current, media: [] } });
        }
        if (url.pathname.endsWith('/media')) {
            const sessionId=url.pathname.split('/')[4]; const current=active.get(sessionId);
            if(!current)return route.fulfill({status:503,json:{code:'UPLOAD_SESSION_UNAVAILABLE'}});
            if(current.state==='expired')return route.fulfill({status:410,json:{code:'UPLOAD_SESSION_EXPIRED'}});
            if (req.method() === 'POST') {
                const form = await new Request(req.url(), { method: 'POST', headers: req.headers(), body: new Uint8Array(req.postDataBuffer() ?? []) }).formData();
                expect((form.get('file') as File).type).toBe('image/webp');
                const id = String(form.get('media_id'));
                if (fail) {
                    fail = false;
                    return route.fulfill({ status: 503, json: { error: 'Temporary upload failure' } });
                }
                media.set(id, { id, state: 'ready', url: pixel, session_id:sessionId }); current.can_abandon=false;
            }
            if (req.method() === 'DELETE')
                media.delete(req.postDataJSON().media_id);
            return route.fulfill({ json: { session: current, media: [...media.values()].filter(m=>m.session_id===sessionId) } });
        }
        if (url.pathname === '/api/post-ad/tablets/submit') {
            submit++;
            const payload = req.postDataJSON();
            expect(payload.media_ids).toHaveLength(1);
            expect(media.has(payload.media_ids[0])).toBe(true);
            expect(payload.selection).toEqual({category:'mobiles',subcategory:'tablets',version:1});
            await new Promise(r=>setTimeout(r,200));
            return route.fulfill({json:{success:true,listing_id:'77777777-7777-4777-8777-777777777777'}});
            return route.fulfill({ status: 400, json: { error: 'Fixture rejected submission; details retained' } });
        }
        return route.fulfill({ status: 503, json: { error: 'Unmocked local API' } });
    });
    return { media, sessions, calls, session:(id:string)=>active.get(id), activeCount, retired:()=>[...active.values()].filter(s=>s.state==="expired").map(s=>s.id), releases:()=>releases, protect:(id:string)=>{active.get(id)!.can_abandon=false;active.get(id)!.draft_protected=true;active.get(id)!.can_rotate=false;}, expire:(id:string)=>{active.get(id)!.state="expired";}, submits: () => submit, pixel };
}
