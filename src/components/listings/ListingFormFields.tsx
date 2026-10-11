"use client";
import React from "react";
import type { Listing } from "@/types/listing";
export interface CommonDetails { title: string; description: string; condition: string }
export function ListingDetailsFields({initialListing, common, onCommonChange, isProperty = false,propertyIntegrated=false}: {initialListing?: Listing | null; common?: CommonDetails; onCommonChange?: (field: keyof CommonDetails, value: string) => void; isProperty?: boolean;propertyIntegrated?:boolean}) { return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">{propertyIntegrated?'2. Property details':common ? "2. Details" : "2. Item Details"}</h2>
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
            {...(common ? { value: common.title, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCommonChange?.("title", e.target.value) } : { defaultValue: initialListing?.title || "" })}
            placeholder={propertyIntegrated?'Describe the advertised rental':'e.g. Sony WH-1000XM4 Wireless Headphones'}
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
            {...(common ? { value: common.description, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onCommonChange?.("description", e.target.value) } : { defaultValue: initialListing?.description || "" })}
            placeholder={propertyIntegrated?'Describe the rental and seller-declared facilities':'Describe the item condition, history, included accessories, etc.'}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {!isProperty && <div>
          <label htmlFor="condition" className="block text-xs font-semibold text-gray-700">
            Condition *
          </label>
          <select
            id="condition"
            name="condition"
            {...(common ? { value: common.condition, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onCommonChange?.("condition", e.target.value) } : { defaultValue: initialListing?.condition || "good" })}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="new">New (Unopened)</option>
            <option value="like_new">Like New (Barely used)</option>
            <option value="good">Good (Normal wear)</option>
            <option value="fair">Fair (Visible wear, functional)</option>
            <option value="poor">Poor (For parts / repair)</option>
          </select>
        </div>}
        {isProperty && !propertyIntegrated && <p className="text-sm text-amber-800">Property-specific fields and sale / monthly rent pricing are awaiting integration. Item condition does not apply.</p>}
      </div>


); }
export function ListingPricingFields({priceType, priceRupees, setPriceType, setPriceRupees,priceStep="1"}: {priceType: string; priceRupees: string; setPriceType: (value: string) => void; setPriceRupees: (value: string) => void;priceStep?:string}) { return (
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
                step={priceStep}
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="2500"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>


); }
