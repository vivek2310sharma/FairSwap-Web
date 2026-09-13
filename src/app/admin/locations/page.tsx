import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { manageLocationAction } from "./actions";
import type { Locality } from "@/types/listing";

export default async function AdminLocationsPage() {
  const supabase = await createClient();

  // Administrator with AAL2
  const { data: isStaff } = await supabase.rpc("is_active_staff_aal2", {
    required_role: "administrator",
  });

  if (!isStaff) {
    redirect("/admin");
  }

  const { data: cities } = await supabase
    .from("cities")
    .select(`
      *,
      localities(*)
    `)
    .order("name", { ascending: true });

  async function onManageLocation(formData: FormData) {
    "use server";
    await manageLocationAction(null, formData);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <Link href="/admin" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Staff Portal
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Location Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage marketplace cities and their constituent localities for localized classified discovery.
        </p>
      </div>

      {/* Configured Cities & Localities */}
      <div className="space-y-6">
        <h2 className="text-base font-bold text-gray-900">Configured Cities & Localities</h2>
        {cities?.map((city) => (
          <div key={city.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{city.name}</h3>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    {city.slug}
                  </code>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      city.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {city.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">State: {city.state}</p>
              </div>

              {/* City status toggle */}
              <form action={onManageLocation}>
                <input type="hidden" name="action" value="update_city" />
                <input type="hidden" name="city_id" value={city.id} />
                <input type="hidden" name="is_active" value={(!city.is_active).toString()} />
                <button
                  type="submit"
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {city.is_active ? "Deactivate City" : "Activate City"}
                </button>
              </form>
            </div>

            {/* Localities list with toggles */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Localities ({city.localities?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {city.localities?.map((loc: Locality) => (
                  <div
                    key={loc.id}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      loc.is_active
                        ? "border-gray-200 bg-gray-50 text-gray-800"
                        : "border-gray-200 bg-gray-100 text-gray-400 line-through"
                    }`}
                  >
                    <span>📍 {loc.name}</span>
                    <form action={onManageLocation} className="inline">
                      <input type="hidden" name="action" value="update_locality" />
                      <input type="hidden" name="locality_id" value={loc.id} />
                      <input type="hidden" name="is_active" value={(!loc.is_active).toString()} />
                      <button
                        type="submit"
                        title={loc.is_active ? "Deactivate locality" : "Activate locality"}
                        className="ml-1 text-[10px] text-gray-500 hover:text-gray-900 font-bold"
                      >
                        {loc.is_active ? "✕" : "✓"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>

            {/* Add locality to this city */}
            <details className="pt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-emerald-600 hover:text-emerald-700">
                + Add Locality to {city.name}
              </summary>
              <form action={onManageLocation} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="action" value="create_locality" />
                <input type="hidden" name="city_id" value={city.id} />
                <input type="hidden" name="is_active" value="true" />
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Locality name (e.g. Civil Lines)"
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  name="slug"
                  type="text"
                  required
                  placeholder="slug (e.g. civil-lines)"
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Add Locality
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>

      {/* Add New City Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Add New City</h2>
        <form action={onManageLocation} className="space-y-4">
          <input type="hidden" name="action" value="create_city" />
          <input type="hidden" name="is_active" value="true" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="city_name" className="block text-xs font-semibold text-gray-700">
                City Name *
              </label>
              <input
                id="city_name"
                name="name"
                type="text"
                required
                placeholder="e.g. Udaipur"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="city_state" className="block text-xs font-semibold text-gray-700">
                State *
              </label>
              <input
                id="city_state"
                name="state"
                type="text"
                required
                placeholder="e.g. Rajasthan"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="city_slug" className="block text-xs font-semibold text-gray-700">
                Slug *
              </label>
              <input
                id="city_slug"
                name="slug"
                type="text"
                required
                placeholder="e.g. udaipur"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Create City
          </button>
        </form>
      </div>
    </div>
  );
}
