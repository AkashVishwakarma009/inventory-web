import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package, ArrowLeft, Printer, Edit, Save, X } from "lucide-react";
import type { Product, WeeklyStockPlanWithDetails } from "@shared/schema";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Unit = "ml" | "l" | "kg" | "g";

export default function WeeklyStockPlanning() {
  const [selectedWeek, setSelectedWeek] = useState<"previous" | "previous2">("previous");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedPlans, setEditedPlans] = useState<Record<number, { quantity: string; unit: Unit }>>({});
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const normalizeDate = (dateString: string) => dateString.split("T")[0];

  const [plans, setPlans] = useState<Record<number, { quantity: string; unit: string }>>({});


  // Date range calculations (keep your existing functions)
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  const getPreviousWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const end = new Date(now);
    end.setDate(now.getDate() - day);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  const getPrevious2WeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const end = new Date(now);
    end.setDate(now.getDate() - day - 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  const getNextWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day + 8);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: weeklyPlans = [], isLoading: plansLoading } = useQuery<WeeklyStockPlanWithDetails[]>({
    queryKey: ["/api/weekly-stock-plans"],
  });

  const { data: stockOuts = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-outs"],
  });
  const handleSaveAllPlans = async () => {
  const payload = Object.entries(editedPlans).map(([productId, plan]) => {
    const product = products.find(p => p.id === Number(productId));
    return {
      productId: Number(productId),
      name: product ? product.name : "", // <-- Add this line
      weekStartDate: nextWeek.start,
      weekEndDate: nextWeek.end,
      plannedQuantity: plan.quantity,
      unit: plan.unit,
      presentStock: product ? product.currentStock : "0",
      previousWeekStock: getOutQuantityForWeek(
        Number(productId),
        weekToShow.start,
        weekToShow.end
      ),
    };
  });

  try {
    const res = await fetch("/api/weekly-stock-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to save weekly plans");

    toast({
      title: "Success",
      description: "Weekly plans saved!",
      variant: "default",
    });
  } catch (err) {
    console.error(err);
    toast({
      title: "Error",
      description: "Error saving plans",
      variant: "destructive",
    });
  }
};


  const savePlanMutation = useMutation({
    mutationFn: async (planData: {
      productId: number;
      weekStartDate: string;
      weekEndDate: string;
      plannedQuantity: string;
      unit: Unit;
    }) => {
      // Replace with your actual API call
      // const response = await fetch("/api/weekly-stock-plans", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(planData),
      // });
      // return response.json();
      return Promise.resolve(planData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plan saved successfully",
        variant: "default",
      });
      setEditingProductId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save plan",
        variant: "destructive",
      });
    },
  });

  const getOutQuantityForWeek = (productId: number, startDate: string, endDate: string) => {
    const outs = stockOuts.filter(
      (o) =>
        o.productId === productId &&
        normalizeDate(o.weekStartDate) === startDate &&
        normalizeDate(o.weekEndDate) === endDate
    );
    const total = outs.reduce((sum, o) => sum + parseFloat(o.outQuantity), 0);
    return total.toFixed(2);
  };

  const getPlannedStockForWeek = (productId: number, startDate: string, endDate: string) => {
    const plan = weeklyPlans.find(
      (p) =>
        p.productId === productId &&
        normalizeDate(p.weekStartDate) === startDate &&
        normalizeDate(p.weekEndDate) === endDate
    );
    return plan ? `${parseFloat(plan.plannedQuantity).toFixed(2)} ${plan.unit}` : "N/A";
  };

  const handleEdit = (productId: number) => {
    const existingPlan = weeklyPlans.find(
      (p) => p.productId === productId && 
        normalizeDate(p.weekStartDate) === nextWeek.start && 
        normalizeDate(p.weekEndDate) === nextWeek.end
    );
    
    setEditedPlans({
      ...editedPlans,
      [productId]: {
        quantity: existingPlan?.plannedQuantity || "",
        unit: existingPlan?.unit as Unit || "kg"
      }
    });
    setEditingProductId(productId);
  };

  const handleSave = (productId: number) => {
    const editedPlan = editedPlans[productId];
    if (!editedPlan) return;

    savePlanMutation.mutate({
      productId,
      weekStartDate: nextWeek.start,
      weekEndDate: nextWeek.end,
      plannedQuantity: editedPlan.quantity,
      unit: editedPlan.unit
    });
  };

  const handleCancel = () => {
    setEditingProductId(null);
  };

  if (productsLoading || plansLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  const previousWeek = getPreviousWeekRange();
  const previous2Week = getPrevious2WeekRange();
  const nextWeek = getNextWeekRange();
  const currentWeek = getCurrentWeekRange();
  const weekToShow = selectedWeek === "previous" ? previousWeek : previous2Week;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-indigo-50 to-blue-100 py-10 px-2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 mb-1 drop-shadow-lg">
              📦 Weekly Stock Planning
            </h1>
            <p className="text-indigo-700 font-medium tracking-wide">
              Plan and review inventory across weeks
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Link href="/">
              <Button variant="outline" className="gap-2 border-indigo-300 shadow hover:bg-indigo-50 transition">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 rounded-2xl shadow-lg p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-indigo-100">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-sm font-semibold mb-1 text-indigo-700">Search Product</label>
            <input
              className="border border-indigo-200 rounded-md px-3 py-2 text-sm w-full sm:w-64 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              placeholder="Enter product name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <label className="text-sm font-semibold mb-1 block text-indigo-700">Select Week</label>
            <div className="flex gap-2">
              <Button
                variant={selectedWeek === "previous" ? "default" : "outline"}
                className={`rounded-full px-5 py-2 shadow ${selectedWeek === "previous" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 border-indigo-200"}`}
                onClick={() => setSelectedWeek("previous")}
              >
                Previous Week
              </Button>
              <Button
                variant={selectedWeek === "previous2" ? "default" : "outline"}
                className={`rounded-full px-5 py-2 shadow ${selectedWeek === "previous2" ? "bg-pink-500 text-white" : "bg-white text-pink-700 border-pink-200"}`}
                onClick={() => setSelectedWeek("previous2")}
              >
                Week Before Last
              </Button>
            </div>
          </div>
        </div>

        {/* Current Week Summary */}
        {showHistory && (
          <Card className="shadow-lg border-0 mb-8 bg-white/95">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableCaption className="text-sm text-indigo-700 font-medium">
                  Current Week: {formatDate(currentWeek.start)} to {formatDate(currentWeek.end)}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Planned Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={`current-${product.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-indigo-500" />
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell>{parseFloat(product.currentStock).toFixed(2)} {product.unit}</TableCell>
                      <TableCell>
                        {getPlannedStockForWeek(product.id, currentWeek.start, currentWeek.end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Main Table */}
        <Card className="shadow-xl border-0 bg-white/95">
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[900px]">
              <TableCaption className="text-base text-indigo-700 font-medium">
                Week: {formatDate(weekToShow.start)} to {formatDate(weekToShow.end)}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>
                    Previous Week Stock
                    <div className="text-xs text-gray-500">
                      ({formatDate(weekToShow.start)} - {formatDate(weekToShow.end)})
                    </div>
                  </TableHead>
                  <TableHead>
                    Next Week Plan
                    <div className="text-xs text-gray-500">
                      ({formatDate(nextWeek.start)} - {formatDate(nextWeek.end)})
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const plannedQty = parseFloat(editedPlans[product.id]?.quantity || "0");
                  const currentQty = parseFloat(product.currentStock);
                  const showLowStockAlert = plannedQty > 0 && plannedQty > currentQty;

                  return (
                    <TableRow key={product.id} className="hover:bg-indigo-50/60 transition">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-indigo-500" />
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell>{currentQty.toFixed(2)}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-pink-600 font-semibold">
                        {getOutQuantityForWeek(
                          product.id,
                          weekToShow.start,
                          weekToShow.end
                        )}{" "}
                        {product.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="border border-indigo-200 rounded-md px-2 py-1 w-20 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                            placeholder="Qty"
                            value={editedPlans[product.id]?.quantity || ""}
                            onChange={(e) =>
                              setEditedPlans((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  quantity: e.target.value,
                                  unit: prev[product.id]?.unit || product.unit,
                                },
                              }))
                            }
                          />
                          <Select
                            value={editedPlans[product.id]?.unit || product.unit}
                            onValueChange={(value: Unit) =>
                              setEditedPlans((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  unit: value,
                                  quantity: prev[product.id]?.quantity || "",
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-24 h-8 border-indigo-200 focus:border-indigo-400">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="l">l</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                            </SelectContent>
                          </Select>
                          {showLowStockAlert && (
                            <span className="ml-2 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold shadow">
                              Low Stock!
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right">
                    <Button
                      onClick={handleSaveAllPlans}
                      disabled={savePlanMutation.isPending}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 shadow rounded-full px-8 py-2"
                    >
                      Save All Plans
                    </Button>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
