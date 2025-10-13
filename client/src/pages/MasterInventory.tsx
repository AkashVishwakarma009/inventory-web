
import { Button } from "@/components/ui/button";
import { Package, Calendar, ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function MasterInventory() {
  const { user } = useAuth();
  
  // Debug: Log the current user and their role
  console.log("MasterInventory page - Current user:", user);
  console.log("MasterInventory page - User role:", (user as any)?.role);
  
  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Back to Home Button */}
        <div className="mb-8">
          <Link href="/">
            <Button className="btn-primary flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header Card */}
        <div className="modern-card p-8 text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Master Inventory Selection
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Manage products, plan weekly stock, or browse catalog
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
            <p className="text-green-800 font-medium">
              ✓ Master Inventory Access - Role: {(user as any)?.role}
            </p>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Manage Products */}
          <Link href="/inventory?direct=true">
            <div className="modern-card cursor-pointer group">
              <div className="text-center">
                <div className="gradient-blue p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Products</h3>
                <p className="text-gray-600">Create and manage products</p>
              </div>
            </div>
          </Link>

          {/* Product Catalog */}
          <Link href="/product-catalog">
            <div className="modern-card cursor-pointer group">
              <div className="text-center">
                <div className="gradient-purple p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <Search className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Product Catalog</h3>
                <p className="text-gray-600">Browse product catalog</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
