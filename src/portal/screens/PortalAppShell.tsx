import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";

export default function PortalAppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <Outlet />
      <BottomNav />
    </div>
  );
}
