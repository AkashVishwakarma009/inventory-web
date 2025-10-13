import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Product } from "@shared/schema";
// Helper to format nullable/unknown expiry date values to YYYY-MM-DD for inputs or to a human string for table
function toInputDate(value: unknown): string {
  if (!value) return "";
  try {
    // Handle Date or string
    const d = value instanceof Date ? value : new Date(String(value));
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function formatExpiry(value: unknown): string {
  const s = toInputDate(value);
  return s || "-";
}

interface ProductCatalogProps {
  className?: string;
}

export default function ProductCatalog({ className }: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; unit: string; currentStock: string; openingStock: string; storageLocation?: string; storageRow?: string; storageDeck?: string; expiryDate?: string }>({
    name: "",
    unit: "",
    currentStock: "",
    openingStock: "",
    storageLocation: "",
    storageRow: "",
    storageDeck: "",
    expiryDate: "",
  });

  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch storage locations and section dimensions to determine which locations are 'section-mode'
  const { data: locations } = useQuery({ queryKey: ["/api/storage-locations"] });
  const { data: sectionDims } = useQuery({ queryKey: ["/api/storage-dimensions?type=section"] });

  const sectionLocationNames = useMemo(() => {
    try {
      const locs = Array.isArray(locations) ? (locations as any[]) : [];
      const dims = Array.isArray(sectionDims) ? (sectionDims as any[]) : [];
      const idToName = new Map<number, string>();
      for (const l of locs) {
        if (typeof l?.id === "number" && typeof l?.name === "string") {
          idToName.set(l.id, l.name);
        }
      }
      const names = new Set<string>();
      for (const d of dims) {
        const n = idToName.get(d?.locationId as number);
        if (n) names.add(n);
      }
      return names;
    } catch {
      return new Set<string>();
    }
  }, [locations, sectionDims]);

  // Fallbacks when dynamic data is not available
  const fallbackLocations = [
    "Dry Storage Location",
    "Cold Storage",
    "Freezer Storage",
    "Overflow Storage",
    "Package Storage Room",
  ];
  const fallbackRows = Array.from({ length: 4 }, (_, i) => `Row ${i + 1}`);
  const fallbackDecks = Array.from({ length: 4 }, (_, i) => `Deck ${i + 1}`);
  const fallbackSections = ["B1", "B2", "B3", "B4"];

  // Compute storage location options and selected location id based on edit form
  const storageLocationOptions = useMemo(() => {
    const locs = Array.isArray(locations) ? (locations as any[]) : [];
    if (locs.length > 0) return locs.map((l) => l.name as string);
    return fallbackLocations;
  }, [locations]);

  const selectedLocationId = useMemo(() => {
    if (!editForm.storageLocation) return undefined;
    const locs = Array.isArray(locations) ? (locations as any[]) : [];
    const found = locs.find((l) => l?.name === editForm.storageLocation);
    return found?.id as number | undefined;
  }, [locations, editForm.storageLocation]);

  // Fetch dynamic dimensions for the currently selected location in the edit form
  const { data: dynamicSectionsResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "section"],
    enabled: !!selectedLocationId && !!editProduct,
    queryFn: async () => {
      const res = await fetch(`/api/storage-dimensions?locationId=${selectedLocationId}&type=section`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sections");
      return res.json();
    },
  });
  const { data: dynamicRowsResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "row"],
    enabled: !!selectedLocationId && !!editProduct,
    queryFn: async () => {
      const res = await fetch(`/api/storage-dimensions?locationId=${selectedLocationId}&type=row`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load rows");
      return res.json();
    },
  });
  const { data: dynamicDecksResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "deck"],
    enabled: !!selectedLocationId && !!editProduct,
    queryFn: async () => {
      const res = await fetch(`/api/storage-dimensions?locationId=${selectedLocationId}&type=deck`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load decks");
      return res.json();
    },
  });

  const dynamicSections: string[] = useMemo(() => {
    return Array.isArray(dynamicSectionsResp)
      ? (dynamicSectionsResp as any[]).map((d) => (d as any).name as string)
      : [];
  }, [dynamicSectionsResp]);
  const dynamicRows: string[] = useMemo(() => {
    return Array.isArray(dynamicRowsResp)
      ? (dynamicRowsResp as any[]).map((d) => (d as any).name as string)
      : [];
  }, [dynamicRowsResp]);
  const dynamicDecks: string[] = useMemo(() => {
    return Array.isArray(dynamicDecksResp)
      ? (dynamicDecksResp as any[]).map((d) => (d as any).name as string)
      : [];
  }, [dynamicDecksResp]);

  // Determine section mode for the selected location using global section names set
  const sectionMode = useMemo(() => {
    const loc = editForm.storageLocation || "";
    return loc ? sectionLocationNames.has(loc) : false;
  }, [editForm.storageLocation, sectionLocationNames]);

  // Normalize edit form values when location or dimensions change
  useEffect(() => {
    if (!editProduct) return;
    if (sectionMode) {
      const available = dynamicSections.length > 0 ? dynamicSections : fallbackSections;
      if (!editForm.storageRow || !available.includes(editForm.storageRow)) {
        setEditForm((f) => ({ ...f, storageRow: available[0] }));
      }
      // Deck is hidden in section mode; keep any value but it's not used
    } else {
      const rows = dynamicRows.length > 0 ? dynamicRows : fallbackRows;
      const decks = dynamicDecks.length > 0 ? dynamicDecks : fallbackDecks;
      if (!editForm.storageRow || !rows.includes(editForm.storageRow)) {
        setEditForm((f) => ({ ...f, storageRow: rows[0] }));
      }
      if (!editForm.storageDeck || !decks.includes(editForm.storageDeck)) {
        setEditForm((f) => ({ ...f, storageDeck: decks[0] }));
      }
    }
  }, [editProduct, sectionMode, dynamicSections, dynamicRows, dynamicDecks]);

  // Mutation for updating product
  const updateProductMutation = useMutation({
    mutationFn: async (updated: { name: string; unit: string; openingStock: string; currentStock: string; storageLocation?: string; storageRow?: string; storageDeck?: string; expiryDate?: string | null }) => {
      const res = await fetch(`/api/products/${editProduct?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditProduct(null);
    },
  });

  // Filter and sort products based on search and filters with priority
  const filteredProducts = (products || []).filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnit = unitFilter === "all" || product.unit === unitFilter;
    
    let matchesStock = true;
    if (stockFilter === "in-stock") {
      matchesStock = parseFloat(product.currentStock) > 10;
    } else if (stockFilter === "low-stock") {
      matchesStock = parseFloat(product.currentStock) <= 10 && parseFloat(product.currentStock) > 0;
    } else if (stockFilter === "out-of-stock") {
      matchesStock = parseFloat(product.currentStock) === 0;
    }
    
    return matchesSearch && matchesUnit && matchesStock;
  }).sort((a: Product, b: Product) => {
    if (!searchQuery) return a.name.localeCompare(b.name);
    
    const queryLower = searchQuery.toLowerCase();
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();
    
    // Priority 1: Names that start with the search query
    const aStartsWith = aNameLower.startsWith(queryLower);
    const bStartsWith = bNameLower.startsWith(queryLower);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // If both start with query or neither starts with query, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  // Get unique units for filter dropdown, filtering out empty values
  const availableUnits = Array.from(new Set((products || []).map((p: Product) => p.unit).filter((unit: string) => unit && unit.trim() !== '')));

  // Get stock status for a product
  const getStockStatus = (stock: string) => {
    const stockNum = parseFloat(stock);
    if (stockNum === 0) return { status: "out-of-stock", label: "Out of Stock", color: "bg-red-500" };
    if (stockNum <= 10) return { status: "low-stock", label: "Low Stock", color: "bg-yellow-500" };
    return { status: "in-stock", label: "In Stock", color: "bg-green-500" };
  };

  // Format stock display to remove unnecessary decimals
  const formatStock = (stock: string) => {
    const num = parseFloat(stock);
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load products</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 animated-gradient-bg p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          {/* Back Button - Enhanced Visibility */}
          <div className="mb-6 sm:mb-8">
            <Link href="/master-inventory">
              <button className="group flex items-center gap-3 px-6 py-3 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm sm:text-base min-h-[48px] w-full sm:w-auto justify-center sm:justify-start">
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                <span>Back to Master Inventory</span>
              </button>
            </Link>
          </div>
          
          {/* Title Section */}
          <div className="glass-card hover-float p-6 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Product Catalog
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 px-2 sm:px-0 max-w-2xl">
              Browse and search all <span className="font-semibold text-blue-600">{products?.length || 0}</span> products in your inventory system
            </p>
          </div>
        </div>

        {/* Search and Filter Controls - Enhanced Card Design */}
        <Card className="mb-6 sm:mb-8 glass-card hover-float">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by product name..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-h-[48px] bg-white transition-all duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Filter by Unit</Label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="min-h-[48px] border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Filter by Stock Level</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="min-h-[48px] border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="All Stock Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || unitFilter !== "all" || stockFilter !== "all") && (
              <div className="flex justify-center pt-4 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setUnitFilter("all");
                    setStockFilter("all");
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-sm sm:text-base text-gray-600">
            Showing {filteredProducts.length} of {products?.length || 0} products
          </p>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Products Found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="glass-card overflow-x-auto p-0">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur z-10">
                <tr className="text-gray-700 text-xs uppercase tracking-wide">
                  <th className="p-3 md:p-4 border-b border-gray-200">Name</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Unit</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Location</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Expiry</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Current Stock</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Opening Stock</th>
                  <th className="p-3 md:p-4 border-b border-gray-200">Status</th>
                  <th className="p-3 md:p-4 border-b border-gray-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: Product) => {
                  const stockStatus = getStockStatus(product.currentStock);
                  return (
                    <tr key={product.id} className="odd:bg-white/70 even:bg-white hover:bg-indigo-50/60 transition-colors">
                      <td className="p-3 md:p-4 border-b border-gray-100 text-gray-900 font-medium">{product.name}</td>
                      <td className="p-3 md:p-4 border-b border-gray-100">
                        <Badge variant="outline" className="text-xs">{product.unit}</Badge>
                      </td>
                      <td className="p-3 md:p-4 border-b border-gray-100 text-sm text-gray-600">
                        {((product as any).storageLocation || "-")}
                        {(() => {
                          const loc = (product as any).storageLocation as string | undefined;
                          const row = (product as any).storageRow as string | undefined;
                          const deck = (product as any).storageDeck as string | undefined;
                          if (!row && !deck) return null;
                          const isSectionMode = loc && sectionLocationNames.has(loc);
                          if (isSectionMode) {
                            // For locations with defined Sections, show Section only and hide deck
                            return (
                              <div className="text-xs text-gray-400 mt-1">
                                {row ? `Section: ${row}` : ""}
                              </div>
                            );
                          }
                          return (
                            <div className="text-xs text-gray-400 mt-1">
                              {row ? `Row: ${row}` : ""}
                              {deck ? (row ? ` • Deck: ${deck}` : `Deck: ${deck}`) : ""}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 md:p-4 border-b border-gray-100 text-sm text-gray-600">{formatExpiry((product as any).expiryDate)}</td>
                      <td className="p-3 md:p-4 border-b border-gray-100">
                        {formatStock(product.currentStock)} {product.unit}
                      </td>
                      <td className="p-3 md:p-4 border-b border-gray-100 text-gray-500">
                        {formatStock(product.openingStock)} {product.unit}
                      </td>
                      <td className="p-3 md:p-4 border-b border-gray-100">
                        <Badge variant="secondary" className={`${stockStatus.color} text-white text-xs`}>
                          {stockStatus.label}
                        </Badge>
                      </td>
                      <td className="p-3 md:p-4 border-b border-gray-100 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditProduct(product);
                            setEditForm({
                              name: product.name,
                              unit: product.unit,
                              currentStock: product.currentStock,
                              openingStock: product.openingStock,
                              storageLocation: (product as any).storageLocation || "",
                              storageRow: (product as any).storageRow || "",
                              storageDeck: (product as any).storageDeck || "",
                              expiryDate: toInputDate((product as any).expiryDate),
                            });
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                value={editForm.unit}
                onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
              />
              <Label htmlFor="edit-currentStock">Current Stock</Label>
              <Input
                id="edit-currentStock"
                type="number"
                value={editForm.currentStock}
                onChange={e => setEditForm(f => ({ ...f, currentStock: e.target.value }))}
              />
              <Label htmlFor="edit-openingStock">Opening Stock</Label>
              <Input
                id="edit-openingStock"
                type="number"
                value={editForm.openingStock}
                onChange={e => setEditForm(f => ({ ...f, openingStock: e.target.value }))}
              />
              <Label htmlFor="edit-storageLocation">Storage Location</Label>
              <Select
                value={editForm.storageLocation || ""}
                onValueChange={(val) => setEditForm((f) => ({ ...f, storageLocation: val }))}
              >
                <SelectTrigger id="edit-storageLocation" className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {storageLocationOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {sectionMode ? (
                <>
                  <Label htmlFor="edit-storageSection">Section</Label>
                  <Select
                    value={editForm.storageRow || ""}
                    onValueChange={(val) => setEditForm((f) => ({ ...f, storageRow: val }))}
                  >
                    <SelectTrigger id="edit-storageSection" className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {(dynamicSections.length > 0 ? dynamicSections : fallbackSections).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Label htmlFor="edit-storageRow">Row</Label>
                  <Select
                    value={editForm.storageRow || ""}
                    onValueChange={(val) => setEditForm((f) => ({ ...f, storageRow: val }))}
                  >
                    <SelectTrigger id="edit-storageRow" className="w-full">
                      <SelectValue placeholder="Select row" />
                    </SelectTrigger>
                    <SelectContent>
                      {(dynamicRows.length > 0 ? dynamicRows : fallbackRows).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label htmlFor="edit-storageDeck">Deck</Label>
                  <Select
                    value={editForm.storageDeck || ""}
                    onValueChange={(val) => setEditForm((f) => ({ ...f, storageDeck: val }))}
                  >
                    <SelectTrigger id="edit-storageDeck" className="w-full">
                      <SelectValue placeholder="Select deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {(dynamicDecks.length > 0 ? dynamicDecks : fallbackDecks).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Label htmlFor="edit-expiryDate">Expiry Date</Label>
              <Input
                id="edit-expiryDate"
                type="date"
                value={editForm.expiryDate || ""}
                onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (editProduct) {
                    const payload: { name: string; unit: string; openingStock: string; currentStock: string; storageLocation?: string; storageRow?: string; storageDeck?: string; expiryDate?: string | null } = {
                      name: editForm.name,
                      unit: editForm.unit,
                      openingStock: editForm.openingStock,
                      currentStock: editForm.currentStock,
                      storageLocation: editForm.storageLocation,
                      storageRow: editForm.storageRow,
                      storageDeck: editForm.storageDeck,
                    };
                    // Normalize expiry: send null if empty so backend (nullable) accepts it; otherwise send as YYYY-MM-DD
                    if (editForm.expiryDate && editForm.expiryDate.trim() !== "") {
                      payload.expiryDate = editForm.expiryDate;
                    } else {
                      payload.expiryDate = null;
                    }
                    updateProductMutation.mutate(payload);
                   }
                 }}
                 disabled={updateProductMutation.isPending}
               >
                 Save
               </Button>
               <Button variant="ghost" onClick={() => setEditProduct(null)}>
                 Cancel
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </div>
   );
}
