import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, Edit, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export interface ProductTransactionData {
  product: string;
  unit: string;
  currentStock: string;
  quantity: string;
  newStock: string;
  displayQuantity?: string;
  // optional expiry date only used for Stock In preview
  expiryDate?: string;
  // storage/location fields (optional)
  storageLocation?: string;
  storageRow?: string | number;
  storageDeck?: string | number;
}

export interface TransactionData {
  type: string;
  products: ProductTransactionData[];
  date: string;
  remarks?: string;
  soNumber?: string;
  poNumber?: string;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: (selectedProducts?: number[]) => void;
  title: string;
  transactionData: TransactionData;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  title,
  transactionData,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showEditOptions, setShowEditOptions] = useState(false);

  // Format number to maximum 3 decimal places, removing unnecessary zeros
  const formatDecimal = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    // Return whole number if no decimals, otherwise format with up to 3 decimals and remove trailing zeros
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };

  // Handle checkbox changes
  const handleProductSelect = (productIndex: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productIndex]);
    } else {
      setSelectedProducts(prev => prev.filter(index => index !== productIndex));
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    setSelectedProducts([]);
    setShowEditOptions(false);
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    setIsConfirmed(false);
  };

  const handleEdit = () => {
    if (showEditOptions) {
      // If we're showing edit options and user clicks edit, pass selected products
      onEdit(selectedProducts);
      setIsConfirmed(false);
    } else {
      // First click - show edit options
      setShowEditOptions(true);
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full" aria-describedby="transaction-details">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4" id="transaction-details">
          <div className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="font-medium text-gray-600">Transaction Type:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                {transactionData.type}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
              <span className="font-medium text-gray-600">Date:</span>
              <span className="text-gray-900">{transactionData.date}</span>
            </div>
            {transactionData.soNumber && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
                <span className="font-medium text-gray-600">SO Number:</span>
                <span className="text-gray-900 break-all">{transactionData.soNumber}</span>
              </div>
            )}
            {transactionData.poNumber && transactionData.type === 'Stock In' && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
                <span className="font-medium text-gray-600">PO Number:</span>
                <span className="text-gray-900 break-all">{transactionData.poNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              Products ({transactionData.products.length}):
              {showEditOptions && (
                <span className="text-sm text-blue-600 font-normal ml-2">
                  Select products to edit
                </span>
              )}
            </h4>
            {transactionData.products.map((product, index) => (
              <div key={index} className={`bg-gray-50 p-3 rounded-lg ${showEditOptions ? 'border-2 border-gray-200' : ''}`}>
                <div className="flex items-start gap-3">
                  {showEditOptions && (
                    <Checkbox
                      checked={selectedProducts.includes(index)}
                      onCheckedChange={(checked) => handleProductSelect(index, checked === true)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">{product.product}</div>
                    {(product.storageLocation || product.storageRow || product.storageDeck) && (
                      <div className="text-sm text-gray-600 mb-3">
                        {product.storageLocation || "-"}
                        {(product.storageRow || product.storageDeck) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {(() => {
                              const loc = product.storageLocation;
                              const isSectionMode = !!loc && sectionLocationNames.has(loc);
                              if (isSectionMode) {
                                return product.storageRow ? `Section: ${product.storageRow}` : "";
                              }
                              const row = product.storageRow ? `Row: ${product.storageRow}` : "";
                              const deck = product.storageDeck
                                ? (product.storageRow ? ` • Deck: ${product.storageDeck}` : `Deck: ${product.storageDeck}`)
                                : "";
                              return (
                                <>
                                  {row}
                                  {deck}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-600 text-xs block">Current:</span>
                        <div className="font-medium">{formatDecimal(product.currentStock)} {product.unit}</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-600 text-xs block">Quantity:</span>
                        <div className="font-medium text-blue-600">
                          {product.displayQuantity ? (
                            <div>
                              <div>{product.displayQuantity}</div>
                              <div className="text-xs text-gray-500">({formatDecimal(product.quantity)} {product.unit})</div>
                            </div>
                          ) : (
                            <div>{formatDecimal(product.quantity)} {product.unit}</div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-600 text-xs block">New Stock:</span>
                        <div className="font-bold text-green-600">{formatDecimal(product.newStock)} {product.unit}</div>
                      </div>
                    </div>
                    {transactionData.type === 'Stock In' && product.expiryDate && (
                      <div className="mt-2 text-xs text-gray-600">
                        Expiry Date: <span className="font-medium text-gray-900">{product.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start space-x-2 py-3 border-t">
          <Checkbox
            id="confirm-checkbox"
            checked={isConfirmed}
            onCheckedChange={(checked) => setIsConfirmed(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="confirm-checkbox"
            className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I confirm that the above details are correct
          </label>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            className="w-full sm:w-auto order-3 sm:order-1"
          >
            Cancel
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              disabled={isLoading}
              className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">
                {showEditOptions ? (
                  selectedProducts.length > 0 ? `Edit Selected (${selectedProducts.length})` : 'Select Products'
                ) : (
                  'Edit Transaction'
                )}
              </span>
              <span className="sm:hidden">
                {showEditOptions ? (
                  selectedProducts.length > 0 ? `Edit (${selectedProducts.length})` : 'Select'
                ) : (
                  'Edit'
                )}
              </span>
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmed || isLoading}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Wait...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Confirm Transaction</span>
                  <span className="sm:hidden">Confirm</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
