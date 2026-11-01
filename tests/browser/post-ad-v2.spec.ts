import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
const city = "55555555-5555-4555-8555-555555555555", locality = "66666666-6666-4666-8666-666666666666";
async function api(page: Page) {
    let fail = true;
    let submit = 0;
    const media = new Map<string, {
        id: string;
        state: string;
        url: string;
    }>();
    const sessions: string[] = [];
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#08704a' } }).png().toBuffer();
    const pixel = 'data:image/png;base64,' + bytes.toString('base64');
    await page.route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname.startsWith('/api/location/pincode/'))
            return route.fulfill({ json: { success: true, state: 'Karnataka', district: 'Bengaluru', city_id: city, districts: [{ name: 'Bengaluru', city_id: city }], localities: [{ id: locality, name: 'Koramangala', city_id: city, district: 'Bengaluru' }] } });
        if (url.pathname === '/api/post-ad/sessions') {
            sessions.push(req.postDataJSON().session_id);
            return route.fulfill({ json: { session: { state: 'open' }, media: [] } });
        }
        if (url.pathname.endsWith('/media')) {
            if (req.method() === 'POST') {
                const form = await new Request(req.url(), { method: 'POST', headers: req.headers(), body: new Uint8Array(req.postDataBuffer() ?? []) }).formData();
                expect((form.get('file') as File).type).toBe('image/webp');
                const id = String(form.get('media_id'));
                if (fail) {
                    fail = false;
                    return route.fulfill({ status: 503, json: { error: 'Temporary upload failure' } });
                }
                media.set(id, { id, state: 'ready', url: pixel });
            }
            if (req.method() === 'DELETE')
                media.delete(req.postDataJSON().media_id);
            return route.fulfill({ json: { session: { state: 'open' }, media: [...media.values()] } });
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
    return { media, sessions, submits: () => submit, pixel };
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

for (const theme of ['light', 'dark'] as const)
    for (const width of [390, 1440])
        test(`${theme}/${width}: real route components, upload lifecycle and review boundaries`, async ({ page }) => { await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 1000 }); const fixture = await api(page); const faults: string[] = []; page.on('pageerror', e => faults.push(e.message)); await page.route('https://**/*', route => route.abort()); await page.goto('/account/listings/new'); await expect(page).toHaveTitle('Post an ad | FairSwap.in'); await expect(page.getByRole('navigation', { name: 'Account navigation', exact: true })).toHaveCount(0); await expect(page.getByRole('navigation', { name: 'Mobile bottom navigation' })).toHaveCount(0); await page.getByRole('button', { name: /^Mobiles & Tablets/ }).click(); if (width === 390) {
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.getByRole('button', { name: /^Mobiles & Tablets/ })).toBeFocused();
            await page.getByRole('button', { name: /^Mobiles & Tablets/ }).click();
        } await page.getByRole('link', { name: 'Mobile Phones', exact: true }).click(); await expect(page).toHaveURL(/posting=mobile-phones/); await expect(page.getByRole('button', { name: 'Add photos', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Brand', exact: true })).toHaveValue(''); await choose(page, 'Brand', 'Apple'); await choose(page, 'Model', 'iPhone'); await page.getByRole('combobox', { name: 'Storage', exact: true }).selectOption('128 GB'); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('button', { name: 'Good condition', exact: true }).click(); await page.getByLabel('Description', { exact: true }).fill('Used carefully with no repairs. Original box included.'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Apple iPhone 15 · 128 GB · Good condition'); await page.getByLabel('Title', { exact: true }).fill('My carefully used phone'); await page.getByRole('button', { name: 'Like new', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My carefully used phone'); await page.getByRole('button', { name: 'Use automatically generated title' }).click(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByLabel('Price (₹)', { exact: true }).fill('125000'); await expect(page.getByText('₹1,25,000', { exact: true }).first()).toBeVisible(); await page.getByRole('switch', { name: 'Negotiable' }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('switch', { name: 'Negotiable' })).toHaveAttribute('aria-checked', 'true'); await page.waitForTimeout(450); const session = fixture.sessions[0]; await page.reload(); await expect(page.getByRole('button', { name: 'Resume saved listing' })).toBeVisible(); expect(fixture.sessions).toHaveLength(1); await page.waitForTimeout(450); expect(fixture.sessions).toHaveLength(1); await page.getByRole('button', { name: 'Resume saved listing' }).click(); await expect(page.getByLabel('Price (₹)', { exact: true })).toHaveValue('125000'); expect(fixture.sessions.at(-1)).toBe(session); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByLabel('PIN code *', { exact: true }).fill('560034'); await expect(page.getByLabel('Area / Locality *', { exact: true })).toHaveValue(locality); await page.getByRole('button', { name: 'Review listing', exact: true }).click(); await expect(page.getByRole('alert').getByText(/ready.*photos|photos/i).first()).toBeVisible(); expect(fixture.submits()).toBe(0); await page.getByLabel('Choose photo files', { exact: true }).setInputFiles({ name: 'phone.png', mimeType: 'image/png', buffer: Buffer.from(fixture.pixel.split(',')[1], 'base64') }); await expect(page.getByText('Cover · Ready to upload', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Upload / retry photos', exact: true }).click(); await expect(page.getByText('Temporary upload failure', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Upload / retry photos', exact: true }).click(); await expect(page.getByText('Cover · Ready', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Step 5: Location' }).click(); await page.getByRole('button', { name: 'Review listing', exact: true }).click(); await expect(page.getByRole('complementary', { name: 'Buyer preview', exact: true })).toHaveCount(1); await expect(page.getByRole('complementary', { name: 'Buyer preview', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Submit for review', exact: true }).click(); await expect(page.getByText('Fixture rejected submission; details retained')).toBeVisible(); expect(fixture.submits()).toBe(1); expect(faults).toEqual([]); });
test('both routes and all steps fit requested viewports, labels and semantic colors', async ({ page }) => { await api(page); await page.goto('/account/listings/new'); for (const theme of ['light', 'dark'] as const) {
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
        for (let i = 0; i < 5; i++) {
            await page.getByRole('button', { name: `Step ${i + 1}: ${['Photos', 'Phone details', 'Condition', 'Price', 'Location'][i]}`, exact: true }).click();
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
