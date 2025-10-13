import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface Order {
  id: number;
  employeeName: string;
  customerName: string;
  customerNumber: string;
  orderNumber: string;
  orderItems: string;
  deliveryDate: string;
  deliveryTime: string;
  createdAt: string;
}

const OrderReport: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter states (vertical step-by-step form)
  const [filters, setFilters] = useState({
    employeeName: "",
    orderNumber: "",
    startDate: "",
    endDate: ""
  });
  const [filteredResults, setFilteredResults] = useState<Order[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Separate export date filters
  const [exportFilters, setExportFilters] = useState({
    startDate: "",
    endDate: ""
  });
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showNoDataModal, setShowNoDataModal] = useState(false);

  useEffect(() => {
    fetch("/api/orders")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then(data => {
        const orderData = data.orders || data;
        setOrders(orderData);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load order report.");
        setLoading(false);
      });
  }, []);

  // Handle filter search (no generic text search anymore)
  const handleFilterSearch = () => {
    let filtered = [...orders];
    let hasActiveFilters = false;

    // 1) Employee
    if (filters.employeeName.trim()) {
      filtered = filtered.filter(order =>
        order.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase())
      );
      hasActiveFilters = true;
    }

    // 2) Order number
    if (filters.orderNumber.trim()) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())
      );
      hasActiveFilters = true;
    }

    // 3) Start date
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate;
      });
      hasActiveFilters = true;
    }

    // 4) End date
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate <= endDate;
      });
      hasActiveFilters = true;
    }

    setFilteredResults(filtered);
    setIsFiltered(hasActiveFilters);
    setHasSearched(true);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      employeeName: "",
      orderNumber: "",
      startDate: "",
      endDate: ""
    });
    setFilteredResults([]);
    setIsFiltered(false);
    setHasSearched(false);
  };

  // Unique employees for dropdown
  const uniqueEmployees = Array.from(new Set(orders.map(order => order.employeeName))).sort();

  // Use filteredResults for the list
  const filteredOrders = filteredResults;

  // CSV download handler (filtered if applied, else all)
  const handleDownload = () => {
    const dataToExport = isFiltered ? filteredOrders : orders;
    if (!dataToExport.length) return;

    const header = [
      "Order #",
      "Employee",
      "Customer Name",
      "Customer Number",
      "Order Items",
      "Delivery Date",
      "Delivery Time",
      "Created At"
    ];

    const rows = dataToExport.map(order => [
      order.orderNumber,
      order.employeeName,
      order.customerName,
      order.customerNumber,
      order.orderItems,
      order.deliveryDate,
      order.deliveryTime,
      order.createdAt ? new Date(order.createdAt).toLocaleString() : ""
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Filename based on current filters
    let filename = `order-report-${new Date().toISOString().slice(0, 10)}`;
    if (isFiltered) {
      if (filters.startDate && filters.endDate) {
        filename = `order-report-${filters.startDate}-to-${filters.endDate}`;
      } else if (filters.startDate) {
        filename = `order-report-from-${filters.startDate}`;
      } else if (filters.endDate) {
        filename = `order-report-until-${filters.endDate}`;
      } else {
        filename = `order-report-filtered-${new Date().toISOString().slice(0, 10)}`;
      }
    }

    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export with custom date range (separate)
  const handleDateExport = () => {
    let dataToExport = [...orders];

    if (exportFilters.startDate) {
      const startDate = new Date(exportFilters.startDate);
      dataToExport = dataToExport.filter(order => new Date(order.createdAt) >= startDate);
    }

    if (exportFilters.endDate) {
      const endDate = new Date(exportFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      dataToExport = dataToExport.filter(order => new Date(order.createdAt) <= endDate);
    }

    if (!dataToExport.length) {
      setShowNoDataModal(true);
      return;
    }

    const header = [
      "Order #",
      "Employee",
      "Customer Name",
      "Customer Number",
      "Order Items",
      "Delivery Date",
      "Delivery Time",
      "Created At"
    ];

    const rows = dataToExport.map(order => [
      order.orderNumber,
      order.employeeName,
      order.customerName,
      order.customerNumber,
      order.orderItems,
      order.deliveryDate,
      order.deliveryTime,
      order.createdAt ? new Date(order.createdAt).toLocaleString() : ""
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    let filename = `order-report-${new Date().toISOString().slice(0, 10)}`;
    if (exportFilters.startDate && exportFilters.endDate) {
      filename = `order-report-${exportFilters.startDate}-to-${exportFilters.endDate}`;
    } else if (exportFilters.startDate) {
      filename = `order-report-from-${exportFilters.startDate}`;
    } else if (exportFilters.endDate) {
      filename = `order-report-until-${exportFilters.endDate}`;
    }

    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download receipt
  const handleDownloadReceipt = (order: Order) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Receipt</title>
  <style>
    @media print {
      @page { size: auto; margin: 20mm; }
      body { background: #fff !important; }
      .print-btn { display: none !important; }
    }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .receipt-container { max-width: 800px; margin: 20px auto; background: #fff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
    .receipt-header { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .receipt-title { font-size: 1.2rem; opacity: 0.9; font-weight: 300; }
    .receipt-content { padding: 40px; }
    .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
    .info-section { background: #f8fafc; padding: 25px; border-radius: 15px; border-left: 5px solid #667eea; }
    .info-title { font-size: 1.1rem; font-weight: 700; color: #374151; margin-bottom: 15px; display: flex; align-items: center; }
    .info-item { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .info-label { font-weight: 600; color: #6b7280; }
    .info-value { color: #374151; font-weight: 500; }
    .items-section { background: #fff; border: 2px solid #e5e7eb; border-radius: 15px; padding: 30px; margin-bottom: 30px; }
    .items-title { font-size: 1.3rem; font-weight: 700; color: #374151; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; }
    .items-content { background: #f8fafc; padding: 20px; border-radius: 10px; font-size: 1rem; line-height: 1.6; color: #374151; }
    .receipt-footer { text-align: center; padding: 30px; background: #f8fafc; border-top: 1px solid #e5e7eb; }
    .print-btn { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .print-btn:hover { transform: translateY(-2px); }
    @media (max-width: 768px) {
      .receipt-container { margin: 10px; border-radius: 15px; }
      .receipt-header { padding: 20px 15px; }
      .receipt-content { padding: 15px !important; }
      .order-info { grid-template-columns: 1fr !important; gap: 15px !important; }
      .info-section { margin-bottom: 15px !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <img src="/assets/111_1750417572953.png" alt="Company Logo" style="height: 60px; width: auto; margin: 0 auto 10px;" />
      <div class="receipt-title">Order Receipt</div>
    </div>
    <div class="receipt-content">
      <div class="order-info">
        <div class="info-section">
          <div class="info-title">📋 Order Information</div>
          <div class="info-item"><span class="info-label">Order Number:</span><span class="info-value">#${order.orderNumber}</span></div>
          <div class="info-item"><span class="info-label">Employee:</span><span class="info-value">${order.employeeName}</span></div>
          <div class="info-item"><span class="info-label">Order Date:</span><span class="info-value">${new Date(order.createdAt).toLocaleDateString()}</span></div>
        </div>
        <div class="info-section">
          <div class="info-title">👤 Customer Details</div>
          <div class="info-item"><span class="info-label">Name:</span><span class="info-value">${order.customerName}</span></div>
          <div class="info-item"><span class="info-label">Phone:</span><span class="info-value">${order.customerNumber}</span></div>
        </div>
      </div>
      <div class="info-section" style="margin-bottom: 30px;">
        <div class="info-title">🚚 Delivery Information</div>
        <div class="info-item"><span class="info-label">Delivery Date:</span><span class="info-value">${new Date(order.deliveryDate).toLocaleDateString()}</span></div>
        <div class="info-item"><span class="info-label">Delivery Time:</span><span class="info-value">${order.deliveryTime}</span></div>
      </div>
      <div class="items-section">
        <div class="items-title">📦 Order Items</div>
        <div class="items-content">${order.orderItems}</div>
      </div>
    </div>
    <div class="receipt-footer">
      <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Orders</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">

        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Link href="/order-details">
            <Button className="flex items-center gap-2 text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Order Details</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-center mb-4 sm:mb-6 border border-gray-100">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">📊 Orders Report</h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">View and manage all orders</p>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border border-gray-100">
          <div className="space-y-4">

            {/* When filtered, show info + clear */}
            {isFiltered && (
              <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"></path>
                  </svg>
                  <span className="text-blue-800 font-medium text-sm sm:text-base">
                    Showing filtered results ({filteredOrders.length} orders)
                  </span>
                </div>
                <button
                  onClick={handleClearFilters}
                  className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}

            {/* Step-by-step vertical filters (always visible) */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
              <h3 className="text-sm sm:text-base font-semibold text-gray-700">Filter Orders</h3>
              <p className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                Set filters below (Employee → Order Number → Start Date → End Date) and click <b>Search</b>.
              </p>

              {/* Step 1: Employee */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full "></div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Employee</label>
                </div>
                <select
                  value={filters.employeeName}
                  onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Employees</option>
                  {uniqueEmployees.map(employee => (
                    <option key={employee} value={employee}>{employee}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Order Number */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center"></div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Order Number</label>
                </div>
                <input
                  type="text"
                  placeholder="Enter order number"
                  value={filters.orderNumber}
                  onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Step 3: Start Date */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full  text-white text-xs flex items-center justify-center"></div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Start Date</label>
                </div>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Step 4: End Date */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full  text-white text-xs flex items-center justify-center"></div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">End Date</label>
                </div>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleFilterSearch}
                  className="flex items-center justify-center bg-blue-600  text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  Search
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Clear
                </button>
              </div>
            </div>

            {/* Export Section */}
            <div className="space-y-3">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {isFiltered ? (
                  <span>Export Filtered CSV ({filteredOrders.length} orders)</span>
                ) : (
                  <span>Export All CSV ({orders.length} orders)</span>
                )}
              </button>

              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className={`w-full sm:w-auto flex items-center justify-center font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base ${
                  showExportOptions ? "bg-purple-600 text-white shadow-lg" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                {showExportOptions ? "Hide Date Export" : "Export by Date Range"}
              </button>

              {showExportOptions && (
                <div className="bg-purple-50 rounded-lg p-4 space-y-4 border border-purple-200">
                  <h4 className="text-sm sm:text-base font-semibold text-purple-800">Export by Custom Date Range</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={exportFilters.startDate}
                        onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">To Date</label>
                      <input
                        type="date"
                        value={exportFilters.endDate}
                        onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 border-t border-purple-200">
                    <button
                      onClick={handleDateExport}
                      className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Export Date Range CSV
                    </button>
                    <button
                      onClick={() => setExportFilters({ startDate: "", endDate: "" })}
                      className="flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Clear Dates
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            {!isFiltered && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{orders.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{filteredOrders.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Showing</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                    {orders.filter(order => new Date(order.deliveryDate) >= new Date()).length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Upcoming</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content messages / results */}
        {!hasSearched ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Filter Orders</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Use the step-by-step filters above and press <b>Search</b> to view order reports.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Orders Found</h3>
            <p className="text-sm sm:text-base text-gray-600">
              No orders match your filters. Try adjusting them and search again.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-sm sm:text-base font-semibold">Results ({filteredOrders.length})</h3>
                <span className="text-blue-100 text-xs">Filtered view</span>
              </div>
            </div>
            <div className="p-2 sm:p-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Order #</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Employee</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Items</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Delivery</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700">Created</th>
                      <th className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order, idx) => (
                      <tr key={order.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="font-semibold text-gray-800">#{order.orderNumber}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-gray-700">{order.employeeName}</td>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="text-gray-800 font-medium truncate max-w-[10rem] sm:max-w-[14rem]">{order.customerName}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-gray-600 truncate max-w-[8rem] sm:max-w-[12rem]">{order.customerNumber}</td>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="text-gray-700 bg-gray-50 border border-gray-100 px-2 py-1 rounded md:max-w-xs lg:max-w-sm xl:max-w-md truncate">
                            {order.orderItems}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-gray-800">
                          {new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-gray-600">{order.deliveryTime}</td>
                        <td className="px-2 sm:px-3 py-2 text-gray-600">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(order)}
                            className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-1.5 px-3 rounded shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a1 1 0 01-1-1V8a2 2 0 012-2h11m-6 0V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2V9"></path>
                            </svg>
                            <span className="hidden sm:inline">Receipt</span>
                            <span className="sm:hidden">↓</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Data Modal */}
      {showNoDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 rounded-t-2xl text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
              <p className="text-orange-100 text-sm">We couldn't find any orders for your selected date range</p>
            </div>

            <div className="p-6 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {exportFilters.startDate && exportFilters.endDate ? (
                    <>
                      No orders were created between <br />
                      <span className="font-semibold text-gray-800">
                        {new Date(exportFilters.startDate).toLocaleDateString()}
                      </span>{" "}
                      and{" "}
                      <span className="font-semibold text-gray-800">
                        {new Date(exportFilters.endDate).toLocaleDateString()}
                      </span>
                    </>
                  ) : exportFilters.startDate ? (
                    <>
                      No orders were created from <br />
                      <span className="font-semibold text-gray-800">
                        {new Date(exportFilters.startDate).toLocaleDateString()}
                      </span>{" "}
                      onwards
                    </>
                  ) : exportFilters.endDate ? (
                    <>
                      No orders were created until <br />
                      <span className="font-semibold text-gray-800">
                        {new Date(exportFilters.endDate).toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    "Please try selecting a different date range"
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-gray-500">💡 Try adjusting your date range or check other dates</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setExportFilters({ startDate: "", endDate: "" });
                      setShowNoDataModal(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-sm"
                  >
                    Reset Dates
                  </button>
                  <button
                    onClick={() => setShowNoDataModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-all text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderReport;
