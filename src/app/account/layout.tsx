import { Header } from "@/components/header";
import { AccountNav } from "@/components/account/AccountNav";
import { loadHeaderViewer } from "@/lib/account/viewer";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await loadHeaderViewer();

  return (
    <>
      <Header viewer={viewer} />
      <AccountNav />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
