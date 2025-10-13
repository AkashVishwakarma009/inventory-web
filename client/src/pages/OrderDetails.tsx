import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, CalendarDays } from "lucide-react";
import { useLocation, Link } from "wouter";

export default function OrderDetails() {
  const [showForm, setShowForm] = useState(false);
  const [, navigate] = useLocation();
  const [employeeName, setEmployeeName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderItem, setOrderItem] = useState("");
  const [customOrderItem, setCustomOrderItem] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      let combinedOrderItems = "";
      if (orderItem && customOrderItem) {
        combinedOrderItems = `${orderItem}, ${customOrderItem}`;
      } else if (orderItem) {
        combinedOrderItems = orderItem;
      } else if (customOrderItem) {
        combinedOrderItems = customOrderItem;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName,
          customerName,
          customerNumber,
          orderNumber,
          orderItems: combinedOrderItems,
          deliveryDate,
          deliveryTime,
        }),
      });

      if (res.ok) {
        setMessage("Order details saved successfully!");
        setEmployeeName("");
        setCustomerName("");
        setCustomerNumber("");
        setOrderNumber("");
        setOrderItem("");
        setCustomOrderItem("");
        setDeliveryDate("");
        setDeliveryTime("");
        setShowForm(false);
      } else {
        setMessage("Error saving order details. Please try again.");
      }
    } catch (err) {
      setMessage("Error saving order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/">
            <Button className="btn-primary flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {!showForm && (
          <>
            <div className="modern-card p-8 text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order Management
              </h1>
              <p className="text-gray-600">Manage your orders and view reports</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {/* Create New Order */}
              <div
                className="modern-card cursor-pointer group"
                onClick={() => setShowForm(true)}
              >
                <div className="text-center">
                  <div className="gradient-purple p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Plus className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Create New Order
                  </h3>
                  <p className="text-gray-600">Add new order details</p>
                </div>
              </div>

              {/* Orders Report */}
              <div
                className="modern-card cursor-pointer group"
                onClick={() => navigate("/order-report")}
              >
                <div className="text-center">
                  <div className="gradient-blue p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <FileText className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Orders Report
                  </h3>
                  <p className="text-gray-600">View order history</p>
                </div>
              </div>

              {/* Daily Report */}
              <div
                className="modern-card cursor-pointer group"
                onClick={() => navigate("/daily-report")}
              >
                <div className="text-center">
                  <div className="gradient-green p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <CalendarDays className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Daily Report
                  </h3>
                  <p className="text-gray-600">View today’s summary</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 text-center rounded p-3 font-semibold ${
              message.includes("success")
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Order Form */}
        {showForm && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Customer Number
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={customerNumber}
                      onChange={(e) => setCustomerNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Order Number
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Order Items
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                    value={orderItem}
                    onChange={(e) => setOrderItem(e.target.value)}
                  >
                    <option value="">Select an item</option>
                    <option value="Item 1">Item 1</option>
                    <option value="Item 2">Item 2</option>
                    <option value="Item 3">Item 3</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom item"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={customOrderItem}
                    onChange={(e) => setCustomOrderItem(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Delivery Time
                    </label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Order"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
