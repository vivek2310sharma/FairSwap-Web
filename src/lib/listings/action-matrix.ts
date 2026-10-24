import { ListingStatus } from "@/types/listing";

export type ListingActionType = "link" | "submit_action" | "transition_action";

export interface ListingAction {
  id: string;
  label: string;
  type: ListingActionType;
  href?: string;
  transitionAction?: "pause" | "reserve" | "unreserve" | "resume" | "mark_sold" | "renew";
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

export interface ResolvedListingActions {
  primary: ListingAction;
  secondary: ListingAction[];
}

export interface ListingActionContext {
  id: string;
  slug?: string | null;
  status: ListingStatus;
  renewal_count: number;
  propertyDraft?: boolean;
  vehicleDraft?: boolean;
  unresolvedFamily?: boolean;
}

export function resolveListingActions(
  listing: ListingActionContext
): ResolvedListingActions {
  const {
    id,
    slug,
    status,
    renewal_count = 0,
    propertyDraft = false,
    vehicleDraft = false,
    unresolvedFamily = false,
  } = listing;

  const detailHref = slug && slug.trim() ? `/listings/${slug}` : `/listings/${id}`;
  const editHref = `/account/listings/${id}/edit`;

  const editAction: ListingAction = {
    id: "edit",
    label: "Edit",
    type: "link",
    href: editHref,
  };

  const viewSavedDetailsAction: ListingAction = {
    id: "edit",
    label: "View saved details",
    type: "link",
    href: editHref,
  };

  const viewDetailsAction: ListingAction = {
    id: "view_details",
    label: "View details",
    type: "link",
    href: detailHref,
  };

  const markSoldAction: ListingAction = {
    id: "mark_sold",
    label: "Mark as sold",
    type: "transition_action",
    transitionAction: "mark_sold",
    requiresConfirmation: true,
    confirmationTitle: "Mark Ad as Sold?",
    confirmationMessage:
      "Are you sure you want to mark this ad as sold? It will no longer be visible to buyers on the marketplace.",
  };

  const pauseAction: ListingAction = {
    id: "pause",
    label: "Pause",
    type: "transition_action",
    transitionAction: "pause",
  };

  const reserveAction: ListingAction = {
    id: "reserve",
    label: "Mark reserved",
    type: "transition_action",
    transitionAction: "reserve",
  };

  const unreserveAction: ListingAction = {
    id: "unreserve",
    label: "Unreserve",
    type: "transition_action",
    transitionAction: "unreserve",
  };

  const resumeAction: ListingAction = {
    id: "resume",
    label: "Resume",
    type: "transition_action",
    transitionAction: "resume",
  };

  const submitAction: ListingAction = {
    id: "submit",
    label: "Submit for review",
    type: "submit_action",
  };

  switch (status) {
    case "active":
      return {
        primary: markSoldAction,
        secondary: [editAction, pauseAction, reserveAction],
      };

    case "reserved":
      return {
        primary: markSoldAction,
        secondary: [unreserveAction, editAction],
      };

    case "paused":
      return {
        primary: resumeAction,
        secondary: [editAction, markSoldAction],
      };

    case "draft": {
      const isEligible = !propertyDraft && !vehicleDraft && !unresolvedFamily;
      return {
        primary: {
          id: "edit",
          label: "Continue editing",
          type: "link",
          href: editHref,
        },
        secondary: isEligible ? [submitAction] : [],
      };
    }

    case "pending_review":
      return {
        primary: viewDetailsAction,
        secondary: [propertyDraft || vehicleDraft ? viewSavedDetailsAction : editAction],
      };

    case "expired": {
      const renewalsRemaining = 3 - renewal_count;
      if (renewalsRemaining > 0) {
        return {
          primary: {
            id: "renew",
            label: `Renew (${renewalsRemaining} left)`,
            type: "transition_action",
            transitionAction: "renew",
          },
          secondary: [editAction],
        };
      }
      return {
        primary: editAction,
        secondary: [],
      };
    }

    case "rejected":
      return {
        primary: {
          id: "edit",
          label: "Fix ad",
          type: "link",
          href: editHref,
        },
        secondary: [],
      };

    case "sold":
      return {
        primary: viewDetailsAction,
        secondary: [editAction],
      };

    case "removed":
      return {
        primary: viewDetailsAction,
        secondary: [],
      };

    default:
      return {
        primary: viewDetailsAction,
        secondary: [],
      };
  }
}
