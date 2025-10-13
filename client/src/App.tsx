import React, { useState } from "react";
import { Switch, Route } from "wouter";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import HomeNew from "@/pages/Home-new";
import Inventory from "@/pages/Inventory";
import MasterInventory from "@/pages/MasterInventory";
import StockManagement from "@/pages/StockManagement";
import TransactionLog from "@/pages/TransactionLog";
import UserManagement from "@/pages/UserManagement";
import WeeklyStockPlanning from "@/pages/WeeklyStockPlanning";
import ProductCatalog from "@/pages/ProductCatalog";
import Reports from "@/pages/Reports";
import OrderDetails from "@/pages/OrderDetails";
import DailyReport from "@/pages/DailyReport";
import Layout from "@/components/Layout";
import SplashScreen from "@/components/SplashScreen";
import OrderReport from "@/pages/OrderReport";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import StorageManagement from "@/pages/StorageManagement";
import Label from "@/pages/Label";
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  console.log("Router Debug:", { isAuthenticated, isLoading, user });

  if (isLoading) {
    console.log("Showing loading state");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  console.log("Rendering routes, isAuthenticated:", isAuthenticated);

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
          <Route path="/" component={Login} />
        </>
      ) : (
        <Layout>
          <Switch>
            <Route
              path="/"
              component={() => {
                // Get user's active roles (support both single role and multiple roles)
                const userRoles =
                  (user as any)?.roles || [(user as any)?.role].filter(Boolean);
                const hasRole = (role: string) => userRoles.includes(role);

                // Always show Home-new page for all users (including those with no roles)
                // Home-new.tsx will handle the conditional logic for default vs role-specific buttons

                // Always show Home-new page - it handles all role scenarios
                return <HomeNew />;
              }}
            />
            <Route path="/inventory" component={Inventory} />
            <Route path="/master-inventory" component={MasterInventory} />
            <Route path="/stock-management" component={StockManagement} />
            <Route path="/transactions" component={TransactionLog} />
            <Route path="/users" component={UserManagement} />
            <Route
              path="/weekly-stock-planning"
              component={WeeklyStockPlanning}
            />
            <Route
              path="/product-catalog"
              component={() => <ProductCatalog />}
            />
            <Route path="/reports" component={Reports} />
            <Route path="/order-details" component={OrderDetails} />
            <Route path="/order-report" component={OrderReport} />
            <Route path="/daily-report" component={DailyReport} />
            <Route path="/storage-management" component={StorageManagement} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
             <Route path="/Label" component={Label} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;


