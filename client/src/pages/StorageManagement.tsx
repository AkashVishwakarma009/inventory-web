import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProductSchema, type Product, insertStorageLocationSchema, type StorageLocation } from "@shared/schema";
import { z } from "zod";

// Form schema limited to storage edits
const storageEditSchema = updateProductSchema.pick({
  storageLocation: true,
  storageRow: true,
  storageDeck: true,
});

type StorageEditForm = z.infer<typeof storageEditSchema>;

// Locations will be fetched from API; keep fallback for safety
const fallbackLocations = [
  "Dry Storage Location",
  "Cold Storage",
  "Freezer Storage",
  "Overflow Storage",
  "Package Storage Room",
];
const rows = Array.from({ length: 4 }, (_, i) => `Row ${i + 1}`);
const decks = Array.from({ length: 4 }, (_, i) => `Deck ${i + 1}`);
const packageSections = ["B1", "B2", "B3", "B4"];

export default function StorageManagement() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");

  const userRoles = (user as any)?.roles || [(user as any)?.role].filter(Boolean);
  const hasRole = (role: string) => userRoles?.includes(role);
  const hasAccess =
    user && (hasRole("super_admin") || hasRole("master_inventory_handler") || hasRole("storage_management"));

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage storage locations.",
        variant: "destructive",
      });
    }
  }, [isLoading, isAuthenticated, hasAccess, toast]);

  const { data: locations } = useQuery({
    queryKey: ["/api/storage-locations"],
    enabled: isAuthenticated && !!user,
  });

  // Management state: selected location for dimensions
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // Fetch dimensions for selected location
  const { data: dimsAll } = useQuery({
    queryKey: ["/api/storage-dimensions", selectedLocationId],
    enabled: isAuthenticated && !!user && !!selectedLocationId,
    queryFn: async () => {
      const params = selectedLocationId ? `?locationId=${selectedLocationId}` : "";
      const res = await apiRequest("GET", `/api/storage-dimensions${params}`);
      return await res.json();
    },
  });

  const rowsDims = useMemo(() => (Array.isArray(dimsAll) ? dimsAll.filter((d: any) => d.type === "row") : []), [dimsAll]);
  const decksDims = useMemo(() => (Array.isArray(dimsAll) ? dimsAll.filter((d: any) => d.type === "deck") : []), [dimsAll]);
  const sectionsDims = useMemo(() => (Array.isArray(dimsAll) ? dimsAll.filter((d: any) => d.type === "section") : []), [dimsAll]);

  // Add/Delete dimensions
  const addDimension = useMutation({
    mutationFn: async ({ locationId, type, name }: { locationId: number; type: "row"|"deck"|"section"; name: string }) => {
      return await apiRequest("POST", "/api/storage-dimensions", { locationId, type, name });
    },
    onSuccess: async (res) => {
      // Distinguish between created (201) and already existing (200)
      queryClient.invalidateQueries({ queryKey: ["/api/storage-dimensions", selectedLocationId] });
      // If Inventory is viewing Package Storage Room, invalidate its section query too
      queryClient.invalidateQueries({ queryKey: ["/api/storage-dimensions", selectedLocationId, "section"] });
      if ((res as Response).status === 200) {
        toast({ title: "Already exists", description: "This item already exists for the selected location.", variant: "default" });
      } else {
        toast({ title: "Added", description: "Created successfully" });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create", variant: "destructive" });
    }
  });

  const deleteDimension = useMutation({
    mutationFn: async (id: number) => await apiRequest("DELETE", `/api/storage-dimensions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage-dimensions", selectedLocationId] });
      toast({ title: "Deleted", description: "Removed successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: number) => await apiRequest("DELETE", `/api/storage-locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      if (selectedLocationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/storage-dimensions", selectedLocationId] });
      }
      setSelectedLocationId(null);
      toast({ title: "Location deleted", description: "Location and its dimensions have been removed" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete location", variant: "destructive" });
    }
  });

  // Removed product list/editing – this page focuses on managing locations and dimensions only

  // Add new storage location
  const addLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      const body: StorageLocation = { id: 0 as any, name, createdAt: undefined as any };
      // Validate via zod and send minimal body
      const parsed = insertStorageLocationSchema.parse({ name });
      return await apiRequest("POST", "/api/storage-locations", parsed as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      toast({ title: "Added", description: "New storage location added" });
      setAddLocOpen(false);
      setNewLocName("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add storage location", variant: "destructive" });
    },
  });

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

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                className="group border border-gray-200 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 shadow-sm rounded-full px-4 py-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-0.5" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Storage Management</h1>
              <p className="text-sm sm:text-base text-gray-600">Create locations and organize inventory with Rows, Decks, and Sections</p>
            </div>
          </div>
          <div>
            <Button onClick={() => setAddLocOpen(true)}>Add Location</Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="text-xs text-blue-700">Locations</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{Array.isArray(locations) ? (locations as any[]).length : 0}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4">
              <div className="text-xs text-slate-700">Rows</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{rowsDims.length}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700">Decks</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">{decksDims.length}</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="text-xs text-purple-700">Sections</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">{sectionsDims.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Manage Locations & Dimensions */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Manage Locations & Dimensions</h2>
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-5">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white/60 rounded-lg p-3 border">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-sm text-gray-700">Location:</span>
                  <Select
                    value={selectedLocationId ? String(selectedLocationId) : undefined}
                    onValueChange={(val) => setSelectedLocationId(parseInt(val))}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(locations) ? (locations as any[]) : []).map((l: any) => (
                        <SelectItem key={l.id} value={String(l.id)}>{(l as StorageLocation).name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    disabled={!selectedLocationId || deleteLocation.isPending}
                    onClick={() => {
                      if (!selectedLocationId) return;
                      if (confirm("Delete this location and all its rows/decks/sections?")) {
                        deleteLocation.mutate(selectedLocationId);
                      }
                    }}
                  >
                    Delete Location
                  </Button>
                </div>
              </div>

              {selectedLocationId ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rows */}
                    <Card className="border-slate-200 bg-white/70">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-slate-800">Rows</div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{rowsDims.length}</div>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <Input id="add-row-input" placeholder="e.g., Row 5" />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const el = document.getElementById("add-row-input") as HTMLInputElement | null;
                              const val = el?.value?.trim();
                              if (!val) return;
                              addDimension.mutate({ locationId: selectedLocationId, type: "row", name: val });
                              if (el) el.value = "";
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rowsDims.map((d: any) => (
                            <div key={d.id} className="flex items-center gap-1 rounded-full border bg-slate-50 text-slate-700 px-3 py-1">
                              <span className="text-sm">{d.name}</span>
                              <button
                                aria-label="Delete"
                                className="ml-1 text-slate-500 hover:text-slate-800"
                                onClick={() => deleteDimension.mutate(d.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {rowsDims.length === 0 && (
                            <div className="text-sm text-gray-500">No rows yet.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Decks */}
                    <Card className="border-emerald-200 bg-white/70">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-emerald-800">Decks</div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{decksDims.length}</div>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <Input id="add-deck-input" placeholder="e.g., Deck 5" />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const el = document.getElementById("add-deck-input") as HTMLInputElement | null;
                              const val = el?.value?.trim();
                              if (!val) return;
                              addDimension.mutate({ locationId: selectedLocationId, type: "deck", name: val });
                              if (el) el.value = "";
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {decksDims.map((d: any) => (
                            <div key={d.id} className="flex items-center gap-1 rounded-full border bg-emerald-50 text-emerald-800 px-3 py-1">
                              <span className="text-sm">{d.name}</span>
                              <button
                                aria-label="Delete"
                                className="ml-1 text-emerald-700 hover:text-emerald-900"
                                onClick={() => deleteDimension.mutate(d.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {decksDims.length === 0 && (
                            <div className="text-sm text-gray-500">No decks yet.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sections */}
                    <Card className="border-purple-200 bg-white/70">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-purple-800">Sections</div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{sectionsDims.length}</div>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <Input id="add-section-input" placeholder="e.g., B5" />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const el = document.getElementById("add-section-input") as HTMLInputElement | null;
                              const val = el?.value?.trim();
                              if (!val) return;
                              addDimension.mutate({ locationId: selectedLocationId, type: "section", name: val });
                              if (el) el.value = "";
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sectionsDims.map((d: any) => (
                            <div key={d.id} className="flex items-center gap-1 rounded-full border bg-purple-50 text-purple-800 px-3 py-1">
                              <span className="text-sm">{d.name}</span>
                              <button
                                aria-label="Delete"
                                className="ml-1 text-purple-700 hover:text-purple-900"
                                onClick={() => deleteDimension.mutate(d.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {sectionsDims.length === 0 && (
                            <div className="text-sm text-gray-500">No sections yet.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Tip: Any location that has at least one Section will be treated as a section-only location across the app (Row/Deck will be hidden, and we will display “Section” instead).
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Select a location to manage rows, decks, and sections.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit dialog removed – product editing is out of scope here */}

        {/* Add Location Dialog */}
        <Dialog open={addLocOpen} onOpenChange={setAddLocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Storage Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Location Name</label>
                <Input
                  placeholder="e.g., New Storage Area"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddLocOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const name = newLocName.trim();
                    if (!name) return;
                    addLocationMutation.mutate(name);
                  }}
                  disabled={addLocationMutation.isPending}
                >
                  {addLocationMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
