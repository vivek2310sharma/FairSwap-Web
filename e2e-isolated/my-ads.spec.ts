import { test, expect } from '@playwright/test';

test.beforeEach(async({context})=>{
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.${Buffer.from('synthetic-signature').toString('base64url')}`;
  await context.addCookies([{name:'sb-127-auth-token',value:`base64-${encode({access_token,refresh_token:'synthetic',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'00000000-0000-4000-8000-000000000001'}})}`,domain:'127.0.0.1',path:'/'}]);
});

for(const width of [320,360,390,1280])test(`status navigation, fallback counts and pagination at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.goto('/account/listings');
  const nav=page.getByRole('navigation',{name:'My Ads Status Navigation'});
  await expect(nav.getByRole('link',{name:'All 13',exact:true})).toHaveAttribute('aria-current','page');
  await nav.getByRole('link',{name:'Active 12',exact:true}).click();
  await expect(page).toHaveURL(/status=active$/);
  await expect(page.getByText('Reserved',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/my-ads-active-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'Go to next page'}).click();
  await expect(page).toHaveURL(/status=active&page=2$/);
  await expect(page.getByRole('heading',{name:'Synthetic Goods 10',exact:true})).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/status=active$/);
  await expect(page.getByText('Reserved',{exact:true})).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading',{name:'Synthetic Goods 10',exact:true})).toBeVisible();
  await nav.getByRole('link',{name:'Sold 0',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No sold ads'})).toBeVisible();
  const overflowing = await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1 && getComputedStyle(el).position!=='fixed').map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right})).slice(0,12));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(overflowing)).toBe(true);
  await page.screenshot({path:`test-results/my-ads-${width}.png`,fullPage:true});
  await expect(nav.getByRole('link',{name:'Sold 0',exact:true})).toHaveCSS('min-height','44px');
});

test('invalid parameters and out-of-range pages recover',async({page})=>{
  await page.goto('/account/listings?status=bogus&page=2junk');
  await expect(page.getByRole('link',{name:'All 13',exact:true})).toHaveAttribute('aria-current','page');
  await page.goto('/account/listings?status=active&page=100');
  await expect(page).toHaveURL(/\/account\/listings\?status=active$/);
  await page.goto('/account/listings?status=active&page=1001');
  await expect(page.getByRole('heading',{name:'Synthetic Goods 0',exact:true})).toBeVisible();
});

for (const status of ['expired', 'sold']) test(`mobile deep link reveals ${status} tab`, async ({page}) => {
  await page.setViewportSize({width:320,height:800});
  await page.goto(`/account/listings?status=${status}`);
  const selected=page.getByRole('navigation',{name:'My Ads Status Navigation'}).locator('[aria-current="page"]');
  await expect.poll(async()=>selected.evaluate(el=>{
    const link=el.getBoundingClientRect(),strip=el.parentElement!.getBoundingClientRect();
    return link.left>=strip.left-1 && link.right<=strip.right+1;
  })).toBe(true);
  await expect(page.getByRole('heading',{name:`No ${status} ads`})).toBeVisible();
});

test('unauthenticated sellers cannot open the dashboard',async({page,context})=>{
  await context.clearCookies();
  await page.goto('/account/listings?status=draft&page=2');
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
  await expect(page.getByRole('navigation',{name:'My Ads Status Navigation'})).toHaveCount(0);
});
