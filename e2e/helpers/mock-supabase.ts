import http from "http";

export function createMockSupabaseServer() {
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
              cover_photo: null,
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

    // Default empty array for auth / favourites
    res.writeHead(200);
    res.end(JSON.stringify([]));
  });

  return new Promise<http.Server>((resolve) => {
    server.on("error", (err: unknown) => {
      if ((err as { code?: string }).code === "EADDRINUSE") {
        // Already running from another worker process
        resolve(server);
      } else {
        console.error("Mock server error:", err);
        resolve(server);
      }
    });

    server.listen(54321, "127.0.0.1", () => {
      resolve(server);
    });
  });
}
