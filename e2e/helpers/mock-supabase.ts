import http from "node:http";

let serverInstance: http.Server | null = null;

const PNG_1X1_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export function startMockSupabaseServer(port = 54322): Promise<http.Server> {
  if (serverInstance) {
    return Promise.resolve(serverInstance);
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = req.url || "";

      // Serve test image binary
      if (url.includes("/test-media/")) {
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": PNG_1X1_BUFFER.length,
          "Cache-Control": "public, max-age=3600",
        });
        res.end(PNG_1X1_BUFFER);
        return;
      }

      // Mock search_public_listings RPC
      if (url.includes("/rest/v1/rpc/search_public_listings")) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            items: [
              {
                id: "list-1",
                seller_id: "seller-1",
                slug: "iphone-15-pro-max-mumbai",
                title: "iPhone 15 Pro Max 256GB Natural Titanium - केवल 2 महीने पुराना",
                description: "Used iPhone 15 Pro Max in pristine condition",
                condition: "like_new",
                price_type: "fixed",
                price_paise: 12500000, // ₹1,25,000
                category_attributes: {},
                status: "active",
                created_at: "2026-10-21T00:00:00.000Z",
                published_at: "2026-10-21T00:00:00.000Z",
                category: { id: "cat-1", name: "Mobiles & Tablets", slug: "mobiles", icon: null },
                city: { id: "city-1", name: "Mumbai", state: "Maharashtra" },
                locality: { id: "loc-1", name: "Bandra West" },
                cover_photo: {
                  id: "photo-1",
                  storage_path: "listings/list-1/photo-1.jpg",
                  aspect_ratio: "4:3",
                  blur_data_url: null,
                },
              },
              {
                id: "list-2",
                seller_id: "seller-2",
                slug: "samsung-front-load-washing-machine",
                title: "Samsung Front Load Washing Machine 8kg Fully Automatic",
                description: "Excellent washing machine",
                condition: "good",
                price_type: "fixed",
                price_paise: 3250000, // ₹32,500
                category_attributes: {},
                status: "active",
                created_at: "2026-10-20T00:00:00.000Z",
                published_at: "2026-10-20T00:00:00.000Z",
                category: { id: "cat-2", name: "Electronics & Appliances", slug: "electronics", icon: null },
                city: { id: "city-1", name: "Mumbai", state: "Maharashtra" },
                locality: { id: "loc-2", name: "Andheri East" },
                cover_photo: null,
              },
            ],
            total_count: 2,
            page: 1,
            per_page: 12,
            total_pages: 1,
          })
        );
        return;
      }

      // Mock is_listing_publicly_visible RPC
      if (url.includes("/rest/v1/rpc/is_listing_publicly_visible")) {
        res.writeHead(200);
        res.end(JSON.stringify(true));
        return;
      }

      // Mock listing_media table
      if (url.includes("/rest/v1/listing_media")) {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            {
              id: "photo-1",
              listing_id: "list-1",
              thumbnail_storage_path: "photo-1-thumb.jpg",
              medium_storage_path: "photo-1-medium.jpg",
              large_storage_path: "photo-1-large.jpg",
              processing_status: "ready",
            },
          ])
        );
        return;
      }

      // Mock storage signed URL generation
      if (url.includes("/storage/v1/object/sign/")) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            signedUrl: `http://127.0.0.1:${port}/test-media/photo-1.png`,
          })
        );
        return;
      }

      // Mock listings table query
      if (url.includes("/rest/v1/listings")) {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            {
              id: "list-1",
              seller_id: "seller-1",
              slug: "iphone-15-pro-max-mumbai",
              title: "iPhone 15 Pro Max 256GB Natural Titanium - केवल 2 महीने पुराना",
              description: "Used iPhone 15 Pro Max in pristine condition",
              condition: "like_new",
              price_type: "fixed",
              price_paise: 12500000,
              category_attributes: {},
              status: "active",
              created_at: "2026-10-21T00:00:00.000Z",
              published_at: "2026-10-21T00:00:00.000Z",
              category: { id: "cat-1", name: "Mobiles & Tablets", slug: "mobiles" },
              city: { id: "city-1", name: "Mumbai", state: "Maharashtra" },
              locality: { id: "loc-1", name: "Bandra West" },
            },
          ])
        );
        return;
      }

      // Mock categories
      if (url.includes("/rest/v1/categories")) {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            { id: "cat-1", slug: "mobiles", name: "Mobiles & Tablets", description: null, icon: null, sort_order: 1, is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
            { id: "cat-2", slug: "electronics", name: "Electronics & Appliances", description: null, icon: null, sort_order: 2, is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
          ])
        );
        return;
      }

      // Mock cities
      if (url.includes("/rest/v1/cities")) {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            { id: "city-1", name: "Mumbai", state: "Maharashtra", slug: "mumbai", is_active: true, created_at: "2026-01-01" },
          ])
        );
        return;
      }

      // Mock localities
      if (url.includes("/rest/v1/localities")) {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            { id: "loc-1", city_id: "city-1", name: "Bandra West", slug: "bandra-west", is_active: true, created_at: "2026-01-01" },
            { id: "loc-2", city_id: "city-1", name: "Andheri East", slug: "andheri-east", is_active: true, created_at: "2026-01-01" },
          ])
        );
        return;
      }

      // Default empty response
      res.writeHead(200);
      res.end(JSON.stringify([]));
    });

    server.on("error", (err: Error) => {
      console.error(`[MockSupabase] Error on mock server (port ${port}):`, err);
      reject(err);
    });

    server.listen(port, "127.0.0.1", () => {
      serverInstance = server;
      console.log(`[MockSupabase] Server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

export function stopMockSupabaseServer(): Promise<void> {
  if (!serverInstance) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    serverInstance?.close((err) => {
      if (err) {
        console.error("[MockSupabase] Error closing mock server:", err);
        reject(err);
      } else {
        serverInstance = null;
        console.log("[MockSupabase] Server stopped.");
        resolve();
      }
    });
  });
}
