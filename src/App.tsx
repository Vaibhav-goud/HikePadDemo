import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Index from "./pages/Index";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const TeamFlowchartPage = lazy(() => import("./pages/TeamFlowchartPage"));
const AdminUpload = lazy(() => import("./pages/AdminUpload"));
const AdminTeams = lazy(() => import("./pages/AdminTeams"));
const AdminDesignation = lazy(() => import("./pages/AdminDesignation"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const MyTeam = lazy(() => import("./pages/MyTeam"));
const KRAPage = lazy(() => import("./pages/KRAPage"));
const Revenue = lazy(() => import("./pages/Revenue"));
const Enrolled = lazy(() => import("./pages/Enrolled"));
const Performance = lazy(() => import("./pages/Performance"));
const MarchMadness = lazy(() => import("./pages/MarchMadness"));
const HikeWrapped = lazy(() => import("./pages/HikeWrapped"));
const UserImages = lazy(() => import("./pages/UserImages"));
const WriteUp = lazy(() => import("./pages/WriteUp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Index />} />
                <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations Leader', 'Vice President', 'Deputy Branch Manager', 'Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)', 'Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/kra" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations Leader', 'Vice President', 'Deputy Branch Manager', 'Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)', 'Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)']}>
                  <KRAPage />
                </ProtectedRoute>
              } />
              <Route path="/revenue" element={
                <ProtectedRoute allowedRoles={['Admin', 'Vice President', 'Operations Leader']}>
                  <Revenue />
                </ProtectedRoute>
              } />
              <Route path="/enrolled" element={
                <ProtectedRoute allowedRoles={['Admin', 'Vice President']}>
                  <Enrolled />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations Leader', 'Vice President', 'Deputy Branch Manager', 'Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)']}>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/my-team" element={
                <ProtectedRoute allowedRoles={['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)']}>
                  <MyTeam />
                </ProtectedRoute>
              } />
              <Route path="/teams" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <TeamFlowchartPage />
                </ProtectedRoute>
              } />
              <Route path="/performance" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations Leader', 'Vice President']}>
                  <Performance />
                </ProtectedRoute>
              } />
              <Route path="/admin/upload" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminUpload />
                </ProtectedRoute>
              } />
              <Route path="/admin/teams" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminTeams />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminDesignation />
                </ProtectedRoute>
              } />
              <Route path="/march-madness" element={
                <ProtectedRoute>
                  <MarchMadness />
                </ProtectedRoute>
              } />
              <Route path="/wrapped" element={
                <ProtectedRoute>
                  <HikeWrapped />
                </ProtectedRoute>
              } />
              <Route path="/admin/user-images" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <UserImages />
                </ProtectedRoute>
              } />
              <Route path="/write-up" element={
                <ProtectedRoute allowedRoles={['Admin', 'Super Admin', 'Operations Leader', 'Vice President', 'Deputy Branch Manager', 'Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)', 'Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)', 'Operations Executive']}>
                  <WriteUp />
                </ProtectedRoute>
              } />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
