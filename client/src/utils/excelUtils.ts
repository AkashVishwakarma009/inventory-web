import * as XLSX from "xlsx";
import { Customer, SalesOrder } from "@/types";

export async function parseExcelFile(file: File): Promise<Customer[] | SalesOrder[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let workbook;
        if (file.name.endsWith(".xls")) {
          workbook = XLSX.read(e.target?.result, { type: "binary" });
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: "array" });
        }
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (!json.length) {
          reject("No data found in file");
          return;
        }

        // Log actual columns for debugging
        console.log("Columns in file:", Object.keys(json[0]));

        // Customer file detection (exact column names)
        if (
          "Customer Code" in json[0] &&
          "Customer Name" in json[0] &&
          "Address 1" in json[0] && // or "Address1" if that's what your file has
          "Address 2" in json[0] && // or "Address2"
          "Phone" in json[0]
        ) {
          const customers: Customer[] = (json as any[]).map(row => ({
            id: row["Customer Code"],
            name: row["Customer Name"],
            address1: row["Address 1"], // or "Address1"
            address2: row["Address 2"], // or "Address2"
            phone: row["Phone"],
          }));
          resolve(customers);
          return;
        }

        // Sales order file detection (exact column names)
        if (
          "SO Date" in json[0] &&
          "Customer Code" in json[0] &&
          "Customer Name" in json[0] &&
          "Item Name" in json[0] &&
          "SO NO" in json[0] &&
          "SO Quantity" in json[0]
        ) {
          const orders: SalesOrder[] = (json as any[]).map((row, idx) => ({
            id: String(idx),
            customerId: row["Customer Code"],
            deliveryDate: row["SO Date"],
            deliveryTime: "",
            orderNumber: row["SO NO"],
            items: [row["Item Name"]],
            quantity: row["SO Quantity"],
          }));
          resolve(orders);
          return;
        }

        reject("Unknown file format or missing columns");
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    if (file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}