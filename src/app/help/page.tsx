import { redirect } from "next/navigation";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

/**
 * Legacy /help bookmarks are preserved with a temporary 307 redirect.
 * Do not forward incoming query strings; they may contain private information.
 * Public FAQs now live exclusively on the independent Help Centre.
 */
export default function HelpPage() {
  redirect(HELP_CENTRE_URL);
}
