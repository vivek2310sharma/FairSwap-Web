import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./e2e-isolated', testMatch:'my-ads.spec.ts', workers:1,
  globalSetup:require.resolve('./e2e-isolated/helpers/my-ads-setup.ts'),
  use:{baseURL:'http://127.0.0.1:3012'},
  webServer:{command:'corepack pnpm next start --hostname 127.0.0.1 -p 3012',url:'http://127.0.0.1:3012',reuseExistingServer:false},
});
