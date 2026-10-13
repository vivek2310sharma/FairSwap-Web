"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ListingCategoryReference,
  ListingAttributeReference,
  City,
  Listing,
  ListingMedia,
  ListingCondition,
  ListingPriceType,
  PincodeLookupResult,
  submitListingSchema,
} from "@/types/listing";
import { ListingDetailsFields, ListingPricingFields } from "./ListingFormFields";
import { ConfirmChange } from "./PostAdFlow";
import MediaUploader from "./MediaUploader";
import SubmissionReadinessPanel from './SubmissionReadinessPanel';
import type {ReadinessResult} from '@/lib/listings/submission-readiness';
import PincodeLocationPicker from "./PincodeLocationPicker";
import TwoWheelerFields from "./TwoWheelerFields";
import { rupeesToPaise, type ModelResolution } from "@/lib/listings/two-wheeler/contract";
import type { VehicleReferences } from "@/lib/listings/two-wheeler/server";
import type {PropertyReferences} from '@/lib/listings/property/server';
import {emptyPropertyFinancial,validatePropertyDraft,type PropertyFinancial} from '@/lib/listings/property/contract';
import {financialToEdit,financialToPersist,hasFinancialInput,type FinancialEdit} from '@/lib/listings/property/editing';
import {PropertyDetails,PropertyCharges} from './PropertyFields';
import {
  createDraftListingAction,
  updateListingAction,
  submitListingAction,
} from "@/app/account/listings/actions";

interface ListingFormProps {
  submissionEnabled?: boolean;
  readiness?: ReadinessResult | null;
  categories: ListingCategoryReference[];
  allAttributes: ListingAttributeReference[];
  cities: City[];
  initialListing?: Listing | null;
  initialMedia?: ListingMedia[];
  initialLocationLookup?: PincodeLookupResult | null;
  isMaintenanceActive?: boolean;
  maintenanceMessage?: string;
  postAdEntry?: "goods" | "legacy" | "vehicle" | "property";
  vehicle?: { references: VehicleReferences; initialResolution?: ModelResolution };
  property?: {references:PropertyReferences;initialFinancial?:PropertyFinancial;initialSociety?:string|null};
  onAttributesChanged?: (entered: boolean) => void;
  resetCategoryVersion?: number;
}
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export default function ListingForm({
  submissionEnabled = false,
  readiness,
  categories,
  allAttributes,
  cities,
  initialListing,
  initialMedia = [],
  initialLocationLookup,
  isMaintenanceActive = false,
  maintenanceMessage,
  postAdEntry,
  vehicle,
  property,
  onAttributesChanged,
  resetCategoryVersion = 0,
}: ListingFormProps) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeHydration,clientHydrated,serverHydrated);
  const isEditing = !!initialListing;
  const [readinessOutdated,setReadinessOutdated]=useState(false);
  const [savedContentOutdated,setSavedContentOutdated]=useState(false);
  const testFamily=postAdEntry==='vehicle'||postAdEntry==='property';

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialListing?.category_id || (postAdEntry === "goods" || postAdEntry === "vehicle" || postAdEntry === "property" ? "" : categories.length > 0 ? categories[0].id : "")
  );
  const [selectedCity] = useState<string>(
    initialListing?.city_id || (postAdEntry === "goods" || postAdEntry === "vehicle" || postAdEntry === "property" ? "" : cities.length > 0 ? cities[0].id : "")
  );
  const [priceType, setPriceType] = useState<string>(initialListing?.price_type || "fixed");
  const [priceRupees, setPriceRupees] = useState<string>(
    initialListing?.price_paise ? (initialListing.price_paise / 100).toString() : ""
  );

  const [attributesState, setAttributesState] = useState<Record<string, unknown>>(
    initialListing?.category_attributes || {}
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [resolution,setResolution] = useState<ModelResolution>(vehicle?.initialResolution??{mode:"unanswered"});
  const vehicleCategory=vehicle?.references.categories.find(c=>c.id===selectedCategory);
  const propertyCategory=property?.references.categories.find(c=>c.id===selectedCategory);
  const [financial,setFinancial]=useState<FinancialEdit>(()=>financialToEdit(property?.initialFinancial??emptyPropertyFinancial()));
  const [society,setSociety]=useState(property?.initialSociety??'');
  const propertyEntered=hasFinancialInput(financial,propertyCategory?.basis===null)||!!society;
  const categoryEntered=Object.values(attributesState).some(v=>v!==''&&v!==null&&v!==undefined)
    || (postAdEntry==='vehicle'&&(resolution.mode!=='unanswered'||'brand_id' in resolution))
    || (postAdEntry==='property'&&propertyEntered);
  // Report all category state together: changing model context must not hide
  // existing specifications (or vice versa) from the section-change guard.
  useEffect(()=>{onAttributesChanged?.(categoryEntered);},[onAttributesChanged,categoryEntered]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const savedId = useRef(initialListing?.id);
  const [observedReset, setObservedReset] = useState(resetCategoryVersion);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  if (observedReset !== resetCategoryVersion) {
    setObservedReset(resetCategoryVersion);
    setSelectedCategory("");
    setAttributesState({});
    setResolution({mode:"unanswered"});
    setFinancial(financialToEdit(emptyPropertyFinancial()));setSociety('');
  }
  const changeCategory = (next: string) => {
    setSelectedCategory(next);
    setAttributesState({});
    setResolution({mode:"unanswered"});
    setFinancial(financialToEdit(emptyPropertyFinancial(property?.references.categories.find(c=>c.id===next))));setSociety('');
    setPendingCategory(null);
  };

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
    if (inFlight.current) return;
    if (isMaintenanceActive) {
      setFormError(
        maintenanceMessage ||
          "Listing creation and editing are temporarily paused while we upgrade location reference data. Active listings and buyer messages remain accessible. Please try again shortly."
      );
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    inFlight.current = true;
    setIsSubmitting(true);

    if(testFamily&&shouldSubmitForReview){
      try{
        if(!submissionEnabled||!initialListing){setFormError('Test submission is unavailable.');return;}
        if(savedContentOutdated){setFormError('Save your changes, then reload the saved draft before submitting.');return;}
        const result=await submitListingAction(initialListing.id,initialListing.revision);
        if(result.error){setFormError(result.error);return;}
        router.push('/account/listings');router.refresh();
      }catch(e){setFormError(e instanceof Error?e.message:'Submission failed');}
      finally{inFlight.current=false;setIsSubmitting(false);}
      return;
    }

    const formData = new FormData(form);
    if (postAdEntry) formData.set("post_ad_entry", postAdEntry);
    if(postAdEntry==='property'){
      if(!propertyCategory||shouldSubmitForReview){setFormError(!propertyCategory?'Select a Property rental category':'Property review/publication is disabled');setIsSubmitting(false);inFlight.current=false;return;}
      try{
        const checked=validatePropertyDraft(attributesState,financialToPersist(financial),society||null,{...propertyCategory,path:propertyCategory.path});
        if(checked.error||!checked.data)throw Error(checked.error);
        formData.set('property_version_id',propertyCategory.version_id);formData.set('property_financial',JSON.stringify(checked.data.financial));formData.set('property_society_name',society);
        for(const key of ['condition','price_type','price_paise'])formData.delete(key);
      }catch(e){setFormError(e instanceof Error?e.message:'Invalid rental declaration');setIsSubmitting(false);inFlight.current=false;return;}
    }
    if (postAdEntry === "vehicle") {
      if (!vehicleCategory) {setFormError("Select a vehicle category");setIsSubmitting(false);inFlight.current=false;return;}
      formData.set("vehicle_version_id",vehicleCategory.version_id);
      formData.set("vehicle_resolution",JSON.stringify(resolution));
      if (shouldSubmitForReview) {setFormError("Vehicle review/publication is disabled for this milestone");setIsSubmitting(false);inFlight.current=false;return;}
      try {
        const paise=rupeesToPaise(priceRupees,priceType);
        if(paise===null)formData.delete("price_paise");else formData.set("price_paise",String(paise));
      } catch(e) {setFormError(e instanceof Error?e.message:"Invalid amount");setIsSubmitting(false);inFlight.current=false;return;}
    }

    // Compute price paise
    let computedPricePaise: number | null = null;
    if(postAdEntry==='property') {
      formData.delete('price_paise');
    } else if (postAdEntry === "vehicle") {
      computedPricePaise = formData.has("price_paise") ? Number(formData.get("price_paise")) : null;
    } else if (priceType === "free") {
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
        inFlight.current = false;
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
            inFlight.current = false;
            return;
          }
        }
      }
    }

    try {
      let listingId = savedId.current;

      if (!listingId) {
        // Create draft first
        const result = await createDraftListingAction(null, formData);
        if (result.error || !result.listingId) {
          setFormError(result.error || "Failed to create draft");
          setIsSubmitting(false);
          return;
        }
        listingId = result.listingId;
        savedId.current = listingId;
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
        if(testFamily)setSavedContentOutdated(true);
        if (!isEditing && listingId) {
          router.push(`/account/listings/${listingId}/edit`);
        }
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const isMaterialEditNotice =
    isEditing && ["active", "reserved", "paused"].includes(initialListing?.status || "");
  const isRejectedNotice = isEditing && initialListing?.status === "rejected";

  return (
    <form
      onInputCapture={()=>{setSavedContentOutdated(true);if(readiness)setReadinessOutdated(true);}}
      onChangeCapture={()=>{setSavedContentOutdated(true);if(readiness)setReadinessOutdated(true);}}
      data-form-ready={hydrated}
      onSubmit={(e) => {
        e.preventDefault();
        processForm(e.currentTarget, false);
      }}
      className="space-y-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
    >
      {readiness&&<SubmissionReadinessPanel result={readiness} outdated={readinessOutdated}/>}
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-xs text-gray-500 italic">{testFamily?submissionEnabled?'Complete the details and photos, then submit the saved draft for Test review. Approval and public publication remain disabled.':'Test draft. Submission is disabled or unavailable; approval and public publication remain disabled.':'* Required before submitting for review.'}</p>
        <span className="text-xs text-gray-400">Saving a draft does not publish it</span>
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
        <div role="alert" className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
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
              if ((postAdEntry === "goods" || postAdEntry === "vehicle" || postAdEntry === "property") && (propertyEntered || resolution.mode!=="unanswered" || Object.values(attributesState).some(v => v !== "" && v !== null && v !== undefined))) setPendingCategory(e.target.value);
              else changeCategory(e.target.value);
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {(postAdEntry === "goods" || postAdEntry === "vehicle" || postAdEntry === "property") && <option value="">Select a category</option>}
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        {pendingCategory !== null && <ConfirmChange description={postAdEntry==='property'?'Changing category clears Property details, rental declarations and private society text for re-entry. Your title, description and location will stay.':postAdEntry==='vehicle'?'Changing category clears vehicle answers, Brand and Model selections, and seller-entered Brand/Model text. Your title, description, item pricing and location will stay.':undefined} cancel={() => setPendingCategory(null)} confirm={() => changeCategory(pendingCategory)} />}
        {vehicleCategory && postAdEntry === "vehicle" && <TwoWheelerFields key={vehicleCategory.id} category={vehicleCategory} states={vehicle!.references.states} answers={attributesState} change={handleAttributeChange} resolution={resolution} setResolution={setResolution} submissionEnabled={submissionEnabled} />}

        {/* Dynamic Category Attributes */}
        {activeCategoryAttributes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            {activeCategoryAttributes.map((attr) => (
              <div key={attr.id}>
                <label htmlFor={`listing-attribute-${attr.id}`} className="block text-xs font-semibold text-gray-700">
                  {attr.label} {attr.is_required && "*"}
                </label>
                {attr.value_type === "select" && attr.options ? (
                  <select
                    id={`listing-attribute-${attr.id}`}
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
                    id={`listing-attribute-${attr.id}`}
                    type="number"
                    value={(attributesState[attr.name] as number) ?? ""}
                    onChange={(e) =>
                      handleAttributeChange(attr.name, e.target.value ? Number(e.target.value) : "")
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <input
                    id={`listing-attribute-${attr.id}`}
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

      <ListingDetailsFields initialListing={initialListing} isProperty={postAdEntry==='property'} propertyIntegrated={postAdEntry==='property'} />
      {propertyCategory&&postAdEntry==='property'&&<PropertyDetails category={propertyCategory} answers={attributesState} change={handleAttributeChange} society={society} setSociety={setSociety}/>}

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
          isProperty={postAdEntry==='property'}
        />
      </div>

      {postAdEntry==='property' ? propertyCategory&&<PropertyCharges category={propertyCategory} financial={financial} change={setFinancial}/> : <ListingPricingFields priceType={priceType} priceRupees={priceRupees} setPriceType={setPriceType} setPriceRupees={setPriceRupees} priceStep={postAdEntry==="vehicle"?"0.01":"1"} />}

      {/* Section 5: Photos */}
      {!isEditing && postAdEntry === "goods" && <aside className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Photos come after a real draft is saved on the listing edit screen.</aside>}
      {isEditing && initialListing && (
        <div className="space-y-4 border-t pt-6" onClickCapture={()=>{setSavedContentOutdated(true);if(readiness)setReadinessOutdated(true);}}>
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">5. Photos</h2>
          <MediaUploader
            listingId={initialListing.id}
            initialMedia={initialMedia}
            coverPhotoId={initialListing.cover_photo_id}
          />
        </div>
      )}

      {/* Submit / Save buttons */}
      {testFamily&&isEditing&&<p className="text-sm">Submit sends the saved draft. After editing or managing photos, save changes and <a className="underline" href={`/account/listings/${initialListing!.id}/edit`}>reload the saved draft</a> before submitting. Failed submission retains your saved draft and entered details.</p>}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting || isMaintenanceActive || ((postAdEntry === "goods" || postAdEntry === "vehicle" || postAdEntry === "property") && !selectedCategory)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Save as Draft"}
        </button>

        {isEditing && (!testFamily||submissionEnabled) && (
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

