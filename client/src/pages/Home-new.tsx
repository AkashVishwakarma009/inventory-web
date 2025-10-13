import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AlertDashboard from "@/components/AlertDashboard";
import { getUserActiveRoles } from "@shared/schema";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  List,
  BarChart3,
  Plus,
  ArrowUp,
  ArrowDown,
  Calendar,
  CalendarCheck,
  FileText,
  ShoppingCart,
  MessageSquare,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  todayStockIn: number;
  todayStockOut: number;
  activeProducts: number;
  lowStockProducts: number;
}

export default function HomeNew() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled:
      isAuthenticated && showDashboard && (user as any)?.role === "super_admin",
  });

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="modern-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="modern-card text-center max-w-md mx-auto p-10">
          <img
            src="/assets/111_1750417572953.png"
            alt="Company Logo"
            className="h-20 w-auto mx-auto mb-6"
          />
          <h2 className="text-xl text-gray-600 mb-6">
            Inventory Management System
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-800 font-medium">Please log in to access the system.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get user's active roles (support both single role and multiple roles)
  const userRoles =
    (user as any)?.roles || [(user as any)?.role].filter(Boolean);
  const hasRole = (role: string) => userRoles.includes(role);

  // For users with no roles - show only default buttons (Sudhastar and Holy Creation)
  const hasAnyRoles = userRoles.length > 0;

  const isSuperAdmin = hasRole("super_admin");
  const isMasterInventoryHandler = hasRole("master_inventory_handler");
  const isStockInManager = hasRole("stock_in_manager");
  const isStockOutManager = hasRole("stock_out_manager");
  const isAttendanceChecker = hasRole("attendance_checker");

  // Show dashboard stats if Super Admin user clicked Dashboard button
  if (isSuperAdmin && showDashboard) {
    if (statsLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="page-container">
        <div className="max-w-7xl mx-auto">
          <div className="modern-card p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  📊 Dashboard Overview
                </h1>
                <p className="text-gray-600">Real-time insights for your inventory system</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDashboard(false)}
                className="btn-primary"
              >
                ← Back to Menu
              </Button>
            </div>
          </div>

          <div className="card-grid-responsive mb-8">
            <Card className="modern-card-hover bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Products
                </CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {stats?.totalProducts || 0}
                </div>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Active inventory items
                </p>
              </CardContent>
            </Card>
            
            <Card className="modern-card-hover bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Current Stock
                </CardTitle>
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                  {stats?.totalStock || 0}
                </div>
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1">
                  Total units in stock
                </p>
              </CardContent>
            </Card>
            
            <Card className="modern-card-hover bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Today Stock In
                </CardTitle>
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {stats?.todayStockIn || 0}
                </div>
                <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Units added today
                </p>
              </CardContent>
            </Card>
            
            <Card className="modern-card-hover bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Today Stock Out
                </CardTitle>
                <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {stats?.todayStockOut || 0}
                </div>
                <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Units removed today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alerts Section */}
          <div className="mt-8">
            <AlertDashboard />
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for all authenticated users  
  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="modern-card p-8 mb-8 text-center">
          <img
            src="/assets/111_1750417572953.png"
            alt="Sudhamrit Logo"
            className="h-12 w-auto mx-auto mb-4"
          />
{/*           <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {(user as any)?.username || 'User'}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Sudhamrit Inventory Management System
          </p> */}
          <div className="flex flex-wrap gap-2 justify-center">
            {getUserActiveRoles(user as any).map((role: any) => (
              <span 
                key={role}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {role.replace('_', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {/* Dashboard access - only for Super Admin role */}
          {hasRole("super_admin") && (
            <div
              className="modern-card cursor-pointer group"
              onClick={() => setShowDashboard(true)}
            >
              <div className="text-center">
                <div className="gradient-purple p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <BarChart3 className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard</h3>
                <p className="text-gray-600">View statistics & analytics</p>
              </div>
            </div>
          )}

          {/* Master Inventory access - for Master Inventory Handler role OR Super Admin */}
          {(hasRole("master_inventory_handler") || hasRole("super_admin")) && (
            <Link href="/master-inventory">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-blue p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Package className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Master Inventory</h3>
                  <p className="text-gray-600">Manage all products</p>
                </div>
              </div>
            </Link>
          )}

          {/* Stock In access - for Stock In Manager role OR Super Admin */}
          {(hasRole("stock_in_manager") || hasRole("super_admin")) && (
            <Link href="/stock-management?tab=stock-in">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-green p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <ArrowUp className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Stock In</h3>
                  <p className="text-gray-600">Add new inventory</p>
                </div>
              </div>
            </Link>
          )}

          {/* Stock Out access - for Stock Out Manager role OR Super Admin */}
          {(hasRole("stock_out_manager") || hasRole("super_admin")) && (
            <Link href="/stock-management?tab=stock-out">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-red p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <ArrowDown className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Stock Out</h3>
                  <p className="text-gray-600">Record item removal</p>
                </div>
              </div>
            </Link>
          )}

            {/* Storage Management - for Super Admin or Storage Management role */}
            {(hasRole("super_admin") || hasRole("storage_management")) && (
              <Link href="/storage-management">
                <div className="modern-card p-6 cursor-pointer group">
                  <div className="text-center">
                    <div className="gradient-purple p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                      <FileText className="text-white h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Storage Management</h3>
                    <p className="text-gray-600">Manage storage locations</p>
                  </div>
                </div>
              </Link>
            )}

          {/* Transaction Log access - only for Super Admin role */}
          {hasRole("super_admin") && (
            <Link href="/transactions">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-yellow p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <List className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Transaction Log</h3>
                  <p className="text-gray-600">View historical data</p>
                </div>
              </div>
            </Link>
          )}

          {/* User Management access - only for Super Admin role */}
          {hasRole("super_admin") && (
            <Link href="/users">
              <div className="modern-card p-6 cursor-pointer group relative">
                <div className="text-center">
                  <div className="gradient-pink p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Users className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-gray-600">Add or remove users</p>
                </div>
                <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  Action Needed
                </span>
              </div>
            </Link>
          )}

          {/* Attendance Portal access - for Attendance Checker role OR Super Admin */}
          {(hasRole("attendance_checker") || hasRole("super_admin")) && (
            <a
              href="https://attandace.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-indigo p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <CalendarCheck className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Portal</h3>
                  <p className="text-gray-600">Track attendance</p>
                </div>
              </div>
            </a>
          )}

          {/* Weekly Planner access - for Weekly Planner role OR Super Admin */}
          {(hasRole("weekly_stock_planner") || hasRole("super_admin")) && (
            <Link href="/weekly-stock-planning">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-teal p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Calendar className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Weekly Planner</h3>
                  <p className="text-gray-600">Plan weekly stock</p>
                </div>
              </div>
            </Link>
          )}

          {/* Order Details access - for Super Admin and order managers */}
          {(hasRole("super_admin") || hasRole("orders")) && (
            <Link href="/order-details">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-orange p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <List className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Order Details</h3>
                  <p className="text-gray-600">Manage customer orders</p>
                </div>
              </div>
            </Link>
          )}

          {/* Send Message access - for Send Message role OR Super Admin */}
          {(hasRole("send_message") || hasRole("super_admin")) && (
            <div className="modern-card p-6 cursor-pointer group">
              <div className="text-center">
                <div className="gradient-purple p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <MessageSquare className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Send Message</h3>
                <p className="text-gray-600">Communication center</p>
              </div>
            </div>
          )}

          {/* All Reports access - for All Reports role OR Super Admin */}
          {(hasRole("all_reports") || hasRole("super_admin")) && (
            <Link href="/reports">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-emerald p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <BarChart3 className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">All Reports</h3>
                  <p className="text-gray-600">Comprehensive analytics</p>
                </div>
              </div>
            </Link>
          )}

          {(hasRole("super_admin") || hasRole("label_printing")) && (
            <Link href="/Label">
              <div className="modern-card p-6 cursor-pointer group">
                <div className="text-center">
                  <div className="gradient-rose p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Printer className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Generate Label</h3>
                  <p className="text-gray-600">Labels</p>
                </div>
              </div>
            </Link>
          )}


          {/* Sudhastar - Always available */}
          <a
            href="https://sudhastar.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="modern-card p-6 cursor-pointer group">
              <div className="text-center">
                <div className="gradient-gold p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <ExternalLink className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sudhastar</h3>
                <p className="text-gray-600">External portal</p>
              </div>
            </div>
          </a>

          {/* Holy Creation - Always available */}
          <a
            href="https://holycreation.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="modern-card p-6 cursor-pointer group">
              <div className="text-center">
                <div className="gradient-rose p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <ExternalLink className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Holy Creation</h3>
                <p className="text-gray-600">Creative portal</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

