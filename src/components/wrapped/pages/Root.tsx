import { Outlet } from "react-router";
import { GrainOverlay } from "../components/GrainOverlay";

export default function Root() {
  return (
    <div className="relative bg-[#FFFEF5] min-h-screen overflow-hidden">
      <GrainOverlay />
      <Outlet />
    </div>
  );
}
