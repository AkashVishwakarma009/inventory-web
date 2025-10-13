import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  AlertTriangle,
  X,
  Plus,
  Edit,
  ArrowLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProductSearch from "@/components/ProductSearch";
import ConfirmationDialog, {
  type TransactionData,
} from "@/components/ConfirmationDialog";

import type { Product } from "@shared/schema";
import { Link } from "wouter";

const stockInFormSchema = z.object({
  poNumber: z.string().optional(),
});

const stockOutFormSchema = z.object({
  soNumber: z.string().optional(),
});

type StockInFormData = z.infer<typeof stockInFormSchema>;
type StockOutFormData = z.infer<typeof stockOutFormSchema>;

// Custom hook for focus-locked number input to prevent cursor jumping
function useFocusLockedInput(initialValue: string = "") {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(initialValue);
  const isTypingRef = useRef(false);
  const [, forceUpdate] = useState({});
  
  const handleFocus = useCallback(() => {
    isTypingRef.current = true;
  }, []);
  
  const handleBlur = useCallback(() => {
    isTypingRef.current = false;
  }, []);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (inputRef.current) {
      const target = e.target;
      const inputValue = target.value;
      const cursorPosition = target.selectionStart;
      
      // Allow only numbers
      const processedValue = inputValue.replace(/[^0-9]/g, "");
      
      // Update ref value directly
      valueRef.current = processedValue;
      
      // Update DOM value directly without React re-render
      if (inputRef.current.value !== processedValue) {
        inputRef.current.value = processedValue;
      }
      
      // Restore cursor position
      if (cursorPosition !== null) {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
          }
        });
      }
    }
  }, []);
  
  const reset = useCallback(() => {
    valueRef.current = "";
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    isTypingRef.current = false;
  }, []);
  
  return {
    get value() {
      return valueRef.current;
    },
    inputRef,
    handleFocus,
    handleBlur,
    handleChange,
    reset,
    inputProps: {
      ref: inputRef,
      defaultValue: initialValue,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onChange: handleChange,
      type: "text" as const,
      inputMode: "numeric" as const,
    }
  };
}

interface ProductItem {
  product: Product;
  quantity: string;
  quantityOut?: string;
  currentStock: string;
  newStock: string;
  selectedUnit?: string;
  expiryDate?: string;
}

type TransactionPreview = TransactionData;

export default function StockManagement() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactionPreview, setTransactionPreview] =
    useState<TransactionPreview | null>(null);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [showProductSearchIn, setShowProductSearchIn] = useState(false);
  const [showProductSearchOut, setShowProductSearchOut] = useState(false);

  // State for managing multiple product editing
  const [editingQueue, setEditingQueue] = useState<
    Array<{
      product: Product;
      quantity: string;
      quantityOut?: string;
      selectedUnit: string;
      expiryDate?: string;
    }>
  >([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [showEditQueue, setShowEditQueue] = useState(false);
  // Detect 'section-only' locations: any location that has section dimensions
  const { data: storageLocations } = useQuery({
    queryKey: ["/api/storage-locations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/storage-locations");
      return await res.json();
    },
  });
  const { data: sectionDims } = useQuery({
    queryKey: ["/api/storage-dimensions?type=section"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/storage-dimensions?type=section");
      return await res.json();
    },
  });
  const sectionLocationNames: Set<string> = (() => {
    try {
      const locs = Array.isArray(storageLocations) ? (storageLocations as any[]) : [];
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
  })();

  // State for showing dashboard vs functionality
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<
    "stock-in" | "stock-out" | null
  >(null);

  // Check URL parameters to determine which form to show
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'stock-in' || tabParam === 'stock-out') {
      setSelectedFunction(tabParam);
      setShowDashboard(false);
    }
  }, []);

  // Current product being worked on
  const [currentProductIn, setCurrentProductIn] = useState<{
    product: Product;
    quantity: string;
    selectedUnit: string;
    expiryDate?: string;
  } | null>(null);
  const [currentProductOut, setCurrentProductOut] = useState<{
    product: Product;
    quantityOut: string;
    selectedUnit: string;
  } | null>(null);

  // Completed products ready for transaction
  const [completedProductsIn, setCompletedProductsIn] = useState<
    Array<{ product: Product; quantity: string; selectedUnit: string; expiryDate?: string }>
  >([]);
  const [completedProductsOut, setCompletedProductsOut] = useState<
    Array<{ product: Product; quantityOut: string; selectedUnit: string }>
  >([]);

  // Focus-locked inputs for PO and SO numbers to prevent cursor jumping
  const poNumberInput = useFocusLockedInput("");
  const soNumberInput = useFocusLockedInput("");

  // Unit conversion utilities
  const getAvailableUnits = (product: Product) => {
    // Handle empty or invalid units
    if (!product.unit || product.unit.trim() === '') {
      return [{ value: 'Pieces', label: 'Pieces' }];
    }
    
    const baseUnit = product.unit.toLowerCase();
    const units = [{ value: product.unit, label: product.unit }];

    if (
      baseUnit === "kg" ||
      baseUnit === "kilogram" ||
      baseUnit === "kilograms"
    ) {
      units.push({ value: "Grams", label: "Grams" });
    }

    if (
      baseUnit === "litre" ||
      baseUnit === "liter" ||
      baseUnit === "litres" ||
      baseUnit === "liters"
    ) {
      units.push({ value: "Millilitre", label: "Millilitre" });
    }

    return units;
  };

  const convertToBaseUnit = (
    quantity: string,
    selectedUnit: string,
    product: Product,
  ) => {
    // Handle empty or invalid units
    if (!product.unit || product.unit.trim() === '') {
      return quantity; // No conversion needed for pieces
    }
    
    const baseUnit = product.unit.toLowerCase();
    const qty = parseFloat(quantity);

    if (
      selectedUnit === "Grams" &&
      (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms")
    ) {
      return (qty / 1000).toString();
    }

    if (
      selectedUnit === "Millilitre" &&
      (baseUnit === "litre" ||
        baseUnit === "liter" ||
        baseUnit === "litres" ||
        baseUnit === "liters")
    ) {
      return (qty / 1000).toString();
    }

    return quantity;
  };

  const formatDisplayQuantity = (quantity: string, unit: string) => {
    const qty = parseFloat(quantity);
    if (unit === "Grams") {
      return `${qty} grams`;
    }
    if (unit === "Millilitre") {
      return `${qty} millilitre`;
    }
    return `${qty} ${unit}`;
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get user's active roles (support both single role and multiple roles)
  const userRoles = (user as any)?.roles || [(user as any)?.role].filter(Boolean);
  const hasRole = (role: string) => userRoles.includes(role);
  
  const isSuperAdmin = hasRole("super_admin");
  const canStockIn = hasRole("super_admin") || hasRole("master_inventory_handler") || hasRole("stock_in_manager");
  const canStockOut = hasRole("super_admin") || hasRole("master_inventory_handler") || hasRole("stock_out_manager");

  // Show single function only if user has ONLY that role (not multiple roles)
  const showStockInOnly = userRoles.length === 1 && hasRole("stock_in_manager");
  const showStockOutOnly = userRoles.length === 1 && hasRole("stock_out_manager");

  const stockInForm = useForm<StockInFormData>({
    resolver: zodResolver(stockInFormSchema),
    defaultValues: {
      poNumber: "",
    },
  });

  const stockOutForm = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutFormSchema),
    defaultValues: {
      soNumber: "",
    },
  });

  // Product management functions
  const addProductIn = (product: Product) => {
    if (
      currentProductIn?.product.id === product.id ||
      completedProductsIn.some((item) => item.product.id === product.id)
    ) {
      toast({
        title: "Product already selected",
        description: `${product.name} is already in your list`,
        variant: "destructive",
      });
      return;
    }

    if (
      currentProductIn &&
      currentProductIn.quantity &&
      parseFloat(currentProductIn.quantity) > 0
    ) {
      setCompletedProductsIn((prev) => [...prev, currentProductIn]);
    }

    setCurrentProductIn({
      product,
      quantity: "",
      selectedUnit: product.unit,
      expiryDate: "",
    });
  };

  const addProductOut = (product: Product) => {
    if (
      currentProductOut?.product.id === product.id ||
      completedProductsOut.some((item) => item.product.id === product.id)
    ) {
      toast({
        title: "Product already selected",
        description: `${product.name} is already in your list`,
        variant: "destructive",
      });
      return;
    }

    if (
      currentProductOut &&
      currentProductOut.quantityOut &&
      parseFloat(currentProductOut.quantityOut) > 0
    ) {
      setCompletedProductsOut((prev) => [...prev, currentProductOut]);
    }

    setCurrentProductOut({
      product,
      quantityOut: "",
      selectedUnit: product.unit,
    });
  };

  const removeCompletedProductIn = (productId: number) => {
    setCompletedProductsIn(
      completedProductsIn.filter((item) => item.product.id !== productId),
    );
  };

  const removeCompletedProductOut = (productId: number) => {
    setCompletedProductsOut(
      completedProductsOut.filter((item) => item.product.id !== productId),
    );
  };

  // Functions for editing queue navigation
  const goToNextEditProduct = () => {
    if (currentEditIndex < editingQueue.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    }
  };

  const goToPreviousEditProduct = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(currentEditIndex - 1);
    }
  };

  const saveCurrentEdit = () => {
    const currentEdit = editingQueue[currentEditIndex];
    if (!currentEdit) return;

    if (transactionPreview?.type === "Stock In" || currentEdit.quantity) {
      // Save to completed products for stock in
      const updatedProduct = {
        product: currentEdit.product,
        quantity: currentEdit.quantity,
        selectedUnit: currentEdit.selectedUnit,
        expiryDate: currentEdit.expiryDate,
      };
      setCompletedProductsIn((prev) => [...prev, updatedProduct]);
    } else {
      // Save to completed products for stock out
      const updatedProduct = {
        product: currentEdit.product,
        quantityOut: currentEdit.quantityOut || "",
        selectedUnit: currentEdit.selectedUnit,
      };
      setCompletedProductsOut((prev) => [...prev, updatedProduct]);
    }

    // Remove from queue and go to next
    const newQueue = editingQueue.filter(
      (_, index) => index !== currentEditIndex,
    );
    setEditingQueue(newQueue);

    if (newQueue.length === 0) {
      // All products edited, close the queue
      setShowEditQueue(false);
      setCurrentEditIndex(0);
      toast({
        title: "Editing Complete",
        description: "All selected products have been edited.",
      });
    } else if (currentEditIndex >= newQueue.length) {
      // Adjust index if we were at the end
      setCurrentEditIndex(newQueue.length - 1);
    }
  };

  const skipCurrentEdit = () => {
    const currentEdit = editingQueue[currentEditIndex];
    if (!currentEdit) return;

    // Return product to completed list without changes
    if (transactionPreview?.type === "Stock In" || currentEdit.quantity) {
      setCompletedProductsIn((prev) => [...prev, currentEdit]);
    } else {
      const productWithQuantityOut = {
        product: currentEdit.product,
        quantityOut: currentEdit.quantityOut || "",
        selectedUnit: currentEdit.selectedUnit,
      };
      setCompletedProductsOut((prev) => [...prev, productWithQuantityOut]);
    }

    // Remove from queue
    const newQueue = editingQueue.filter(
      (_, index) => index !== currentEditIndex,
    );
    setEditingQueue(newQueue);

    if (newQueue.length === 0) {
      setShowEditQueue(false);
      setCurrentEditIndex(0);
    } else if (currentEditIndex >= newQueue.length) {
      setCurrentEditIndex(newQueue.length - 1);
    }
  };

  const closeEditQueue = () => {
    // Return all remaining items to completed list
    editingQueue.forEach((item) => {
      if (item.quantity) {
        setCompletedProductsIn((prev) => [...prev, item]);
      } else {
        const productWithQuantityOut = {
          product: item.product,
          quantityOut: item.quantityOut || "",
          selectedUnit: item.selectedUnit,
        };
        setCompletedProductsOut((prev) => [...prev, productWithQuantityOut]);
      }
    });

    setEditingQueue([]);
    setShowEditQueue(false);
    setCurrentEditIndex(0);
  };

  const updateCurrentProductInQuantity = useCallback((quantity: string) => {
    setCurrentProductIn((current) => {
      if (!current) return null;
      if (current.quantity === quantity) return current;
      return { ...current, quantity };
    });
  }, []);

  const updateCurrentProductOutQuantity = useCallback((quantityOut: string) => {
    setCurrentProductOut((current) => {
      if (!current) return null;
      if (current.quantityOut === quantityOut) return current;
      return { ...current, quantityOut };
    });
  }, []);

  const updateCurrentProductInUnit = useCallback((selectedUnit: string) => {
    setCurrentProductIn((prev) => (prev ? { ...prev, selectedUnit } : null));
  }, []);

  const updateCurrentProductOutUnit = useCallback((selectedUnit: string) => {
    setCurrentProductOut((prev) => (prev ? { ...prev, selectedUnit } : null));
  }, []);

  const handleResetIn = () => {
    setCurrentProductIn(null);
    setCompletedProductsIn([]);
    poNumberInput.reset();
    stockInForm.reset();
  };

  const handleResetOut = () => {
    setCurrentProductOut(null);
    setCompletedProductsOut([]);
    setStockWarnings([]);
    soNumberInput.reset();
    stockOutForm.reset();
  };

  // Functions to edit individual completed products
  const editCompletedProductIn = (productId: number) => {
    const productToEdit = completedProductsIn.find(
      (p) => p.product.id === productId,
    );
    if (productToEdit) {
      setCurrentProductIn(productToEdit);
      setCompletedProductsIn((prev) =>
        prev.filter((p) => p.product.id !== productId),
      );
    }
  };

  const editCompletedProductOut = (productId: number) => {
    const productToEdit = completedProductsOut.find(
      (p) => p.product.id === productId,
    );
    if (productToEdit) {
      setCurrentProductOut(productToEdit);
      setCompletedProductsOut((prev) =>
        prev.filter((p) => p.product.id !== productId),
      );
    }
  };

  // Mutations
  const stockInMutation = useMutation({
    mutationFn: async (
      transactions: Array<{
        productId: number;
        quantity: string;
        originalQuantity?: string;
        originalUnit?: string;
        poNumber?: string;
        expiryDate?: string;
      }>,
    ) => {
      const results = [];
      for (const transaction of transactions) {
        // If expiryDate is provided for this product, update it before posting the stock-in
        if (transaction.expiryDate && transaction.expiryDate.trim() !== "") {
          try {
            await apiRequest(
              "PUT",
              `/api/products/${transaction.productId}`,
              { expiryDate: transaction.expiryDate }
            );
          } catch (e) {
            // Do not block stock-in on expiry update failure
            console.warn("Failed to update product expiry date:", e);
          }
        }
        const response = await apiRequest(
          "POST",
          "/api/transactions/stock-in",
          transaction,
        );
        results.push(response);
      }
      return results;
    },
    onSuccess: () => {
      // Ensure Product Catalog reflects updated expiry dates and stocks
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Stock in transactions recorded successfully",
      });
      setTransactionPreview(null);
      handleResetIn();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record stock in transactions",
        variant: "destructive",
      });
    },
  });

  const stockOutMutation = useMutation({
    mutationFn: async (
      transactions: Array<{
        productId: number;
        quantityOut: string;
        originalQuantity?: string;
        originalUnit?: string;
        soNumber?: string;
      }>,
    ) => {
      const results = [];
      for (const transaction of transactions) {
        const response = await apiRequest(
          "POST",
          "/api/transactions/stock-out",
          transaction,
        );
        results.push(response);
      }
      return results;
    },
    onSuccess: () => {
      // Keep Product Catalog in sync with new stock levels
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Stock out transactions recorded successfully",
      });
      setTransactionPreview(null);
      handleResetOut();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record stock out transactions",
        variant: "destructive",
      });
    },
  });

  // Preview handlers
  const handlePreviewIn = (data: StockInFormData) => {
    const allProducts = [...completedProductsIn];

    // Add current product if it has quantity
    if (
      currentProductIn &&
      currentProductIn.quantity &&
      parseFloat(currentProductIn.quantity) > 0
    ) {
      allProducts.push(currentProductIn);
    }

    if (allProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product with quantity",
        variant: "destructive",
      });
      return;
    }

    const productItems: ProductItem[] = allProducts.map((item) => {
      const currentStock = parseFloat(item.product.currentStock);
      const convertedQuantity = parseFloat(
        convertToBaseUnit(item.quantity, item.selectedUnit, item.product),
      );
      const newStock = currentStock + convertedQuantity;

      return {
        product: item.product,
        quantity: convertToBaseUnit(
          item.quantity,
          item.selectedUnit,
          item.product,
        ),
        currentStock: item.product.currentStock,
        newStock: newStock.toString(),
        selectedUnit: item.selectedUnit,
        expiryDate: (item as any).expiryDate,
      };
    });

    setTransactionPreview({
      products: productItems.map((item, index) => ({
        product: item.product.name,
        unit: item.product.unit,
        // include storage info so ConfirmationDialog can show it
        storageLocation: (item.product as any).storageLocation,
        storageRow: (item.product as any).storageRow,
        storageDeck: (item.product as any).storageDeck,
        currentStock: item.currentStock,
        quantity: item.quantity,
        newStock: item.newStock,
        displayQuantity: formatDisplayQuantity(
          allProducts[index].quantity,
          allProducts[index].selectedUnit,
        ),
        // Pass expiry date so the dialog can display it (Stock In only)
        expiryDate: item.expiryDate,
      })),
      date: new Date().toLocaleDateString(),
      poNumber: poNumberInput.value,
      type: "Stock In",
    });
  };

  const handlePreviewOut = (data: StockOutFormData) => {
    const allProducts = [...completedProductsOut];

    // Add current product if it has quantity
    if (
      currentProductOut &&
      currentProductOut.quantityOut &&
      parseFloat(currentProductOut.quantityOut) > 0
    ) {
      allProducts.push(currentProductOut);
    }

    if (allProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product with quantity",
        variant: "destructive",
      });
      return;
    }

    const productItems: ProductItem[] = allProducts.map((item) => {
      const currentStock = parseFloat(item.product.currentStock);
      const convertedQuantity = parseFloat(
        convertToBaseUnit(item.quantityOut, item.selectedUnit, item.product),
      );
      const newStock = currentStock - convertedQuantity;

      return {
        product: item.product,
        quantity: convertToBaseUnit(
          item.quantityOut,
          item.selectedUnit,
          item.product,
        ),
        currentStock: item.product.currentStock,
        newStock: newStock.toString(),
        selectedUnit: item.selectedUnit,
      };
    });

    setTransactionPreview({
      products: productItems.map((item, index) => ({
        product: item.product.name,
        unit: item.product.unit,
        // include storage info so ConfirmationDialog can show it
        storageLocation: (item.product as any).storageLocation,
        storageRow: (item.product as any).storageRow,
        storageDeck: (item.product as any).storageDeck,
        currentStock: item.currentStock,
        quantity: item.quantity,
        newStock: item.newStock,
        displayQuantity: formatDisplayQuantity(
          allProducts[index].quantityOut,
          allProducts[index].selectedUnit,
        ),
      })),
      date: new Date().toLocaleDateString(),
      soNumber: soNumberInput.value,
      type: "Stock Out",
    });
  };

  const handleEdit = (selectedProducts?: number[]) => {
    if (
      !transactionPreview ||
      !selectedProducts ||
      selectedProducts.length === 0
    ) {
      // If no products selected, just close the dialog
      setTransactionPreview(null);
      return;
    }

    // Close the confirmation dialog
    setTransactionPreview(null);

    // Move selected products to editing queue
    if (transactionPreview.type === "Stock In") {
      const allProducts = [...completedProductsIn];
      if (
        currentProductIn &&
        currentProductIn.quantity &&
        parseFloat(currentProductIn.quantity) > 0
      ) {
        allProducts.push(currentProductIn);
      }

      // Get the selected products based on the indices
      const productsToEdit = selectedProducts
        .map((index) => allProducts[index])
        .filter(Boolean);

      // Keep only non-selected products
      const remainingProducts = allProducts.filter(
        (_, index) => !selectedProducts.includes(index),
      );

      // Set up editing queue
      setEditingQueue(productsToEdit);
      setCurrentEditIndex(0);
      setShowEditQueue(true);

      // Clear current states and set remaining products
      setCurrentProductIn(null);
      setCompletedProductsIn(remainingProducts);

      toast({
        title: "Edit Mode",
        description: `${productsToEdit.length} product(s) ready for editing. Use navigation to edit each one.`,
      });
    } else {
      const allProducts = [...completedProductsOut];
      if (
        currentProductOut &&
        currentProductOut.quantityOut &&
        parseFloat(currentProductOut.quantityOut) > 0
      ) {
        allProducts.push(currentProductOut);
      }

      // Get the selected products based on the indices
      const productsToEdit = selectedProducts
        .map((index) => allProducts[index])
        .filter(Boolean);

      // Keep only non-selected products
      const remainingProducts = allProducts.filter(
        (_, index) => !selectedProducts.includes(index),
      );

      // Set up editing queue
      const queueItems = productsToEdit.map((item) => ({
        product: item.product,
        quantity: "",
        quantityOut: item.quantityOut,
        selectedUnit: item.selectedUnit,
      }));

      setEditingQueue(queueItems);
      setCurrentEditIndex(0);
      setShowEditQueue(true);

      // Clear current states and set remaining products
      setCurrentProductOut(null);
      setCompletedProductsOut(remainingProducts);

      toast({
        title: "Edit Mode",
        description: `${productsToEdit.length} product(s) ready for editing. Use navigation to edit each one.`,
      });
    }
  };

  const handleConfirm = () => {
    if (!transactionPreview) return;

    if (transactionPreview.type === "Stock In") {
      const allProducts = [...completedProductsIn];
      if (
        currentProductIn &&
        currentProductIn.quantity &&
        parseFloat(currentProductIn.quantity) > 0
      ) {
        allProducts.push(currentProductIn);
      }

      const transactions = allProducts.map((item) => ({
        productId: item.product.id,
        quantity: convertToBaseUnit(
          item.quantity,
          item.selectedUnit,
          item.product,
        ),
        originalQuantity: item.quantity,
        originalUnit: item.selectedUnit,
        poNumber: poNumberInput.value,
        expiryDate: (item as any).expiryDate && (item as any).expiryDate.trim() !== "" ? (item as any).expiryDate : undefined,
      }));

      stockInMutation.mutate(transactions);
    } else {
      const allProducts = [...completedProductsOut];
      if (
        currentProductOut &&
        currentProductOut.quantityOut &&
        parseFloat(currentProductOut.quantityOut) > 0
      ) {
        allProducts.push(currentProductOut);
      }

      const transactions = allProducts.map((item) => ({
        productId: item.product.id,
        quantityOut: convertToBaseUnit(
          item.quantityOut,
          item.selectedUnit,
          item.product,
        ),
        originalQuantity: item.quantityOut,
        originalUnit: item.selectedUnit,
        soNumber: soNumberInput.value,
      }));

      stockOutMutation.mutate(transactions);
    }
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

  if (!canStockIn && !canStockOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access stock management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle role-specific dashboard display - Show buttons first, then functions
  if (showDashboard && !isSuperAdmin) {
    // For users with multiple roles, don't show dashboard - go directly to forms
    if (userRoles.length > 1) {
      // Skip dashboard for multi-role users
      setShowDashboard(false);
      return null; // Will re-render with forms
    }

    if (showStockInOnly) {
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Stock Management Dashboard
              </h1>
              <p className="text-xl text-gray-600">Stock In Manager</p>
              <p className="text-gray-500 mt-2">
                Click the button below to start managing stock
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <Card
                className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer p-6 border-2 border-green-200"
                onClick={() => {
                  setShowDashboard(false);
                  setSelectedFunction("stock-in");
                }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-800">
                    Stock In
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 text-lg mb-3">
                    Add stock quantities to inventory
                  </p>
                  <p className="text-sm text-green-600 font-medium">
                    Click to open Stock In form
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    if (showStockOutOnly) {
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Stock Management Dashboard
              </h1>
              <p className="text-xl text-gray-600">Stock Out Manager</p>
              <p className="text-gray-500 mt-2">
                Click the button below to start managing stock
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <Card
                className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer p-6 border-2 border-red-200"
                onClick={() => {
                  setShowDashboard(false);
                  setSelectedFunction("stock-out");
                }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                  <CardTitle className="text-2xl text-red-800">
                    Stock Out
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 text-lg mb-3">
                    Remove stock quantities from inventory
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    Click to open Stock Out form
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }
  }

  // Show dashboard for super admin when coming from stock management link
  if (showDashboard && (user as any)?.role === "super_admin") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 relative">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back to Home Button */}
          <div className="absolute top-4 left-4">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-center mb-12 pt-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Stock Management Dashboard
            </h1>
            <p className="text-xl text-gray-600">Super Admin</p>
            <p className="text-gray-500 mt-2">
              Choose your stock management function
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card
              className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer p-6 border-2 border-green-200"
              onClick={() => {
                setShowDashboard(false);
                setSelectedFunction("stock-in");
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-800">
                  Stock In
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 text-lg mb-3">
                  Add stock quantities to inventory
                </p>
                <p className="text-sm text-green-600 font-medium">
                  Click to open Stock In form
                </p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer p-6 border-2 border-red-200"
              onClick={() => {
                setShowDashboard(false);
                setSelectedFunction("stock-out");
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-800">
                  Stock Out
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 text-lg mb-3">
                  Remove stock quantities from inventory
                </p>
                <p className="text-sm text-red-600 font-medium">
                  Click to open Stock Out form
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 relative">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        {/* Back to Home Button in top-left corner */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
          <Link href="/">
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        <div className="text-center mb-6 sm:mb-8 pt-12 sm:pt-16">
          <div className="flex justify-center items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Stock Management
            </h1>
          </div>
          <p className="text-gray-600">
            {selectedFunction === "stock-in" || showStockInOnly
              ? "Add products to your stock"
              : selectedFunction === "stock-out" || showStockOutOnly
                ? "Remove products from your stock"
                : "Manage your inventory stock levels"}
          </p>
        </div>

        {selectedFunction === "stock-in" || showStockInOnly ? (
          <StockInForm />
        ) : selectedFunction === "stock-out" || showStockOutOnly ? (
          <StockOutForm />
        ) : canStockIn && canStockOut ? (
          <Tabs defaultValue="stock-in" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stock-in" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Stock In
              </TabsTrigger>
              <TabsTrigger
                value="stock-out"
                className="flex items-center gap-2"
              >
                <TrendingDown className="h-4 w-4" />
                Stock Out
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stock-in">
              <StockInForm />
            </TabsContent>

            <TabsContent value="stock-out">
              <StockOutForm />
            </TabsContent>
          </Tabs>
        ) : canStockIn ? (
          <StockInForm />
        ) : (
          <StockOutForm />
        )}

        {/* Editing Queue Interface */}
        {showEditQueue && editingQueue.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-purple-700" />
                  <span className="text-purple-800">
                    Editing Products ({currentEditIndex + 1} of{" "}
                    {editingQueue.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeEditQueue}
                  className="text-gray-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {editingQueue[currentEditIndex] && (
                <div className="space-y-4">
                  {/* Show all products in queue */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h6 className="font-medium text-gray-800 mb-2">
                      Products to Edit:
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {editingQueue.map((item, index) => (
                        <span
                          key={item.product.id}
                          className={`px-2 py-1 rounded text-sm ${
                            index === currentEditIndex
                              ? "bg-purple-200 text-purple-800 border-2 border-purple-400"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {item.product.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Current product editing form */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h5 className="font-semibold text-purple-900 mb-3">
                      Editing: {editingQueue[currentEditIndex].product.name}
                    </h5>
                    {renderLocation(editingQueue[currentEditIndex].product)}
                    <p className="text-purple-700 mb-3">
                      Current Stock:{" "}
                      {editingQueue[currentEditIndex].product.currentStock}{" "}
                      {editingQueue[currentEditIndex].product.unit}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {editingQueue[currentEditIndex].quantity !== undefined
                            ? "Quantity to Add"
                            : "Quantity Out"}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter quantity..."
                          value={
                            editingQueue[currentEditIndex].quantity ||
                            editingQueue[currentEditIndex].quantityOut ||
                            ""
                          }
                          onChange={(e) => {
                            // Allow only numbers and decimal points
                            const value = e.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            const newQueue = [...editingQueue];
                            if (
                              editingQueue[currentEditIndex].quantity !==
                              undefined
                            ) {
                              newQueue[currentEditIndex].quantity = value;
                            } else {
                              newQueue[currentEditIndex].quantityOut = value;
                            }
                            setEditingQueue(newQueue);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <Select
                          value={editingQueue[currentEditIndex].selectedUnit}
                          onValueChange={(value) => {
                            const newQueue = [...editingQueue];
                            newQueue[currentEditIndex].selectedUnit = value;
                            setEditingQueue(newQueue);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUnits(
                              editingQueue[currentEditIndex].product,
                            ).map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {editingQueue[currentEditIndex].quantity !== undefined && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date (optional)
                        </label>
                        <input
                          type="date"
                          value={editingQueue[currentEditIndex].expiryDate || ""}
                          onChange={(e) => {
                            const newQueue = [...editingQueue];
                            newQueue[currentEditIndex].expiryDate = e.target.value;
                            setEditingQueue(newQueue);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Navigation and action buttons */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={goToPreviousEditProduct}
                        disabled={currentEditIndex === 0}
                        size="sm"
                      >
                        ← Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={goToNextEditProduct}
                        disabled={currentEditIndex === editingQueue.length - 1}
                        size="sm"
                      >
                        Next →
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={skipCurrentEdit}
                        size="sm"
                        className="text-gray-600"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={saveCurrentEdit}
                        className="bg-purple-600 hover:bg-purple-700"
                        size="sm"
                        disabled={
                          !editingQueue[currentEditIndex]?.quantity &&
                          !editingQueue[currentEditIndex]?.quantityOut
                        }
                      >
                        Save & Continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {transactionPreview && (
          <ConfirmationDialog
            isOpen={!!transactionPreview}
            onClose={() => setTransactionPreview(null)}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            title={`Confirm ${transactionPreview.type} Transactions`}
            transactionData={transactionPreview}
            isLoading={stockInMutation.isPending || stockOutMutation.isPending}
          />
        )}
      </div>
    </div>
  );

  function StockInForm() {
    return (
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <TrendingUp className="h-5 w-5" />
            Stock In - Add Products One by One
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Form {...stockInForm}>
            <form
              onSubmit={stockInForm.handleSubmit(handlePreviewIn)}
              className="space-y-4 sm:space-y-6"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Products to Stock In
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProductSearchIn(!showProductSearchIn)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>

                {showProductSearchIn && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <ProductSearch
                      onProductSelect={(product) => {
                        addProductIn(product);
                        setShowProductSearchIn(false);
                      }}
                      placeholder="Type to search and add products..."
                    />
                  </div>
                )}

                {/* Current Product Input */}
                {currentProductIn && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold text-green-900">
                          {currentProductIn.product.name}
                        </h5>
                        <p className="text-green-700">
                          Current Stock: {currentProductIn.product.currentStock}{" "}
                          {currentProductIn.product.unit}
                        </p>
                        {renderLocation(currentProductIn.product)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentProductIn(null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity to Add
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentProductIn.quantity}
                          onChange={(e) => {
                            // Allow only numbers and decimal points
                            const value = e.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            updateCurrentProductInQuantity(value);
                          }}
                          placeholder="Enter quantity..."
                          className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <Select
                          value={currentProductIn.selectedUnit}
                          onValueChange={(value) =>
                            updateCurrentProductInUnit(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUnits(currentProductIn.product).map(
                              (unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date (optional)
                      </label>
                      <input
                        type="date"
                        value={currentProductIn.expiryDate || ""}
                        onChange={(e) =>
                          setCurrentProductIn((prev) =>
                            prev ? { ...prev, expiryDate: e.target.value } : prev,
                          )
                        }
                        className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  {...poNumberInput.inputProps}
                  placeholder=""
                  className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  type="submit"
                  className="btn-large bg-green-600 hover:bg-green-700"
                  disabled={
                    !currentProductIn && completedProductsIn.length === 0
                  }
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Preview Transactions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="btn-large"
                  onClick={handleResetIn}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  function StockOutForm() {
    return (
      <Card>
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <TrendingDown className="h-5 w-5" />
            Stock Out - Add Products One by One
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Form {...stockOutForm}>
            <form
              onSubmit={stockOutForm.handleSubmit(handlePreviewOut)}
              className="space-y-4 sm:space-y-6"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Products to Stock Out
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setShowProductSearchOut(!showProductSearchOut)
                    }
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>

                {showProductSearchOut && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <ProductSearch
                      onProductSelect={(product) => {
                        addProductOut(product);
                        setShowProductSearchOut(false);
                      }}
                      placeholder="Type to search and add products..."
                    />
                  </div>
                )}

                {/* Current Product Input */}
                {currentProductOut && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold text-orange-900">
                          {currentProductOut.product.name}
                        </h5>
                        <p className="text-orange-700">
                          Available Stock:{" "}
                          {currentProductOut.product.currentStock}{" "}
                          {currentProductOut.product.unit}
                        </p>
                        {renderLocation(currentProductOut.product)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentProductOut(null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Out
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentProductOut.quantityOut}
                          onChange={(e) => {
                            // Allow only numbers and decimal points
                            const value = e.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            updateCurrentProductOutQuantity(value);
                          }}
                          placeholder="Enter quantity out..."
                          className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <Select
                          value={currentProductOut.selectedUnit}
                          onValueChange={(value) =>
                            updateCurrentProductOutUnit(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUnits(currentProductOut.product).map(
                              (unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {stockWarnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {stockWarnings.join("; ")}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SO Number
                </label>
                <input
                  {...soNumberInput.inputProps}
                  placeholder=""
                  className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  type="submit"
                  className="btn-large bg-orange-600 hover:bg-orange-700"
                  disabled={
                    !currentProductOut && completedProductsOut.length === 0
                  }
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Preview Transactions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="btn-large"
                  onClick={handleResetOut}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </form>
          </Form>
          
        </CardContent>
      </Card>
    );
  }

  function renderLocation(product: Product) {
    const storageLocation = (product as any).storageLocation || "-";
    const storageRow = (product as any).storageRow;
    const storageDeck = (product as any).storageDeck;

    const isSectionMode = storageLocation && sectionLocationNames.has(storageLocation);

    return (
      <div className="text-sm text-gray-600">
        {storageLocation}
        {(storageRow || storageDeck) && (
          <div className="text-xs text-gray-400 mt-1">
            {isSectionMode
              ? (storageRow ? `Section: ${storageRow}` : "")
              : (
                <>
                  {storageRow ? `Row: ${storageRow}` : ""}
                  {storageDeck ? (storageRow ? ` • Deck: ${storageDeck}` : `Deck: ${storageDeck}`) : ""}
                </>
              )}
          </div>
        )}
      </div>
    );
  }
}
