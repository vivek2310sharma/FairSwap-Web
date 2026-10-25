"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction, type AccountActionResult } from "@/app/account/actions";
import { AvatarUploader } from "./AvatarUploader";
import { PincodeLocality } from "./PincodeLocality";

export interface ProfileEditorValues {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  email: string | null;
  memberSince: string | null;
  /** Public location label ("Locality, District") derived from saved details, or null. */
  publicLocation: string | null;
  fullName: string;
  pinCode: string;
  localityId: string;
  cityId: string;
}

interface ProfileEditorProps {
  mode: "edit" | "onboarding";
  values: ProfileEditorValues;
  /** Sanitized post-save destination (onboarding only). */
  next?: string;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500";
const labelClass = "block text-sm font-medium text-foreground";
const helpClass = "mt-1 text-xs text-muted";

export function ProfileEditor({ mode, values, next }: ProfileEditorProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AccountActionResult | null, FormData>(saveProfileAction, null);

  useEffect(() => {
    if (state?.redirectTo && (state.success || state.requiresPolicyReview || state.error)) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {state.message}
        </div>
      )}

      <section aria-labelledby="public-info" className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 id="public-info" className="text-lg font-bold text-foreground">
            Public information
          </h2>
          <p className="text-sm text-muted">Visible to buyers and sellers</p>
        </div>

        <AvatarUploader initialUrl={values.avatarUrl} displayName={values.displayName} />

        <div>
          <label htmlFor="displayName" className={labelClass}>
            Display Name *
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            minLength={2}
            maxLength={50}
            defaultValue={values.displayName}
            className={inputClass}
            aria-describedby="displayName-help"
          />
          <p id="displayName-help" className={helpClass}>
            2–50 characters. No phone numbers, email addresses, links or UPI IDs, and no names that suggest FairSwap
            support or an official role.
          </p>
        </div>

        <div>
          <label htmlFor="bio" className={labelClass}>
            About You
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={500}
            defaultValue={values.bio}
            className={inputClass}
            aria-describedby="bio-help"
          />
          <p id="bio-help" className={helpClass}>
            Tell other FairSwap members a little about yourself so they know who they are dealing with. Do not include
            phone numbers, email addresses, links or UPI IDs. Maximum 500 characters.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className={labelClass}>Public location</dt>
            <dd className="mt-1 text-foreground">{values.publicLocation ?? "Set from your PIN code and area below"}</dd>
            <p className={helpClass}>Only your area and district are shown. Never your PIN code.</p>
          </div>
          <div>
            <dt className={labelClass}>Member since</dt>
            <dd className="mt-1 text-foreground">
              {values.memberSince ? `On FairSwap since ${values.memberSince}.` : "—"}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted">Ratings and badges are coming soon.</p>
      </section>

      <section aria-labelledby="personal-info" className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 id="personal-info" className="text-lg font-bold text-foreground">
            Personal information
          </h2>
          <p className="text-sm text-muted">Only visible to you</p>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email Address
          </label>
          <input id="email" type="email" readOnly value={values.email ?? ""} className={`${inputClass} bg-surface`} />
          <p className={helpClass}>From your sign-in account. It cannot be changed here.</p>
        </div>

        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full Name
          </label>
          <input type="hidden" name="initialFullName" value={values.fullName} />
          <input
            id="fullName"
            name="fullName"
            type="text"
            maxLength={100}
            autoComplete="name"
            defaultValue={values.fullName}
            className={inputClass}
          />
          <p className={helpClass}>Optional. Private, and separate from your public display name.</p>
        </div>

        <PincodeLocality
          initialPin={values.pinCode}
          initialLocalityId={values.localityId}
          initialCityId={values.cityId}
          required={mode === "onboarding" || Boolean(values.pinCode)}
        />

        <div>
          <label htmlFor="preferredLanguage" className={labelClass}>
            Preferred Language
          </label>
          <select id="preferredLanguage" name="preferredLanguage" defaultValue="en" className={inputClass}>
            <option value="en">English</option>
            <option value="hi" disabled>
              हिन्दी (Hindi) — Coming soon
            </option>
          </select>
        </div>

        <p className="rounded-md bg-surface p-3 text-xs text-muted">
          Privacy: only your display name, photo, About You, area and district, and member-since date are visible to
          other users. Your email, full name, PIN code and language stay private to you.
        </p>
      </section>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center rounded-md bg-action-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Saving…" : mode === "onboarding" ? "Save and continue" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
