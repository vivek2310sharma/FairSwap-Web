import { Header } from "@/components/header";
import { AccountNav } from "@/components/account/AccountNav";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <AccountNav />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
