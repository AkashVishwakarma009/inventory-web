import { ReactNode } from "react";
import { User, getUserActiveRoles, UserRole } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { Link } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = "/";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'master_inventory_handler':
        return 'bg-blue-100 text-blue-800';
      case 'stock_in_manager':
        return 'bg-green-100 text-green-800';
      case 'stock_out_manager':
        return 'bg-yellow-100 text-yellow-800';
     case 'attendance_checker':
        return 'bg-blue-100 text-blue-800';
      case 'weekly_stock_planner':
        return 'bg-pink-100 text-pink-800'; // <-- Add this
      case 'orders':
        return 'bg-orange-100 text-orange-800';
      case 'send_message':
        return 'bg-purple-100 text-purple-800';
      case 'all_reports':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '👑 Super Admin';
      case 'master_inventory_handler':
        return '🧑‍🔧 Master Inventory Handler';
      case 'stock_in_manager':
        return '📥 Stock In Manager';
      case 'stock_out_manager':
        return '📤 Stock Out Manager';
      case 'attendance_checker':
        return '📅 Attendance Checker';
      case 'weekly_stock_planner':
        return '📊 Weekly Stock Planner'; // <-- Add this
      case 'orders':
        return '🛒 Orders';
      case 'send_message':
        return '✉️ Send Message';
      case 'all_reports':
        return '📑 All Reports';
      default:
        return role;
    }
  };



  return (
    <div className="min-h-screen app-container webview-optimized bg-white paper-texture">
      {/* Clean Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 safe-area-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            <Link href="/">
              <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <img 
                  src="/assets/111_1750417572953.png" 
                  alt="Sudhamrit Logo" 
                  className="h-7 sm:h-8 w-auto"
                />
              </div>
            </Link>
            
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {user && (
                <>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-end sm:items-center">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getUserActiveRoles(user as User).map((role: UserRole) => (
                        <Badge key={role} className={`${getRoleBadgeColor(role)} border-0 text-xs px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap`}>
                          <span className="hidden lg:inline">{getRoleDisplayName(role)}</span>
                          <span className="lg:hidden">{getRoleDisplayName(role).split(' ')[0]}</span>
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700 hidden sm:block truncate">
                      {(user as User)?.firstName || (user as User)?.username || (user as User)?.email || 'User'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-600 border-gray-300 hover:bg-gray-50 min-h-[44px] min-w-[44px] no-zoom flex-shrink-0"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="safe-area-bottom mobile-full-width">
        <div className="webview-optimized">
          {children}
        </div>
      </div>
    </div>
  );
}
