import Link from "next/link";
import { House, Package } from "lucide-react";
import {
  buildMacroCategoryUrl,
  type MacroCategory,
} from "@/lib/listings/macro-category";

export type MacroCategoryAvailability = Record<
  MacroCategory,
  { available: true } | { available: false; reason: string }
>;

interface MacroCategorySelectorProps {
  /** Presentation only; future route activation also requires server/DB gates. */
  availability: MacroCategoryAvailability;
  hrefForSection?: (macro: MacroCategory) => string;
  onChooseSection?: (macro: MacroCategory) => void;
  integrated?: boolean;
}

const sections = [
  {
    macro: "goods",
    name: "Goods",
    description: "Phones, electronics, furniture, appliances, fashion and kids' items.",
    Icon: Package,
  },
  {
    macro: "vehicles",
    name: "Vehicles",
    description: "Bikes and scooters, cars, bicycles and vehicle accessories.",
    Icon: MotorcycleIcon,
  },
  {
    macro: "property",
    name: "Property",
    description: "Homes for sale or rent, PGs and rooms, shops and offices.",
    Icon: House,
  },
] as const satisfies ReadonlyArray<{
  macro: MacroCategory;
  name: string;
  description: string;
  Icon: typeof Package | typeof MotorcycleIcon;
}>;

/** Original decorative motorcycle silhouette; the installed Bike icon is a bicycle. */
function MotorcycleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 17l4-6h5l-3 6H5m6 0h4l-2-6m6 6-4-10h-3m3 0h3M7 9h4m-2 2V9" />
    </svg>
  );
}

export default function MacroCategorySelector({
  availability,
  hrefForSection = buildMacroCategoryUrl,
  onChooseSection,
  integrated = false,
}: MacroCategorySelectorProps) {
  return (
    <section aria-label="Listing sections" className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        What would you like to list?
      </h1>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map(({ macro, name, description: previewDescription, Icon }) => {
          const description = integrated && macro === 'goods' ? 'Electronics, furniture, appliances, books and hobbies.' : integrated && macro === 'vehicles' ? 'Motorcycles, scooters and Cars. Test drafts only.' : integrated && macro === 'property' ? 'Monthly rentals, PG and co-living. Test drafts only.' : previewDescription;
          const state = availability[macro];
          const content = (
            <>
              <Icon aria-hidden="true" className="h-8 w-8 shrink-0 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
              <p className="text-sm leading-6 text-gray-600">{description}</p>
            </>
          );
          const cardClassName =
            "flex h-full min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6";

          return (
            <li key={macro} className="min-w-0">
              {state.available ? (
                <Link
                  href={hrefForSection(macro)}
                  onClick={onChooseSection ? (event) => { event.preventDefault(); onChooseSection(macro); } : undefined}
                  prefetch={false}
                  className={`${cardClassName} hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2`}
                >
                  {content}
                </Link>
              ) : (
                <article className={cardClassName}>
                  {content}
                  <p className="text-sm font-medium text-gray-700">
                    Unavailable: {state.reason}
                  </p>
                </article>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
