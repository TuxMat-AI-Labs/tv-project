import { ViewportLock } from "@/components/display/ViewportLock";

export const metadata = {
  title: "TuxDisplay",
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <ViewportLock />
      {children}
    </div>
  );
}
