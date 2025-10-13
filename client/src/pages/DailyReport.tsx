import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseExcelFile } from "../utils/excelUtils";
import { Customer, SalesOrder } from "@/types";
import { Printer, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function DailyReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [filters, setFilters] = useState({
    customerCode: "",
    customerName: "",
    soDate: "",
    soNumber: ""
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const handleUpload = async () => {
    if (!customerFile || !orderFile) {
      setError("Please upload both files.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const customerData = (await parseExcelFile(customerFile)) as Customer[];
      const salesOrderData = (await parseExcelFile(orderFile)) as SalesOrder[];
      
      // Debug: Log the first few records to understand data structure
      console.log("First customer:", customerData[0]);
      console.log("First sales order:", salesOrderData[0]);
      console.log("Sample delivery date:", salesOrderData[0]?.deliveryDate, typeof salesOrderData[0]?.deliveryDate);
      console.log("Sample customer ID:", customerData[0]?.id, typeof customerData[0]?.id);
      
      setCustomers(customerData);
      setSalesOrders(salesOrderData);
    } catch (err) {
      setError("Error loading data. Please check your files.");
    } finally {
      setLoading(false);
    }
  };

  const getCustomerOrders = (customerId: string) => {
    return salesOrders.filter(order => order.customerId === customerId);
  };

  const handleReset = () => {
    setCustomers([]);
    setSalesOrders([]);
    setCustomerFile(null);
    setOrderFile(null);
    setError("");
    setFilters({
      customerCode: "",
      customerName: "",
      soDate: "",
      soNumber: ""
    });
  };

  const getFilteredData = () => {
    if (customers.length === 0) return [];

    try {
      const result: Array<{
        customer: Customer;
        order: SalesOrder | null;
        item: string | null;
        orderIdx: number;
        itemIdx: number;
      }> = [];

      customers.forEach(customer => {
        try {
          const orders = getCustomerOrders(customer.id);
          if (orders.length === 0) {
            // Return customer with no orders if they match filters
            const matchesCode = !filters.customerCode || (() => {
              try {
                const customerId = String(customer.id || '');
                const filterCode = String(filters.customerCode || '');
                return customerId.toLowerCase().includes(filterCode.toLowerCase()) ||
                       customerId.includes(filterCode);
              } catch (e) {
                console.error('Error matching customer code:', e);
                return false;
              }
            })();
            
            const matchesName = !filters.customerName || (() => {
              try {
                const customerName = String(customer.name || '');
                const filterName = String(filters.customerName || '');
                return customerName.toLowerCase().includes(filterName.toLowerCase());
              } catch (e) {
                console.error('Error matching customer name:', e);
                return false;
              }
            })();
            
            if (matchesCode && matchesName) {
              result.push({
                customer,
                order: null,
                item: null,
                orderIdx: 0,
                itemIdx: 0
              });
            }
            return;
          }

          orders.forEach((order, orderIdx) => {
            try {
              if (!order.items || !Array.isArray(order.items)) {
                console.warn('Order items is not an array:', order);
                return;
              }

              order.items.forEach((item, itemIdx) => {
                try {
                  // Customer Code filter - check both customer.id and order.customerId
                  const matchesCode = !filters.customerCode || (() => {
                    try {
                      const customerId = String(customer.id || '');
                      const orderCustomerId = String(order.customerId || '');
                      const filterCode = String(filters.customerCode || '');
                      
                      return customerId.toLowerCase().includes(filterCode.toLowerCase()) ||
                             customerId.includes(filterCode) ||
                             orderCustomerId.toLowerCase().includes(filterCode.toLowerCase()) ||
                             orderCustomerId.includes(filterCode);
                    } catch (e) {
                      console.error('Error matching customer code:', e);
                      return false;
                    }
                  })();
                  
                  // Customer Name filter
                  const matchesName = !filters.customerName || (() => {
                    try {
                      const customerName = String(customer.name || '');
                      const filterName = String(filters.customerName || '');
                      return customerName.toLowerCase().includes(filterName.toLowerCase());
                    } catch (e) {
                      console.error('Error matching customer name:', e);
                      return false;
                    }
                  })();
                  
                  // SO Date filter - handle different date formats
                  const matchesDate = !filters.soDate || (() => {
                    try {
                      const dateStr = String(order.deliveryDate || '');
                      const filterStr = String(filters.soDate || '');

                      // Normalize and match many possible Excel date formats (serials, DD/MM/YYYY, MM/DD/YYYY, ISO)
                      const originalDateValue: any = order.deliveryDate as any;
                      const filterLower = filterStr.toLowerCase();

                      const fromExcelSerial = (serial: number) => {
                        // Excel epoch 1899-12-30
                        const excelEpoch = new Date(1899, 11, 30);
                        return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
                      };

                      const pad2 = (s: string | number) => s.toString().padStart(2, '0');

                      const buildCandidatesFromDate = (d: Date): string[] => {
                        if (isNaN(d.getTime())) return [];
                        const day = d.getDate();
                        const month = d.getMonth() + 1;
                        const year = d.getFullYear();

                        const shortYear = year.toString().slice(-2);
                        const mShort = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
                        const mLong = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();

                        return [
                          `${pad2(day)}/${pad2(month)}/${year}`,        // DD/MM/YYYY
                          `${day}/${month}/${year}`,                    // D/M/YYYY
                          `${pad2(month)}/${pad2(day)}/${year}`,        // MM/DD/YYYY
                          `${month}/${day}/${year}`,                    // M/D/YYYY
                          `${year}-${pad2(month)}-${pad2(day)}`,        // YYYY-MM-DD
                          `${pad2(day)}/${pad2(month)}/${shortYear}`,   // DD/MM/YY
                          `${pad2(month)}/${pad2(day)}/${shortYear}`,   // MM/DD/YY
                          `${day} ${mShort} ${year}`,                   // 14 Aug 2025
                          `${day} ${mLong} ${year}`,                    // 14 August 2025
                          `${mShort} ${day}, ${year}`,                  // Aug 14, 2025
                          `${mLong} ${day}, ${year}`                    // August 14, 2025
                        ].map(s => s.toLowerCase());
                      };

                      // Collect candidate strings to test against the filter input
                      let candidates: string[] = [];

                      // 1) If it's a number or numeric-like string, treat as Excel serial
                      if (typeof originalDateValue === 'number' || /^\d+(\.\d+)?$/.test(dateStr)) {
                        const num = typeof originalDateValue === 'number' ? originalDateValue : parseFloat(dateStr);
                        const d = fromExcelSerial(num);
                        candidates.push(...buildCandidatesFromDate(d));
                      }

                      // 2) If it's a string with separators, try parsing flexibly
                      const normalized = dateStr.replace(/[.\-]/g, '/');
                      const parts = normalized.split('/');
                      if (parts.length === 3) {
                        const [a, b, c] = parts.map(p => p.trim());
                        const ai = parseInt(a, 10);
                        const bi = parseInt(b, 10);
                        const ci = parseInt(c, 10);

                        // Try DD/MM/YYYY
                        if (!isNaN(ai) && !isNaN(bi) && !isNaN(ci)) {
                          const d1 = new Date(ci, (bi - 1), ai);
                          candidates.push(...buildCandidatesFromDate(d1));
                        }
                        // Try MM/DD/YYYY
                        if (!isNaN(ai) && !isNaN(bi) && !isNaN(ci)) {
                          const d2 = new Date(ci, (ai - 1), bi);
                          candidates.push(...buildCandidatesFromDate(d2));
                        }
                      }

                      // 3) Fallback: native Date parsing
                      try {
                        const d = new Date(dateStr);
                        candidates.push(...buildCandidatesFromDate(d));
                      } catch {}

                      // Always include raw strings for direct partial match
                      candidates.push(dateStr.toLowerCase());

                      // Month names array for additional direct matching when parts exist
                      const monthNames = [
                        'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
                        'january','february','march','april','may','june','july','august','september','october','november','december'
                      ];

                      // Also push combinations if we can infer month index from numeric parts
                      if (parts.length === 3) {
                        const [a, b, c] = parts;
                        const m1 = parseInt(a, 10) - 1;
                        const m2 = parseInt(b, 10) - 1;
                        if (m1 >= 0 && m1 < 12) candidates.push(monthNames[m1]);
                        if (m2 >= 0 && m2 < 12) candidates.push(monthNames[m2]);
                      }

                      // Finally perform the match across all candidates
                      const hit = candidates.some(s => s && s.includes(filterLower));
                      if (hit) return true;
                    } catch (e) {
                      return false;
                    }
                  })();
                  
                  // SO Number filter
                  const matchesSoNumber = !filters.soNumber || (() => {
                    try {
                      const orderNumber = String(order.orderNumber || '');
                      const filterNumber = String(filters.soNumber || '');
                      return orderNumber.toLowerCase().includes(filterNumber.toLowerCase()) ||
                             orderNumber.includes(filterNumber);
                    } catch (e) {
                      console.error('Error matching SO number:', e);
                      return false;
                    }
                  })();
                  
                  if (matchesCode && matchesName && matchesDate && matchesSoNumber) {
                    result.push({
                      customer,
                      order,
                      item,
                      orderIdx,
                      itemIdx
                    });
                  }
                } catch (e) {
                  console.error('Error processing item:', e, { customer, order, item, orderIdx, itemIdx });
                }
              });
            } catch (e) {
              console.error('Error processing order:', e, { customer, order, orderIdx });
            }
          });
        } catch (e) {
          console.error('Error processing customer:', e, { customer });
        }
      });

      return result;
    } catch (e) {
      console.error('Error in getFilteredData:', e);
      // Return empty array if filtering fails, but don't crash the app
      return [];
    }
  };

  const filteredData = getFilteredData();

  const handlePrint = () => {
    if (reportRef.current) {
      const printContents = reportRef.current.innerHTML;
      const printWindow = window.open("", "", "height=900,width=800");
      const now = new Date().toLocaleString();
      printWindow!.document.write(`
        <html>
          <head>
            <title>Daily Report</title>
            <style>
              :root { color-scheme: light; }
              @page { size: A4; margin: 12mm 10mm; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              html, body { height: 100%; }
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #111827;
                line-height: 1.4;
              }
              .report-header {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #E5E7EB;
              }
              .report-title {
                font-size: 18px;
                font-weight: 700;
                margin: 0;
              }
              .report-meta {
                font-size: 12px;
                color: #6B7280;
                margin-left: 12px;
                white-space: nowrap;
              }
              .report-container {
                width: 100%;
              }
              table { width: 100%; border-collapse: collapse; }
              thead tr th {
                background: #F3F4F6;
                color: #111827;
                font-size: 12px;
                font-weight: 700;
                text-align: left;
                border: 0.6px solid #E5E7EB;
                padding: 8px 10px;
              }
              tbody tr td {
                font-size: 12px;
                border: 0.6px solid #E5E7EB;
                padding: 8px 10px;
                vertical-align: top;
              }
              tbody tr:nth-child(even) td { background: #FAFAFA; }
              .align-right { text-align: right; }
              .muted { color: #6B7280; }
              .small { font-size: 11px; }
              /* Avoid breaking rows across pages */
              tr { page-break-inside: avoid; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1 class="report-title">Daily Report</h1>
              <div class="report-meta">Printed: ${now}</div>
            </div>
            <div class="report-container">${printContents}</div>
          </body>
        </html>
      `);
      printWindow!.document.close();
      printWindow!.focus();
      printWindow!.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/60 rounded-full px-3"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
        </div>

        <Card className="shadow-2xl border border-transparent backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-2xl">
            <CardTitle className="text-2xl md:text-3xl font-bold text-center flex items-center justify-between md:justify-center gap-3">
              <span className="sr-only md:not-sr-only md:opacity-0">.</span>
              Daily Report
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePrint}
                title="Print Report"
                className="bg-white text-indigo-600 hover:bg-gray-100 shadow-md"
              >
                <Printer className="w-5 h-5" />
              </Button>
            </CardTitle>
            <p className="text-center text-indigo-100 text-sm md:text-base">Upload customer and order files to generate a polished daily report.</p>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            {/* Upload Section */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-center">
              <div className="flex-1 min-w-[260px]">
                <label className="font-semibold text-sm text-gray-700">Customer File</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={e => setCustomerFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    id="customer-file-upload"
                    style={{ fontSize: '16px', minHeight: '44px' }}
                  />
                  <span className="text-sm text-gray-600 truncate max-w-[240px]">
                    {customerFile ? customerFile.name : "No file chosen"}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-[260px]">
                <label className="font-semibold text-sm text-gray-700">Sales Order File</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={e => setOrderFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    id="order-file-upload"
                    style={{ fontSize: '16px', minHeight: '44px' }}
                  />
                  <span className="text-sm text-gray-600 truncate max-w-[240px]">
                    {orderFile ? orderFile.name : "No file chosen"}
                  </span>
                </div>
              </div>
              <div className="flex items-stretch gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg px-6 py-5 md:py-2 rounded-xl"
                >
                  {loading ? "Loading..." : "Upload & Show Report"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  className="bg-gray-100 text-gray-800 hover:bg-gray-200 shadow px-6 py-5 md:py-2 rounded-xl"
                >
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-semibold mb-6">
                {error}
              </p>
            )}

            {/* Filters Section */}
            {customers.length > 0 && (
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"></path>
                  </svg>
                  Filter Report
                </h3>
                <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  💡 <strong>Tip:</strong> Filters work together. Type any part of the value you're looking for. 
                  Customer Code and SO Number support partial text. Customer Name supports partial text. 
                  SO Date supports day (14), month (8/Aug), year (2025/25), or full date (14/08/2025).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Code</label>
                    <input
                      type="text"
                      placeholder="e.g., CUST001, ABC123"
                      value={filters.customerCode}
                      onChange={(e) => setFilters({ ...filters, customerCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                    <input
                      type="text"
                      placeholder="e.g., John, Company"
                      value={filters.customerName}
                      onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SO Date</label>
                    <input
                      type="date"
                      value={filters.soDate}
                      onChange={(e) => setFilters({ ...filters, soDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SO Number</label>
                    <input
                      type="text"
                      placeholder="e.g., SO001, 2024001"
                      value={filters.soNumber}
                      onChange={(e) => setFilters({ ...filters, soNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Showing {filteredData.length} results
                    {filters.customerCode || filters.customerName || filters.soDate || filters.soNumber ? 
                      ` (filtered from ${customers.length} customers)` : 
                      ` (all ${customers.length} customers)`
                    }
                  </span>
                  <button
                    onClick={() => setFilters({
                      customerCode: "",
                      customerName: "",
                      soDate: "",
                      soNumber: ""
                    })}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Report Table */}
            <div ref={reportRef} className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xl bg-white">
              {customers.length === 0 && !loading && !error && (
                <div className="py-16 px-6 text-center text-gray-600">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center">📄</div>
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm text-gray-500">Please upload both files to generate the report.</p>
                </div>
              )}
              {customers.length > 0 && (
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur">
                    <tr className="text-gray-700 text-xs uppercase tracking-wide">
                      <th className="p-2 text-xs border-b border-gray-200">Customer Code</th>
                      <th className="p-2 text-xs border-b border-gray-200">Customer Name</th>
                      <th className="p-2 text-xs border-b border-gray-200">SO Date</th>
                      <th className="p-2 text-xs border-b border-gray-200">Item Name</th>
                      <th className="p-2 text-xs border-b border-gray-200">SO NO</th>
                      <th className="p-2 text-xs border-b border-gray-200">SO Quantity</th>
                      <th className="p-2 text-xs border-b border-gray-200">Address 1</th>
                      <th className="p-2 text-xs border-b border-gray-200">Address 2</th>
                      <th className="p-2 text-xs border-b border-gray-200">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">No results found</p>
                              <p className="text-sm text-gray-500">
                                {filters.customerCode || filters.customerName || filters.soDate || filters.soNumber 
                                  ? "Try adjusting your filters or check the console for debugging info."
                                  : "No data available to display."
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((data, idx) => {
                        const { customer, order, item, orderIdx, itemIdx } = data;
                        
                        if (!order) {
                          // Customer with no orders
                          return (
                            <tr key={`${customer.id}-no-orders`} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/60 transition-colors">
                              <td className="p-2 text-sm border-b border-gray-100">{customer.id}</td>
                              <td className="p-2 text-sm border-b border-gray-100">{customer.name}</td>
                              <td colSpan={7} className="p-2 text-sm text-gray-500 border-b border-gray-100 text-center">
                                <span className="inline-block rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-medium">No orders found</span>
                              </td>
                            </tr>
                          );
                        }
                        
                        // Calculate quantity per item (divide total by number of items)
                        const quantityPerItem = Math.ceil(order.quantity / order.items.length);
                        // Check if this is the last item of the order
                        const isLastItemOfOrder = itemIdx === order.items.length - 1;
                        
                        // Format date properly
                        const formatDate = (dateValue: any) => {
                          if (!dateValue) return "";
                          
                          // If it's already a readable date string, return it
                          if (typeof dateValue === 'string' && dateValue.includes('/')) {
                            return dateValue;
                          }
                          
                          // If it's an Excel serial number, convert it
                          if (typeof dateValue === 'number') {
                            const excelEpoch = new Date(1899, 11, 30); // Excel epoch
                            const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
                            return jsDate.toLocaleDateString('en-GB'); // DD/MM/YYYY format
                          }
                          
                          // Try to parse as date
                          try {
                            const date = new Date(dateValue);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
                            }
                          } catch (e) {
                            // If parsing fails, return original value
                          }
                          
                          return String(dateValue);
                        };
                        
                        return (
                          <tr
                            key={`${customer.id}-${order.id}-${orderIdx}-${itemIdx}`}
                            className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/60 transition-colors"
                          >
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{customer.id}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{customer.name}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{formatDate(order.deliveryDate)}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{item}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{order.orderNumber}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{quantityPerItem}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{customer.address1 || ""}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{customer.address2 || ""}</td>
                            <td className={`p-2 text-sm border-b border-gray-100 ${isLastItemOfOrder ? 'border-b-2 border-b-indigo-400' : ''}`}>{customer.phone || ""}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
