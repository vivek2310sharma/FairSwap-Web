"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Category,
  CategoryAttribute,
  City,
  Listing,
  ListingMedia,
  ListingCondition,
  ListingPriceType,
  PincodeLookupResult,
  submitListingSchema,
} from "@/types/listing";
import MediaUploader from "./MediaUploader";
import PincodeLocationPicker from "./PincodeLocationPicker";
import {
  createDraftListingAction,
  updateListingAction,
  submitListingAction,
} from "@/app/account/listings/actions";

interface ListingFormProps {
  categories: Category[];
  allAttributes: CategoryAttribute[];
  cities: City[];
  initialListing?: Listing | null;
  initialMedia?: ListingMedia[];
  initialLocationLookup?: PincodeLookupResult | null;
  isMaintenanceActive?: boolean;
  maintenanceMessage?: string;
}

export default function ListingForm({
  categories,
  allAttributes,
  cities,
  initialListing,
  initialMedia = [],
  initialLocationLookup,
  isMaintenanceActive = false,
  maintenanceMessage,
}: ListingFormProps) {
  const router = useRouter();
  const isEditing = !!initialListing;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialListing?.category_id || (categories.length > 0 ? categories[0].id : "")
  );
  const [selectedCity] = useState<string>(
    initialListing?.city_id || (cities.length > 0 ? cities[0].id : "")
  );
  const [priceType, setPriceType] = useState<string>(initialListing?.price_type || "fixed");
  const [priceRupees, setPriceRupees] = useState<string>(
    initialListing?.price_paise ? (initialListing.price_paise / 100).toString() : ""
  );

  const [attributesState, setAttributesState] = useState<Record<string, unknown>>(
    initialListing?.category_attributes || {}
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter attributes for active category
  const activeCategoryAttributes = allAttributes.filter(
    (attr) => attr.category_id === selectedCategory
  );

  const handleAttributeChange = (name: string, value: unknown) => {
    setAttributesState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const processForm = async (form: HTMLFormElement, shouldSubmitForReview: boolean) => {
    if (isMaintenanceActive) {
      setFormError(
        maintenanceMessage ||
          "Listing creation and editing are temporarily paused while we upgrade location reference data. Active listings and buyer messages remain accessible. Please try again shortly."
      );
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(form);

    // Compute price paise
    let computedPricePaise: number | null = null;
    if (priceType === "free") {
      formData.set("price_paise", "0");
      computedPricePaise = 0;
    } else if (priceRupees && priceRupees.trim() !== "") {
      const parsed = parseFloat(priceRupees);
      if (!isNaN(parsed)) {
        const paise = Math.round(parsed * 100);
        formData.set("price_paise", paise.toString());
        computedPricePaise = paise;
      }
    } else {
      formData.delete("price_paise");
    }

    formData.set("category_attributes", JSON.stringify(attributesState));

    // Submit-for-Review Client-Side Validation Gate
    if (shouldSubmitForReview) {
      const rawTitle = (formData.get("title") as string)?.trim() || "";
      const rawDescription = (formData.get("description") as string)?.trim() || "";
      const rawCondition = (formData.get("condition") as ListingCondition) || null;
      const rawCityId = (formData.get("city_id") as string) || null;
      const rawLocalityId = (formData.get("locality_id") as string) || null;
      const rawPinCode = (formData.get("pin_code") as string)?.trim() || null;

      const normalizedData = {
        title: rawTitle,
        category_id: selectedCategory,
        city_id: rawCityId,
        locality_id: rawLocalityId,
        description: rawDescription || null,
        condition: rawCondition,
        price_type: priceType as ListingPriceType,
        price_paise: computedPricePaise,
        pin_code: rawPinCode,
        category_attributes: attributesState,
      };

      const validation = submitListingSchema.safeParse(normalizedData);
      if (!validation.success) {
        setFormError(validation.error.issues[0].message);
        setIsSubmitting(false);
        return;
      }

      // Validate required category attributes
      for (const attr of activeCategoryAttributes) {
        if (attr.is_required) {
          const v = attributesState[attr.name];
          if (
            v === undefined ||
            v === null ||
            v === "" ||
            (typeof v === "string" && v.trim() === "")
          ) {
            setFormError(`"${attr.label}" is required before submitting for review.`);
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    try {
      let listingId = initialListing?.id;

      if (!isEditing) {
        // Create draft first
        const result = await createDraftListingAction(null, formData);
        if (result.error || !result.listingId) {
          setFormError(result.error || "Failed to create draft");
          setIsSubmitting(false);
          return;
        }
        listingId = result.listingId;
      } else {
        const result = await updateListingAction(listingId!, formData);
        if (result.error) {
          setFormError(result.error);
          setIsSubmitting(false);
          return;
        }
      }

      if (shouldSubmitForReview && listingId) {
        const submitResult = await submitListingAction(listingId);
        if (submitResult.error) {
          setFormError(`Saved, but submission failed: ${submitResult.error}`);
          setIsSubmitting(false);
          if (!isEditing) {
            router.push(`/account/listings/${listingId}/edit`);
          }
          return;
        }
        router.push("/account/listings");
      } else {
        setFormSuccess("Draft saved successfully.");
        if (!isEditing && listingId) {
          router.push(`/account/listings/${listingId}/edit`);
        }
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMaterialEditNotice =
    isEditing && ["active", "reserved", "paused"].includes(initialListing?.status || "");
  const isRejectedNotice = isEditing && initialListing?.status === "rejected";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        processForm(e.currentTarget, false);
      }}
      className="space-y-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-xs text-gray-500 italic">* Required before submitting for review.</p>
        <span className="text-xs text-gray-400">Save as Draft remains permissive</span>
      </div>

      {isMaterialEditNotice && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-sm text-amber-800">
          <span className="font-bold">⚠️ Re-review policy applies:</span> Any change to title,
          description, category, condition, price, or photos while this listing is active, reserved,
          or paused will automatically submit it to staff review before changes take effect.
        </div>
      )}

      {isRejectedNotice && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-800">
          <span className="font-bold">Rejection Note:</span> {initialListing?.rejection_reason}
          <p className="mt-1 text-xs">
            Saving changes to this listing will return it to <strong>Draft</strong> state, where you
            can complete your edits and submit again.
          </p>
        </div>
      )}

      {isMaintenanceActive && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="seller-write-maintenance-banner"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">⚠️</span>
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Listing Maintenance in Progress
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                {maintenanceMessage ||
                  "Listing creation and editing are temporarily paused while we upgrade location reference data. Active listings and buyer messages remain accessible. Please try again shortly."}
              </p>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {formError}
        </div>
      )}

      {formSuccess && (
        <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700">
          {formSuccess}
        </div>
      )}

      {/* Section 1: Category */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">1. Category & Type</h2>
        <div>
          <label htmlFor="category_id" className="block text-xs font-semibold text-gray-700">
            Category *
          </label>
          <select
            id="category_id"
            name="category_id"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setAttributesState({});
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Category Attributes */}
        {activeCategoryAttributes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            {activeCategoryAttributes.map((attr) => (
              <div key={attr.id}>
                <label className="block text-xs font-semibold text-gray-700">
                  {attr.label} {attr.is_required && "*"}
                </label>
                {attr.value_type === "select" && attr.options ? (
                  <select
                    value={(attributesState[attr.name] as string) || ""}
                    onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select {attr.label}...</option>
                    {(attr.options as string[]).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : attr.value_type === "number" ? (
                  <input
                    type="number"
                    value={(attributesState[attr.name] as number) ?? ""}
                    onChange={(e) =>
                      handleAttributeChange(attr.name, e.target.value ? Number(e.target.value) : "")
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={(attributesState[attr.name] as string) || ""}
                    onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Details */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">2. Item Details</h2>
        <div>
          <label htmlFor="title" className="block text-xs font-semibold text-gray-700">
            Title * (3–150 characters)
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={150}
            defaultValue={initialListing?.title || ""}
            placeholder="e.g. Sony WH-1000XM4 Wireless Headphones"
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-semibold text-gray-700">
            Description * (min 10 characters before submitting)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={5000}
            defaultValue={initialListing?.description || ""}
            placeholder="Describe the item condition, history, included accessories, etc."
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="condition" className="block text-xs font-semibold text-gray-700">
            Condition *
          </label>
          <select
            id="condition"
            name="condition"
            defaultValue={initialListing?.condition || "good"}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="new">New (Unopened)</option>
            <option value="like_new">Like New (Barely used)</option>
            <option value="good">Good (Normal wear)</option>
            <option value="fair">Fair (Visible wear, functional)</option>
            <option value="poor">Poor (For parts / repair)</option>
          </select>
        </div>
      </div>

      {/* Section 3: Location */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">3. Location</h2>
        <PincodeLocationPicker
          initialPinCode={initialListing?.pin_code}
          initialCityId={initialListing?.city_id || selectedCity}
          initialLocalityId={initialListing?.locality_id}
          initialLandmark={initialListing?.landmark}
          initialLookup={initialLocationLookup}
          cities={cities}
        />
      </div>

      {/* Section 4: Pricing */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">4. Pricing</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price_type" className="block text-xs font-semibold text-gray-700">
              Price Type *
            </label>
            <select
              id="price_type"
              name="price_type"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="fixed">Fixed Price</option>
              <option value="negotiable">Negotiable</option>
              <option value="free">Free</option>
            </select>
          </div>

          {priceType !== "free" && (
            <div>
              <label htmlFor="price_rupees" className="block text-xs font-semibold text-gray-700">
                Price (₹ Rupees) *
              </label>
              <input
                id="price_rupees"
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="2500"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Photos */}
      {isEditing && initialListing && (
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">5. Photos</h2>
          <MediaUploader
            listingId={initialListing.id}
            initialMedia={initialMedia}
            coverPhotoId={initialListing.cover_photo_id}
          />
        </div>
      )}

      {/* Submit / Save buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting || isMaintenanceActive}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Save as Draft"}
        </button>

        {isEditing && (
          <button
            type="button"
            disabled={isSubmitting || isMaintenanceActive}
            onClick={(e) => {
              if (isMaintenanceActive) return;
              const form = (e.target as HTMLElement).closest("form");
              if (form) {
                processForm(form, true);
              }
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
        )}
      </div>
    </form>
  );
}

