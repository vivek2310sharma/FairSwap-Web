import { ratingsEnabled } from "@/lib/ratings/server";
import AccountChrome from "@/components/account/AccountChrome";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AccountChrome ratingsAvailable={ratingsEnabled()} />
      <div className="flex-1 flex flex-col min-w-0 w-full">{children}</div>
    </>
  );
}
