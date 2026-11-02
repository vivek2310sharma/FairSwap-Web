import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
const city = "55555555-5555-4555-8555-555555555555", locality = "66666666-6666-4666-8666-666666666666";
async function api(page: Page, options: {capacity?:boolean;loseCreateResponse?:boolean;rotation?:boolean} = {}) {
    let fail = true;
    let submit = 0;
    const media = new Map<string, {
        id: string;
        state: string;
        url: string;
        session_id: string;
    }>();
    const sessions: string[] = [];
    const active = new Map<string,{id:string;state:string;created_at:string;expires_at:string;can_abandon:boolean;draft_protected:boolean;can_rotate:boolean}>();
    const entry=(id:string,can_abandon=true)=>({id,state:'open',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString(),can_abandon,draft_protected:true,can_rotate:false});
    if(options.capacity||options.rotation) for(let i=1;i<=5;i++){const id=`90000000-0000-4000-8000-${String(i).padStart(12,'0')}`;const value=entry(id,i<5);value.created_at=new Date(Date.now()-(6-i)*60000).toISOString();if(options.rotation&&(i===1||i===3)){value.draft_protected=false;value.can_rotate=true;}active.set(id,value);}
    let lose=!!options.loseCreateResponse;
    let releases=0;
    const activeCount=()=>[...active.values()].filter(s=>s.state==='open'||s.state==='finalizing').length;
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#08704a' } }).png().toBuffer();
    const pixel = 'data:image/png;base64,' + bytes.toString('base64');
    await page.context().route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname.startsWith('/api/location/pincode/'))
            return route.fulfill({ json: { success: true, state: 'Karnataka', district: 'Bengaluru', city_id: city, districts: [{ name: 'Bengaluru', city_id: city }], localities: [{ id: locality, name: 'Koramangala', city_id: city, district: 'Bengaluru' }] } });
        if (url.pathname === '/api/post-ad/sessions') {
            if(req.method()==='GET') return route.fulfill({json:{limit:5,sessions:[...active.values()].filter(s=>s.state==='open'||s.state==='finalizing')}});
            const id=req.postDataJSON().session_id;
            if(req.method()==='DELETE') {
                releases++;const current=active.get(id);
                if(!current?.can_abandon||current.state!=='open') return route.fulfill({status:409,json:{code:'UPLOAD_SESSION_PROTECTED'}});
                current.state='expired';return route.fulfill({json:{session:current,media:[]}});
            }
            sessions.push(id);
            if(!active.has(id)&&activeCount()>=5) {
                const blank=[...active.values()].filter(s=>s.state==='open'&&s.can_rotate&&!s.draft_protected&&s.can_abandon).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))[0];
                if(!blank)return route.fulfill({status:429,json:{code:'UPLOAD_SESSION_LIMIT'}});
                blank.state='expired';
            }
            if(!active.has(id))active.set(id,entry(id));
            const current=active.get(id)!;
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
        if (url.pathname === '/api/post-ad/submit') {
            submit++;
            const payload = req.postDataJSON();
            expect(payload.media_ids).toHaveLength(1);
            expect(media.has(payload.media_ids[0])).toBe(true);
            expect(payload.selection).toEqual({ category: 'mobiles', subcategory: 'mobile-phones', version: 2 });
            return route.fulfill({ status: 400, json: { error: 'Fixture rejected submission; details retained' } });
        }
        return route.fulfill({ status: 503, json: { error: 'Unmocked local API' } });
    });
    return { media, sessions, activeCount, retired:()=>[...active.values()].filter(s=>s.state==="expired").map(s=>s.id), releases:()=>releases, protect:(id:string)=>{active.get(id)!.can_abandon=false;active.get(id)!.draft_protected=true;active.get(id)!.can_rotate=false;}, expire:(id:string)=>{active.get(id)!.state="expired";}, submits: () => submit, pixel };
}
async function choose(page: Page, label: string, text: string) {
 const input=page.getByRole('combobox',{name:label,exact:true});
 await input.fill(text);
 await expect(input).toHaveAttribute('aria-expanded','true');
 await input.press('ArrowDown');
 await expect(input).toHaveAttribute('aria-activedescendant',/.+/);
 await input.press('Enter');
 await expect(input).not.toHaveValue('');
}

async function resize(page: Page, width: number) {
    await page.setViewportSize({width,height:1000});
    await expect.poll(()=>page.locator('main').evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft))).toBe(width<=700?16:20);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function lockedStepsStayQuiet(page: Page) {
    const active=page.getByRole('button',{name:'Step 1: Photos',exact:true});
    await active.focus(); await page.evaluate(()=>scrollTo(0,0));
    const before=await page.locator('ol[aria-label="Posting steps"]').boundingBox();
    const card=await page.locator('#mobile-media_ids').boundingBox();
    const initialAlerts=await page.locator('main').getByRole('alert').allTextContents();
    for (let repeat=0;repeat<3;repeat++) for (const name of ['Step 2: Phone details','Step 3: Condition','Step 4: Price','Step 5: Location']) {
        const locked=page.getByRole('button',{name,exact:true}); await expect(locked).toBeDisabled();
        const box=await locked.boundingBox(); await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);
        await locked.evaluate(el=>{(el as HTMLButtonElement).focus();(el as HTMLButtonElement).click();});
        await expect(locked).not.toBeFocused();
        await locked.dispatchEvent('click');
        await locked.dispatchEvent('keydown',{key:'Enter'}); await locked.dispatchEvent('keydown',{key:' '});
        await active.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    }
    await active.focus(); await page.keyboard.press('Tab');
    await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeFocused();
    await expect(active).toHaveAttribute('aria-current','step');
    expect(await page.locator('main').getByRole('alert').allTextContents()).toEqual(initialAlerts);
    const after=await page.locator('ol[aria-label="Posting steps"]').boundingBox();
    const afterCard=await page.locator('#mobile-media_ids').boundingBox();
    expect(after).toEqual(before); expect(afterCard).toEqual(card);
    expect(await page.evaluate(()=>scrollY)).toBe(0);
}
const wizardBoxes = new WeakMap<Page, Map<number, {x:number;y:number;width:number}>>();
async function stableWizardLayout(page: Page, originalWidth: number) {
    for (const width of [360, 390, 768, 1024, 1440]) {
        await resize(page,width);
        await page.evaluate(() => scrollTo(0,0));
        const before = await page.locator('ol[aria-label="Posting steps"]').boundingBox();
        // An attempted invalid forward jump may add errors; align against the shared main scaffold.
        const main = await page.locator('main').boundingBox();
        let boxes=wizardBoxes.get(page); if(!boxes) {boxes=new Map();wizardBoxes.set(page,boxes);}
        const previous=boxes.get(width);
        if(previous) {
            expect(Math.abs(before!.x-previous.x)).toBeLessThan(1);
            expect(Math.abs(before!.y-previous.y)).toBeLessThan(1);
            expect(Math.abs(before!.width-previous.width)).toBeLessThan(1);
        } else boxes.set(width,{x:before!.x,y:before!.y,width:before!.width});
        expect(main!.width).toBeGreaterThan(width < 701 ? width - 40 : Math.min(width - 80,1000));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const footer = await page.locator('footer').last().boundingBox();
        expect(Math.abs(footer!.y + footer!.height - 1000)).toBeLessThan(2);
        expect(before!.x).toBeGreaterThanOrEqual(main!.x);
    }
    await resize(page,originalWidth);
}

for (const theme of ['light', 'dark'] as const)
    for (const width of [390, 1440])
        test(`${theme}/${width}: real route components, upload lifecycle and review boundaries`, async ({ page }) => { await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 1000 }); const fixture = await api(page); const faults: string[] = []; page.on('pageerror', e => faults.push(e.message)); await page.route('https://**/*', route => route.abort()); await page.goto('/account/listings/new'); await expect(page).toHaveTitle('Post an ad | FairSwap.in'); await expect(page.getByRole('navigation', { name: 'Account navigation', exact: true })).toHaveCount(0); await expect(page.getByRole('navigation', { name: 'Mobile bottom navigation' })).toHaveCount(0); await page.getByRole('button', { name: /^Mobiles & Tablets/ }).click(); if (width === 390) {
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.getByRole('button', { name: /^Mobiles & Tablets/ })).toBeFocused();
            await page.getByRole('button', { name: /^Mobiles & Tablets/ }).click();
        } await page.getByRole('link', { name: 'Mobile Phones', exact: true }).click(); await expect(page).toHaveURL(/posting=mobile-phones/); await expect(page.getByRole('button', { name: 'Add photos', exact: true })).toBeVisible(); await lockedStepsStayQuiet(page); await expect(page.getByRole('button', {name:'Continue',exact:true})).toBeDisabled(); await expect(page.getByRole('button',{name:'Step 1: Photos'})).toHaveAttribute('data-complete','false'); await page.getByLabel('Choose photo files', { exact: true }).setInputFiles({ name: 'phone.png', mimeType: 'image/png', buffer: Buffer.from(fixture.pixel.split(',')[1], 'base64') }); await expect(page.getByText('Cover · Ready to upload', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Upload / retry photos', exact: true }).click(); await expect(page.getByText('Temporary upload failure', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Upload / retry photos', exact: true }).click(); await expect(page.getByText('Cover · Ready', { exact: true })).toBeVisible(); await stableWizardLayout(page,width); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('button', {name:'Continue',exact:true}).click(); await expect(page.getByRole('combobox',{name:'Brand',exact:true})).toBeFocused(); await expect(page.getByRole('combobox', { name: 'Brand', exact: true })).toHaveValue(''); await stableWizardLayout(page,width); await choose(page, 'Brand', 'Apple'); await choose(page, 'Model', 'iPhone'); await page.getByRole('combobox', { name: 'Storage', exact: true }).selectOption('128 GB'); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await stableWizardLayout(page,width); await page.getByRole('button', { name: 'Good condition', exact: true }).click(); await page.getByLabel('Description', { exact: true }).fill('Used carefully with no repairs. Original box included.'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Apple iPhone 15 · 128 GB · Good condition'); await page.getByLabel('Title', { exact: true }).fill('My carefully used phone'); await page.getByRole('button', { name: 'Like new', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My carefully used phone'); await page.getByRole('button', { name: 'Use automatically generated title' }).click(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await stableWizardLayout(page,width); await page.getByLabel('Price (₹)', { exact: true }).fill('125000'); await expect(page.getByText('₹1,25,000', { exact: true }).first()).toBeVisible(); await page.getByRole('switch', { name: 'Negotiable' }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('switch', { name: 'Negotiable' })).toHaveAttribute('aria-checked', 'true'); await page.waitForTimeout(450); const session = fixture.sessions[0]; await page.reload(); await expect(page.getByRole('button', { name: 'Resume saved listing' })).toBeVisible(); expect(fixture.sessions).toHaveLength(1); await page.waitForTimeout(450); expect(fixture.sessions).toHaveLength(1); await page.getByRole('button', { name: 'Resume saved listing' }).click(); await expect(page.getByLabel('Price (₹)', { exact: true })).toHaveValue('125000'); expect(fixture.sessions.at(-1)).toBe(session); await expect(page.getByRole('button',{name:'Step 1: Photos'})).toHaveAttribute('aria-current','step'); await page.getByRole('button',{name:'Step 4: Price'}).click(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await stableWizardLayout(page,width); await page.getByLabel('PIN code *', { exact: true }).fill('560034'); await expect(page.getByLabel('Area / Locality *', { exact: true })).toHaveValue(locality); await page.getByRole('button', { name: 'Review listing', exact: true }).click(); await expect(page.getByRole('complementary', { name: 'Buyer preview', exact: true })).toHaveCount(1); await expect(page.getByRole('complementary', { name: 'Buyer preview', exact: true })).toBeVisible(); await expect(page.locator('ol[aria-label="Posting steps"] button[data-complete="true"]')).toHaveCount(5); await stableWizardLayout(page,width); await page.getByRole('button', { name: 'Submit for review', exact: true }).click(); await expect(page.getByText('Fixture rejected submission; details retained')).toBeVisible(); expect(fixture.submits()).toBe(1); expect(faults).toEqual([]); });
test('blank wizard blocks jumps across requested viewports, labels and semantic colors', async ({ page }) => { await api(page); await page.goto('/account/listings/new'); for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator('body')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
} await page.goto('/account/listings/new?posting=mobile-phones'); for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await resize(page,width); await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeVisible(); await lockedStepsStayQuiet(page);
        for (let i = 0; i < 5; i++) {
            await page.getByRole('button', { name: `Step ${i + 1}: ${['Photos', 'Phone details', 'Condition', 'Price', 'Location'][i]}`, exact: true }).dispatchEvent('click');
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            expect(await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(es => es.every(e => parseFloat(getComputedStyle(e).fontSize) >= 16))).toBe(true);
 const audit=await page.locator('main').evaluate(root=>{
  const controls=[...root.querySelectorAll<HTMLInputElement>('input:not([type=hidden]),select,textarea')];
  const unnamed=controls.filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).length;
  const broken=[...root.querySelectorAll('[aria-controls],[aria-labelledby],[aria-describedby],[aria-activedescendant]')].filter(e=>['aria-controls','aria-labelledby','aria-describedby','aria-activedescendant'].some(a=>(e.getAttribute(a)||'').split(' ').filter(Boolean).some(id=>!document.getElementById(id)))).length;
  const ids=[...root.querySelectorAll('[id]')].map(e=>e.id);
  const primary=[...root.querySelectorAll('footer button')].at(-1)!;
  return {unnamed,broken,unique:ids.length===new Set(ids).size,primaryHeight:primary.getBoundingClientRect().height};
 });expect(audit.unnamed).toBe(0);expect(audit.broken).toBe(0);expect(audit.unique).toBe(true);expect(audit.primaryHeight).toBeGreaterThanOrEqual(48);

        }
    }
    const ratios = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); const l = (name: string) => { const h = s.getPropertyValue(name).trim().replace('#', ''); const a = h.match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }; return [['--color-foreground', '--color-card'], ['--color-muted', '--color-background'], ['--fs-primary', '--fs-on-primary'], ['--fs-link', '--color-card']].map(([a, b]) => (Math.max(l(a), l(b)) + .05) / (Math.min(l(a), l(b)) + .05)); });
    expect(ratios.every(v => v >= 4.5)).toBe(true);
} });

test('category search keeps its top anchor, width and result scaffold', async ({page}) => {
    await api(page); await page.goto('/account/listings/new');
    for(const theme of ['light','dark'] as const) {
        await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
        for(const width of [360,390,768,1024,1440]) {
            await resize(page,width);
            const search=page.getByRole('searchbox',{name:'Search categories'});
            await search.fill(''); await page.evaluate(()=>scrollTo(0,0));
            const baseline=await search.boundingBox();
            const heading=await page.getByRole('heading',{level:1}).boundingBox();
            for(const query of ['ip','iph','zzzz-no-category','']) {
                await search.fill(query); await page.evaluate(()=>scrollTo(0,0));
                const box=await search.boundingBox(); const h=await page.getByRole('heading',{level:1}).boundingBox();
                expect(Math.abs(box!.x-baseline!.x)).toBeLessThan(1);
                expect(Math.abs(box!.y-baseline!.y)).toBeLessThan(1);
                expect(Math.abs(box!.width-baseline!.width)).toBeLessThan(1);
                expect(Math.abs(h!.y-heading!.y)).toBeLessThan(1);
                if(query.startsWith('ip')) {
                    const results=await page.locator('[aria-live="polite"] ul').first().boundingBox();
                    expect(results!.x, JSON.stringify({width,query,box,results})).toBeCloseTo(box!.x,0);
                    expect(results!.width).toBeGreaterThanOrEqual(box!.width-1);
                } else if(query) await expect(page.getByRole('status')).toContainText('No categories match');
                else await expect(page.getByRole('button',{name:/^Mobiles & Tablets/})).toBeVisible();
                expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
            }
        }
    }
});

test('outdated saved Review step cannot bypass missing required fields', async ({page}) => {
 const fixture=await api(page); await page.goto('/account/listings/new?posting=mobile-phones');
 await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();
 await page.waitForTimeout(450);
 await page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{const request=indexedDB.open('fairswap-posting-v2',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{
   const db=request.result;const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');const key='11111111-1111-4111-8111-111111111111';const get=store.get(key);
   get.onsuccess=()=>store.put({...get.result,step:5},key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
  };});
 });
 await page.reload(); await page.getByRole('button',{name:'Resume saved listing'}).click();
 await expect(page.getByRole('button',{name:'Step 1: Photos'})).toHaveAttribute('aria-current','step');
 await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();
 await lockedStepsStayQuiet(page);
 await expect(page.locator('ol[aria-label="Posting steps"] button[data-complete="true"]')).toHaveCount(0);
 expect(fixture.submits()).toBe(0);
});

async function selectFixturePhoto(page:Page,pixel:string) {
 await page.getByLabel('Choose photo files',{exact:true}).setInputFiles({name:'phone.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});
 await expect(page.getByText('Cover · Ready to upload',{exact:true})).toBeVisible();
}
async function uploadWithFixtureRetry(page:Page) {
 await page.getByRole('button',{name:'Upload / retry photos',exact:true}).click();
 await expect(page.getByText('Temporary upload failure',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Upload / retry photos',exact:true}).click();
 await expect(page.getByText('Cover · Ready',{exact:true})).toBeVisible();
}
test('visits, repeated tabs and local photo selection allocate no sessions',async({page,context})=>{
 const fixture=await api(page);await page.goto('/account/listings/new?posting=mobile-phones');
 await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 const second=await context.newPage();await second.goto('/account/listings/new?posting=mobile-phones');
 await second.getByRole('button',{name:'Resume saved listing'}).or(second.getByRole('button',{name:'Add photos',exact:true})).first().waitFor({state:'visible'});
 if(await second.getByRole('button',{name:'Resume saved listing'}).isVisible()) await second.getByRole('button',{name:'Resume saved listing'}).click();
 await expect(second.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();
 expect(fixture.sessions).toHaveLength(0);expect(fixture.activeCount()).toBe(0);
 await selectFixturePhoto(page,fixture.pixel);expect(fixture.sessions).toHaveLength(0);expect(fixture.media.size).toBe(0);
 await page.getByRole('button',{name:'Remove photo 1'}).click();await expect(page.getByText('Cover · Ready to upload',{exact:true})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('button',{name:'Resume saved listing'})).toBeVisible();await page.getByRole('button',{name:'Resume saved listing'}).click();
 await expect(page.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();expect(fixture.sessions).toHaveLength(0);expect(fixture.activeCount()).toBe(0);
});
test('capacity recovery protects stale choices and requires an explicit confirmed empty release',async({page})=>{
 const fixture=await api(page,{capacity:true});await page.goto('/account/listings/new?posting=mobile-phones');await resize(page,360);await selectFixturePhoto(page,fixture.pixel);
 await page.getByRole('button',{name:'Upload / retry photos',exact:true}).click();await expect(page.getByRole('heading',{name:'Recover photo session capacity'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();expect(fixture.activeCount()).toBe(5);
 const first='90000000-0000-4000-8000-000000000001';const firstRelease=page.getByRole('button',{name:'Review release of session 90000000',exact:true}).first();
 await firstRelease.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(fixture.releases()).toBe(0);fixture.protect(first);
 await page.getByRole('button',{name:'Confirm release of unused session'}).click();await expect(page.getByText(/This session now has photo history or is being submitted/)).toBeVisible();expect(fixture.activeCount()).toBe(5);
 await page.getByRole('button',{name:'Keep session'}).click();await page.getByRole('button',{name:'Review release of session 90000000',exact:true}).first().click();
 expect(fixture.releases()).toBe(1);await page.getByRole('button',{name:'Confirm release of unused session'}).click();await expect(page.getByText(/Unused photo session released/)).toBeVisible();
 expect(fixture.activeCount()).toBe(4);await expect(page.getByText('Cover · Ready to upload',{exact:true})).toBeVisible();
 await uploadWithFixtureRetry(page);expect(fixture.activeCount()).toBe(5);expect(fixture.sessions).toHaveLength(2);expect(fixture.sessions[0]).toBe(fixture.sessions[1]);
 expect(fixture.media.size).toBe(1);await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
});
test('a lost create response retries the same session and another tab resumes it without allocation',async({page,context})=>{
 const fixture=await api(page,{loseCreateResponse:true});await page.goto('/account/listings/new?posting=mobile-phones');await selectFixturePhoto(page,fixture.pixel);
 await page.getByRole('button',{name:'Upload / retry photos',exact:true}).click();await expect(page.getByText(/The photo session could not be opened/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();expect(fixture.activeCount()).toBe(1);expect(fixture.sessions).toHaveLength(1);
 await uploadWithFixtureRetry(page);expect(fixture.sessions).toHaveLength(2);expect(fixture.sessions[0]).toBe(fixture.sessions[1]);expect(fixture.activeCount()).toBe(1);
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
 const second=await context.newPage();await second.goto('/account/listings/new?posting=mobile-phones');await second.getByRole('button',{name:'Resume saved listing'}).click();
 await expect(second.getByText('Cover · Ready',{exact:true})).toBeVisible();await expect(second.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();expect(fixture.sessions).toHaveLength(2);
});
test('expiry disables Continue and preserves retry blobs until explicit replacement',async({page})=>{
 const fixture=await api(page);await page.goto('/account/listings/new?posting=mobile-phones');await selectFixturePhoto(page,fixture.pixel);await uploadWithFixtureRetry(page);
 const originalMedia=[...fixture.media.keys()][0];fixture.expire(fixture.sessions[0]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByText(/This photo session has expired/)).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();expect(fixture.sessions).toHaveLength(1);
 await page.getByRole('button',{name:'Start a new photo session'}).click();await page.getByRole('button',{name:'Keep expired draft'}).click();expect(fixture.media.has(originalMedia)).toBe(true);expect(fixture.sessions).toHaveLength(1);
 await page.getByRole('button',{name:'Start a new photo session'}).click();await page.getByRole('button',{name:'Start new session and re-upload photos'}).click();
 await expect(page.getByText('Cover · Ready to upload',{exact:true})).toBeVisible();expect(fixture.sessions).toHaveLength(1);
 await page.getByRole('button',{name:'Upload / retry photos',exact:true}).click();await expect(page.getByText('Cover · Ready',{exact:true})).toBeVisible();
 expect(fixture.sessions).toHaveLength(2);expect(fixture.sessions[0]).not.toBe(fixture.sessions[1]);expect(fixture.media.has(originalMedia)).toBe(true);expect(fixture.media.size).toBe(2);
});

test('sixth upload automatically rotates a certified blank, preserving unknown local drafts',async({page})=>{
 const fixture=await api(page,{rotation:true});await page.goto('/account/listings/new?posting=mobile-phones');
 await selectFixturePhoto(page,fixture.pixel);expect(fixture.activeCount()).toBe(5);expect(fixture.sessions).toHaveLength(0);
 await uploadWithFixtureRetry(page);expect(fixture.activeCount()).toBe(5);expect(fixture.sessions).toHaveLength(1);
 expect(fixture.retired()).toEqual(['90000000-0000-4000-8000-000000000001']);
 expect(fixture.retired()).not.toContain('90000000-0000-4000-8000-000000000002');
 await expect(page.getByRole('heading',{name:'Recover photo session capacity'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();expect(fixture.media.size).toBe(1);
});
