import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import base from "./tablets-v1.config";

const port = process.env.FAIRSWAP_GOODS_BROWSER_PORT;
if (!port || !/^\d+$/.test(port)) throw Error("Run this suite with the isolated Goods fixture.");
export default defineConfig({
  ...base, testMatch: "ordinary-goods.spec.ts", outputDir: join(tmpdir(), "fairswap-ordinary-goods-results"),
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
});
