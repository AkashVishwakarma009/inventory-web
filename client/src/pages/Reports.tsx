import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw, FileText, Calendar, Download } from "lucide-react";
import { Link } from "wouter";

type ReportType = "transactions" | "weekly-plans";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("transactions");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year" | "custom">("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  // Get weeks in month
  const getWeeksInMonth = (month: number, year: number) => {
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    let currentWeek = 1;
    let currentDate = new Date(firstDay);
    
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > lastDay) {
        weekEnd.setDate(lastDay.getDate());
      }
      
      weeks.push({
        number: currentWeek,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      currentWeek++;
    }
    
    return weeks;
  };

  // Get weeks in year
  const getWeeksInYear = (year: number) => {
    const weeks = [];
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    let currentWeek = 1;
    let currentDate = new Date(firstDay);
    
    // Adjust to start on Monday
    const day = firstDay.getDay();
    if (day !== 1) {
      const diff = day === 0 ? 6 : day - 1;
      currentDate.setDate(currentDate.getDate() - diff);
    }
    
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > lastDay) {
        weekEnd.setDate(lastDay.getDate());
      }
      
      weeks.push({
        number: currentWeek,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      currentWeek++;
    }
    
    return weeks;
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    
    switch (dateRange) {
      case "week":
        const weeksInYear = getWeeksInYear(selectedYear);
        const selectedWeekData = weeksInYear.find(w => w.number === selectedWeek);
        if (selectedWeekData) {
          params.append("startDate", selectedWeekData.start);
          params.append("endDate", selectedWeekData.end);
        }
        break;
      case "month":
        const weeksInMonth = getWeeksInMonth(selectedMonth, selectedYear);
        if (weeksInMonth.length > 0) {
          params.append("startDate", weeksInMonth[0].start);
          params.append("endDate", weeksInMonth[weeksInMonth.length - 1].end);
        }
        break;
      case "year":
        params.append("startDate", `${selectedYear}-01-01`);
        params.append("endDate", `${selectedYear}-12-31`);
        break;
      case "custom":
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
        break;
    }
    return params.toString();
  };

  // Transaction data query - matches your TransactionLog component
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", buildQueryParams()],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const url = queryString ? `/api/transactions?${queryString}` : "/api/transactions";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: hasSearched && activeReport === "transactions",
  });

  // Fetch storage locations and section dimensions to detect section-only locations
  const { data: locations } = useQuery({
    queryKey: ["/api/storage-locations"],
    queryFn: async () => {
      const res = await fetch("/api/storage-locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
    // It's okay if not searched yet; small payload and improves UX once results show
    enabled: true,
  });
  const { data: sectionDims } = useQuery({
    queryKey: ["/api/storage-dimensions?type=section"],
    queryFn: async () => {
      const res = await fetch("/api/storage-dimensions?type=section", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dimensions");
      return res.json();
    },
    enabled: true,
  });

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

  // Helper to render location details under product (section-aware)
  function renderLocation(product: any) {
    if (!product) return null;
    const storageLocation = product.storageLocation || "-";
    const storageRow = product.storageRow;
    const storageDeck = product.storageDeck;
    const isSectionMode = storageLocation && sectionLocationNames.has(storageLocation);

    return (
      <div className="text-xs text-gray-500 mt-1">
        {storageLocation}
        {(storageRow || storageDeck) && (
          <div className="text-[11px] text-gray-400 mt-0.5">
            {isSectionMode ? (
              storageRow ? `Section: ${storageRow}` : ""
            ) : (
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

  // Weekly plans data query - matches your WeeklyStockPlanning component
  const { data: weeklyPlans = [], isLoading: weeklyPlansLoading } = useQuery({
    queryKey: ["/api/weekly-stock-plans", buildQueryParams()],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const url = queryString ? `/api/weekly-stock-plans?${queryString}` : "/api/weekly-stock-plans";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch weekly plans");
      return response.json();
    },
    enabled: hasSearched && activeReport === "weekly-plans",
  });

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateRange("week");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setSelectedWeek(1);
    setHasSearched(false);
  };

  const downloadReport = () => {
    let csvContent = "";
    let fileName = "";

    if (activeReport === "transactions") {
      fileName = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Date,Product,Location,Row/Deck/Section,Expiry,Type,Quantity,Unit,User,Reference\n";
      transactions.forEach((tx: any) => {
        const p = tx.product || {};
        const storageLocation = p.storageLocation || "";
        const isSection = storageLocation && sectionLocationNames.has(storageLocation);
        const rowDeckSec = isSection
          ? (p.storageRow ? `Section: ${p.storageRow}` : "")
          : [p.storageRow ? `Row: ${p.storageRow}` : "", p.storageDeck ? `Deck: ${p.storageDeck}` : ""].filter(Boolean).join(" | ");
        const expiry = p.expiryDate || tx.productExpiry || "";
        csvContent += `${new Date(tx.transactionDate).toLocaleString()},"${p.name || 'N/A'}","${storageLocation}","${rowDeckSec}","${expiry}","${tx.type === 'stock_in' ? 'Stock In' : 'Stock Out'}","${tx.quantity}","${p.unit || 'N/A'}","${tx.user?.username || 'System'}","${tx.poNumber || tx.soNumber || 'N/A'}"\n`;
      });
    } else {
      fileName = `weekly-plans-report-${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Product,Week Start,Week End,Planned Qty,Actual Qty,Variance,Unit\n";
      weeklyPlans.forEach((plan: any) => {
        const variance = parseFloat(plan.plannedQuantity) - parseFloat(plan.actualUsage || 0);
        csvContent += `${plan.product?.name || 'N/A'},"${new Date(plan.weekStartDate).toLocaleDateString()}","${new Date(plan.weekEndDate).toLocaleDateString()}","${plan.plannedQuantity}","${plan.actualUsage || 0}","${variance.toFixed(2)}","${plan.unit}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get weeks for the selected month/year
  const getCurrentWeeks = () => {
    if (dateRange === "month") {
      return getWeeksInMonth(selectedMonth, selectedYear);
    } else if (dateRange === "week") {
      return getWeeksInYear(selectedYear);
    }
    return [];
  };

  const currentWeeks = getCurrentWeeks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-indigo-50 to-blue-100 py-10 px-2">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 mb-1 drop-shadow-lg">
              Reports Dashboard
            </h1>
            <p className="text-indigo-700 font-medium tracking-wide">
              View and analyze inventory data
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-indigo-300 shadow hover:bg-indigo-50 transition">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex gap-3 mb-8 justify-center">
          <Button
            variant={activeReport === "transactions" ? "default" : "outline"}
            onClick={() => {
              setActiveReport("transactions");
              setHasSearched(false);
            }}
            className={`gap-2 rounded-full px-6 py-2 shadow ${activeReport === "transactions" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 border-indigo-200"}`}
          >
            <FileText className="h-5 w-5" />
            Transaction Report
          </Button>
          <Button
            variant={activeReport === "weekly-plans" ? "default" : "outline"}
            onClick={() => {
              setActiveReport("weekly-plans");
              setHasSearched(false);
            }}
            className={`gap-2 rounded-full px-6 py-2 shadow ${activeReport === "weekly-plans" ? "bg-pink-500 text-white" : "bg-white text-pink-700 border-pink-200"}`}
          >
            <Calendar className="h-5 w-5" />
            Weekly Plans Report
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Search className="h-5 w-5" />
              Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-indigo-700">Search Product</label>
                <Input
                  placeholder="Enter product name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-indigo-200 focus:border-indigo-400"
                />
              </div>
              {/* Date Range Selector */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-indigo-700">Date Range</label>
                <Select 
                  value={dateRange} 
                  onValueChange={(value) => {
                    setDateRange(value as any);
                    setHasSearched(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                    <SelectItem value="year">By Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Dynamic Filters */}
              <div className="flex flex-col">
                <label className="block text-sm font-semibold mb-1 text-indigo-700">Filter By</label>
                {/* Year selector */}
                {dateRange !== "custom" && (
                  <div className="mb-2">
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => {
                        setSelectedYear(parseInt(value));
                        setHasSearched(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Month selector */}
                {dateRange === "month" && (
                  <div className="mb-2">
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => {
                        setSelectedMonth(parseInt(value));
                        setHasSearched(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i+1} value={(i+1).toString()}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Week selector */}
                {dateRange === "week" && currentWeeks.length > 0 && (
                  <div>
                    <Select
                      value={selectedWeek.toString()}
                      onValueChange={(value) => {
                        setSelectedWeek(parseInt(value));
                        setHasSearched(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select week" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentWeeks.map((week) => (
                          <SelectItem key={week.number} value={week.number.toString()}>
                            Week {week.number} ({new Date(week.start).toLocaleDateString()} - {new Date(week.end).toLocaleDateString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Custom date range inputs */}
                {dateRange === "custom" && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setHasSearched(false);
                      }}
                      placeholder="Start date"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setHasSearched(false);
                      }}
                      placeholder="End date"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleReset} className="gap-2 border-indigo-200 hover:bg-indigo-50">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
              <Button onClick={handleSearch} className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section - Only shown after search */}
        {hasSearched && (
          <Card className="shadow-xl border-0 bg-white/95">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {activeReport === "transactions" ? (
                    <>
                      <FileText className="h-5 w-5" />
                      Transaction Report Results
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5" />
                      Weekly Plan Report Results
                    </>
                  )}
                </CardTitle>
                <Button onClick={downloadReport} variant="outline" className="gap-2 border-indigo-200 hover:bg-indigo-50">
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeReport === "transactions" ? (
                <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white/90 shadow">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Row/Deck/Section</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : transactions.length > 0 ? (
                        transactions.map((tx: any) => (
                          <TableRow key={tx.id} className="hover:bg-indigo-50/60 transition">
                            <TableCell>{new Date(tx.transactionDate).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="font-medium">{tx.product?.name || "N/A"}</div>
                            </TableCell>
                            <TableCell>{tx.product?.storageLocation || "-"}</TableCell>
                            <TableCell>
                              {(() => {
                                const p = tx.product || {};
                                const loc = p.storageLocation;
                                const isSection = loc && sectionLocationNames.has(loc);
                                if (isSection) {
                                  return p.storageRow ? `Section: ${p.storageRow}` : "";
                                }
                                const r = p.storageRow ? `Row: ${p.storageRow}` : "";
                                const d = p.storageDeck ? (p.storageRow ? ` • Deck: ${p.storageDeck}` : `Deck: ${p.storageDeck}`) : "";
                                return (
                                  <>
                                    {r}
                                    {d}
                                  </>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const expiry = tx.product?.expiryDate || tx.productExpiry;
                                if (!expiry) return "-";
                                try {
                                  const d = new Date(expiry);
                                  return isNaN(d.getTime()) ? String(expiry) : d.toISOString().split("T")[0];
                                } catch {
                                  return String(expiry);
                                }
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={tx.type === "stock_in" ? "default" : "secondary"}
                                className={
                                  tx.type === "stock_in"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {tx.type === "stock_in" ? "Stock In" : "Stock Out"}
                              </Badge>
                            </TableCell>
                            <TableCell>{parseFloat(tx.quantity).toFixed(2)}</TableCell>
                            <TableCell>{tx.product?.unit || "N/A"}</TableCell>
                            <TableCell>{tx.user?.username || "System"}</TableCell>
                            <TableCell>
                              {tx.poNumber || tx.soNumber || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No transactions found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-pink-100 bg-white/90 shadow">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Week Start</TableHead>
                        <TableHead>Week End</TableHead>
                        <TableHead>Planned Qty</TableHead>
                        <TableHead>Actual Qty</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyPlansLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading weekly plans...
                          </TableCell>
                        </TableRow>
                      ) : weeklyPlans.length > 0 ? (
                        weeklyPlans.map((plan: any) => {
                          const variance = parseFloat(plan.plannedQuantity) - parseFloat(plan.actualUsage || 0);
                          return (
                            <TableRow key={`${plan.productId}-${plan.weekStartDate}`} className="hover:bg-pink-50/60 transition">
                              <TableCell>{plan.product?.name || "N/A"}</TableCell>
                              <TableCell>{new Date(plan.weekStartDate).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(plan.weekEndDate).toLocaleDateString()}</TableCell>
                              <TableCell>{parseFloat(plan.plannedQuantity).toFixed(2)}</TableCell>
                              <TableCell>{parseFloat(plan.actualUsage || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={variance >= 0 ? "default" : "destructive"}>
                                  {variance.toFixed(2)}
                                </Badge>
                              </TableCell>
                              <TableCell>{plan.unit}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No weekly plans found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
