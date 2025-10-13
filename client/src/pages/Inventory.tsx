import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertProductSchema,
  updateProductSchema,
  type Product,
  type StorageLocation,
} from "@shared/schema";
import { z } from "zod";

// Extend schemas to include openingStock and storage info
const productFormSchema = insertProductSchema.extend({
  openingStock: z.string().min(1, "Opening stock is required"),
  storageLocation: z.string().min(1, "Storage location is required"),
  storageRow: z.string().min(1, "Storage row is required"),
  storageDeck: z.string().min(1, "Storage deck is required"),
  expiryDate: z.string().optional(),
});

const updateFormSchema = updateProductSchema.extend({
  openingStock: z.string().min(1, "Opening stock is required"),
  storageLocation: z.string().min(1, "Storage location is required"),
  storageRow: z.string().min(1, "Storage row is required"),
  storageDeck: z.string().min(1, "Storage deck is required"),
  expiryDate: z.string().optional(),
});

export default function Inventory() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [lastUsedUnit, setLastUsedUnit] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastUsedUnit") || "Pieces";
    }
    return "Pieces";
  });

  // Define storage layout: first one is Dry Storage Location (4 rows × 4 decks).
  // Fallback static locations; will be replaced with live list from API
  const fallbackLocations = [
    "Dry Storage Location",
    "Cold Storage",
    "Freezer Storage",
    "Overflow Storage",
    "Package Storage Room",
  ];
  const rows = Array.from({ length: 4 }, (_, i) => `Row ${i + 1}`);
  const decks = Array.from({ length: 4 }, (_, i) => `Deck ${i + 1}`);
  const packageSections = ["B1", "B2", "B3", "B4"]; // fallback when no sections returned

  const addForm = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      unit: "",
      openingStock: "",
      storageLocation: "Dry Storage Location",
      storageRow: rows[0],
      storageDeck: decks[0],
      expiryDate: "",
    },
  });

  // Watch storage location to drive conditional UI/validation
  const watchLocation = addForm.watch("storageLocation");

  // No-op here; validation is handled below based on server-provided dimensions

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the inventory.",
        variant: "destructive",
      });
      return;
    }
  }, [isLoading, isAuthenticated, toast]);

  // Load last used unit from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUnit = localStorage.getItem("lastUsedUnit");
      if (storedUnit) {
        addForm.setValue("unit", storedUnit);
      }
    }
  }, []);

  const editForm = useForm<z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      name: "",
      unit: "",
      openingStock: "",
      storageLocation: "Dry Storage Location",
      storageRow: rows[0],
      storageDeck: decks[0],
      expiryDate: "",
    },
  });

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["/api/products"],
    enabled: isAuthenticated && !!user,
  });

  // Load storage locations dynamically
  const { data: storageLocationsData } = useQuery({
    queryKey: ["/api/storage-locations"],
    enabled: isAuthenticated && !!user,
  });

  const storageLocationOptions: string[] = Array.isArray(storageLocationsData) && storageLocationsData.length > 0
    ? (storageLocationsData as any[]).map((l) => (l as StorageLocation).name)
    : fallbackLocations;

  // Compute selected location id for dimension fetches
  const selectedLocationId = Array.isArray(storageLocationsData)
    ? (storageLocationsData as any[]).find((l) => (l as StorageLocation).name === (watchLocation || ""))?.id
    : undefined;

  // Fetch dynamic sections for the selected location
  const { data: dynamicSectionsResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "section"],
    enabled: isAuthenticated && !!user && !!selectedLocationId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/storage-dimensions?locationId=${selectedLocationId}&type=section`);
      return await res.json();
    },
  });
  const dynamicSections: string[] = Array.isArray(dynamicSectionsResp)
    ? (dynamicSectionsResp as any[]).map((d) => (d as any).name)
    : [];

  // Fetch dynamic rows and decks for non-section locations
  const { data: dynamicRowsResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "row"],
    enabled: isAuthenticated && !!user && !!selectedLocationId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/storage-dimensions?locationId=${selectedLocationId}&type=row`);
      return await res.json();
    },
  });
  const dynamicRows: string[] = Array.isArray(dynamicRowsResp)
    ? (dynamicRowsResp as any[]).map((d) => (d as any).name)
    : [];

  const { data: dynamicDecksResp } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId, "deck"],
    enabled: isAuthenticated && !!user && !!selectedLocationId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/storage-dimensions?locationId=${selectedLocationId}&type=deck`);
      return await res.json();
    },
  });
  const dynamicDecks: string[] = Array.isArray(dynamicDecksResp)
    ? (dynamicDecksResp as any[]).map((d) => (d as any).name)
    : [];

  // Determine if selected location is 'section mode': has any sections defined
  const sectionMode = dynamicSections.length > 0;

  // Keep form values valid based on the selected location's dimensions
  useEffect(() => {
    if (!selectedLocationId) return;
    if (sectionMode) {
      const availableSections = dynamicSections.length > 0 ? dynamicSections : packageSections;
      const current = addForm.getValues("storageRow");
      if (!current || !availableSections.includes(current)) {
        addForm.setValue("storageRow", availableSections[0], { shouldValidate: true, shouldDirty: true });
      }
      addForm.clearErrors("storageRow");
      // Deck hidden in section mode; keep a safe default but don't require validation
      addForm.setValue("storageDeck", decks[0], { shouldValidate: false });
      addForm.clearErrors("storageDeck");
    } else {
      const availableRows = dynamicRows.length > 0 ? dynamicRows : rows;
      const currentRow = addForm.getValues("storageRow");
      if (!currentRow || !availableRows.includes(currentRow) || packageSections.includes(currentRow)) {
        addForm.setValue("storageRow", availableRows[0], { shouldValidate: true, shouldDirty: true });
      }
      const availableDecks = dynamicDecks.length > 0 ? dynamicDecks : decks;
      const currentDeck = addForm.getValues("storageDeck");
      if (!currentDeck || !availableDecks.includes(currentDeck)) {
        addForm.setValue("storageDeck", availableDecks[0], { shouldValidate: true, shouldDirty: true });
      }
      addForm.clearErrors(["storageRow", "storageDeck"] as any);
    }
  }, [selectedLocationId, sectionMode, dynamicSectionsResp, dynamicRowsResp, dynamicDecksResp]);

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: (_data, variables) => {
      localStorage.setItem("lastUsedUnit", variables.unit);
      setLastUsedUnit(variables.unit);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      addForm.reset({
        name: "",
        unit: variables.unit, // Keep the last used unit
        openingStock: "",
        storageLocation: variables.storageLocation || "Dry Storage Location",
        storageRow: variables.storageRow || rows[0],
        storageDeck: variables.storageDeck || decks[0],
      });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof updateFormSchema>;
    }) => {
      await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      editForm.reset();
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    editForm.reset({
      name: product.name,
      unit: product.unit,
      openingStock: product.openingStock,
      storageLocation: (product as any)?.storageLocation || "Dry Storage Location",
      storageRow: (product as any)?.storageRow || rows[0],
      storageDeck: (product as any)?.storageDeck || decks[0],
      expiryDate: (product as any)?.expiryDate ? new Date((product as any).expiryDate as any).toISOString().split("T")[0] : "",
    });
  };

  const handleDelete = (id: number) => {
    deleteProductMutation.mutate(id);
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter((product: Product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  // Format number to display without unnecessary decimal zeros
  const formatDecimal = (value: string | number): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    return num % 1 === 0
      ? num.toString()
      : num.toFixed(3).replace(/\.?0+$/, "");
  };

  const getStockStatus = (currentStock: string) => {
    const stock = parseFloat(currentStock);
    if (stock === 0) return { label: "Out of Stock", color: "destructive" };
    if (stock < 20) return { label: "Low Stock", color: "warning" };
    return { label: "Available", color: "success" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has access - support multiple roles
  const userRoles = (user as any)?.roles || [(user as any)?.role].filter(Boolean);
  const hasRole = (role: string) => userRoles.includes(role);
  const hasAccess = user && (
    hasRole('super_admin') || 
    hasRole('master_inventory_handler') || 
    hasRole('stock_in_manager')
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access the inventory management
              system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect Master Inventory Handler if they accessed /inventory directly without ?direct=true
  const userRole = (user as any)?.role;
  const hasDirectParam = new URLSearchParams(window.location.search).has('direct');
  
  if (userRole === 'master_inventory_handler' && !hasDirectParam) {
    console.log("Redirecting Master Inventory Handler to proper flow");
    // Redirect to Master Inventory page to see the two cards first
    window.location.href = '/master-inventory';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Redirecting to Master Inventory...</p>
        </div>
      </div>
    );
  }

  // Show the actual form
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          {/* Navigate back based on context - Mobile Optimized */}
          {new URLSearchParams(window.location.search).has('direct') ? (
            <Link href="/master-inventory">
              <Button
                variant="outline"
                className="flex items-center gap-2 min-h-[44px] no-zoom"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm sm:text-base">Back to Master Inventory</span>
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button
                variant="outline"
                className="flex items-center gap-2 min-h-[44px] no-zoom"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm sm:text-base">Back to Home</span>
              </Button>
            </Link>
          )}
        </div>
        
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Add New Product
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Create new inventory items</p>
        </div>
<Card>
  <CardContent className="p-6">
    <Form {...addForm}>
      <form
        onSubmit={addForm.handleSubmit(async (data) => {
          // 1. Check for duplicate products
          const isDuplicate = (Array.isArray(products) ? products : []).some(
            (product: Product) =>
              product.name.toLowerCase() === data.name.toLowerCase()
          );
          
          if (isDuplicate) {
            addForm.setError("name", {
              type: "manual",
              message: "This product already exists!",
            });
            return;
          }

          // 2. Ensure unit is never empty (fallback to "Pieces")
          if (!data.unit) data.unit = "Pieces";
          // 2b. Normalize expiryDate to YYYY-MM-DD or undefined
          if (data.expiryDate === "") delete (data as any).expiryDate;
          
          // 3. Submit if valid
          createProductMutation.mutate(data);
        })}
        className="space-y-6"
      >
        {/* Product Name Field */}
        <FormField
          control={addForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Product Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter product name"
                  {...field}
                  className="h-12 text-lg"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit Field with Persistent Selection */}
        <FormField
          control={addForm.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Unit</FormLabel>
              <FormControl>
                <Select
                  value={field.value || lastUsedUnit}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setLastUsedUnit(value);
                    localStorage.setItem("lastUsedUnit", value);
                  }}
                  defaultValue={lastUsedUnit}
                >
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder={lastUsedUnit} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="Grams">Grams</SelectItem>
                    <SelectItem value="Litre">Litre</SelectItem>
                    <SelectItem value="Millilitre">Millilitre</SelectItem>
                    <SelectItem value="Pieces">Pieces</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Storage Location Fields: location, row, deck */}
        <FormField
          control={addForm.control}
          name="storageLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Storage Location</FormLabel>
              <FormControl>
                <Select
                  value={field.value || "Dry Storage Location"}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // temporary reset; actual valid values will be set by effects after dimensions load
                    addForm.setValue("storageRow", "", { shouldValidate: false });
                    addForm.setValue("storageDeck", "", { shouldValidate: false });
                    addForm.clearErrors(["storageRow", "storageDeck"] as any);
                  }}
                  defaultValue="Dry Storage Location"
                >
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={addForm.control}
            name="storageRow"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">{sectionMode ? "Section" : "Row"}</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || (sectionMode ? (dynamicSections[0] || packageSections[0]) : (dynamicRows[0] || rows[0]))}
                    onValueChange={(value) => {
                      field.onChange(value);
                      addForm.clearErrors("storageRow");
                    }}
                    defaultValue={sectionMode ? (dynamicSections[0] || packageSections[0]) : (dynamicRows[0] || rows[0])}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder={sectionMode ? (dynamicSections[0] || packageSections[0]) : (dynamicRows[0] || rows[0])} />
                    </SelectTrigger>
                          <SelectContent>
                      {sectionMode
                        ? ((dynamicSections.length > 0 ? dynamicSections : packageSections).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          )))
                        : ((dynamicRows.length > 0 ? dynamicRows : rows).map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          )))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!sectionMode && (
          <FormField
            control={addForm.control}
            name="storageDeck"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Deck</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || (dynamicDecks[0] || decks[0])}
                    onValueChange={(value) => field.onChange(value)}
                    defaultValue={dynamicDecks[0] || decks[0]}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder={dynamicDecks[0] || decks[0]} />
                    </SelectTrigger>
                    <SelectContent>
                      {(dynamicDecks.length > 0 ? dynamicDecks : decks).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          )}
        </div>

        {/* Opening Quantity Field */}
        <FormField
          control={addForm.control}
          name="openingStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Opening Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Enter opening quantity"
                  {...field}
                  className="h-12 text-lg"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expiry Date Field */}
        <FormField
          control={addForm.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Expiry Date (optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  placeholder="YYYY-MM-DD"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-12 text-lg"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="submit"
            disabled={createProductMutation.isPending}
            className="h-12 px-8 text-lg"
          >
            {createProductMutation.isPending ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  </CardContent>
</Card>
      </div>
    </div>
  );
}
