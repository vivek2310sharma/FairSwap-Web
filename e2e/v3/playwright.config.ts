import base from '../wearables/playwright.config';
const config={...base,testDir:'.',testMatch:/goods\.journey\.ts$/};
export default config;
