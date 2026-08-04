import { ViewportLock } from "@/components/display/ViewportLock";
import { RegisterServiceWorker } from "@/components/display/RegisterServiceWorker";

export const metadata = {
  title: "TuxDisplay",
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <ViewportLock />
      <RegisterServiceWorker />
      {children}
    </div>
  );
}
