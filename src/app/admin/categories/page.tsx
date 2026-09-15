import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { manageCategoryAction } from "./actions";
import type { CategoryAttribute } from "@/types/listing";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/admin/categories");
  }

  // Content editor or administrator role required
  const { data: staffData, error: staffError } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError) {
    logger.error("admin.categories_staff_check_failed", {
      error_code: staffError.code,
      message: staffError.message,
    });
    throw new Error("Failed to verify staff permissions.");
  }

  if (!staffData || !["administrator", "content_editor"].includes(staffData.role)) {
    redirect("/admin");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select(`
      *,
      category_attributes(*)
    `)
    .order("sort_order", { ascending: true });

  async function onManageCategory(formData: FormData) {
    "use server";
    await manageCategoryAction(null, formData);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <Link href="/admin" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Staff Portal
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Category Administration</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage marketplace categories and their structured attribute schemas.
        </p>
      </div>

      {/* Categories table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Current Categories</h2>
        <div className="divide-y divide-gray-200">
          {categories?.map((cat) => (
            <div key={cat.id} className="py-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    {cat.slug}
                  </code>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      cat.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cat.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{cat.description || "No description"}</p>

                {/* Attributes list */}
                <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                  {cat.category_attributes?.map((attr: CategoryAttribute) => (
                    <span
                      key={attr.id}
                      className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
                    >
                      {attr.label} ({attr.value_type})
                      {attr.is_required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status toggle form */}
              <div className="flex items-center">
                <form action={onManageCategory}>
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="category_id" value={cat.id} />
                  <input type="hidden" name="is_active" value={(!cat.is_active).toString()} />
                  <button
                    type="submit"
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {cat.is_active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Add New Category</h2>
        <form action={onManageCategory} className="space-y-4">
          <input type="hidden" name="action" value="create" />
          <input type="hidden" name="is_active" value="true" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-gray-700">
                Display Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Musical Instruments"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-xs font-semibold text-gray-700">
                URL Slug *
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="^[a-z0-9\-]+$"
                placeholder="e.g. musical-instruments"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-gray-700">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="Guitars, keyboards, drums, and music accessories"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
