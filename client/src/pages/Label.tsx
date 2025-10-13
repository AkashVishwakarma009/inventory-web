import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

// The data structure for each item in the table
interface TableRow {
  id: number;
  itemName: string;
  price: string;
  quantity: string;
  uom: 'grams' | 'kg' | 'pieces' | 'liter';
  mfgDate: string;
  expDate: string;
  noOfPrints: number;
}

const LabelPrintingSystem: React.FC = () => {
  const [tableData, setTableData] = useState<TableRow[]>([
    { id: 1, itemName: '', price: '', quantity: '', uom: 'grams', mfgDate: '', expDate: '', noOfPrints: 1 }
  ]);
  const [labelsToPrint, setLabelsToPrint] = useState<TableRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);

  // Auto-fit product name font-size within available width
  const AutoFitText: React.FC<{ text: string; maxPt?: number; minPt?: number; className?: string }>
    = ({ text, maxPt = 18, minPt = 10, className }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [sizePt, setSizePt] = useState<number>(maxPt);

    useEffect(() => {
      const el = textRef.current;
      if (!el) return;

      // Reset to max before measuring
      let current = maxPt;
      el.style.fontSize = `${current}pt`;
      el.style.whiteSpace = 'nowrap';

      const containerWidth = (el.parentElement?.clientWidth || el.clientWidth) - 2; // small padding buffer
      // Shrink until it fits or reaches min
      while (el.scrollWidth > containerWidth && current > minPt) {
        current = Math.max(minPt, current - 0.5);
        el.style.fontSize = `${current}pt`;
      }
      setSizePt(current);
    }, [text, maxPt, minPt]);

    return (
      <div ref={textRef} className={className} style={{ fontSize: `${sizePt}pt` }}>
        {text}
      </div>
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
        
        const formattedData: TableRow[] = jsonData.map((row, index) => ({
          id: index + 1,
          itemName: String(row['Item Name'] || ''),
          price: String(row['Price'] || ''),
          quantity: String(row['Quantity'] || ''),
          uom: (row['UoM'] || 'grams').toLowerCase(),
          mfgDate: formatDateFromExcel(row['Mfg Date']),
          expDate: formatDateFromExcel(row['Exp Date']),
          noOfPrints: Number(row['No of Prints'] || 1)
        }));
        setTableData(formattedData);
      } catch (error) {
        alert('Error reading Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const formatDateFromExcel = (excelDate: any): string => {
    if (!excelDate) return '';
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(excelDate);
  };

  const handleTableChange = (id: number, field: keyof TableRow, value: string | number) => {
    setTableData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };
  
  const addTableRow = () => {
    const newId = tableData.length > 0 ? Math.max(...tableData.map(row => row.id)) + 1 : 1;
    setTableData(prev => [...prev, { id: newId, itemName: '', price: '', quantity: '', uom: 'grams', mfgDate: '', expDate: '', noOfPrints: 1 }]);
  };
  
  const removeTableRow = (id: number) => {
    if (tableData.length > 1) {
      setTableData(prev => prev.filter(row => row.id !== id));
    }
  };

  const generateLabels = () => {
    const generated: TableRow[] = [];
    tableData.forEach(row => {
      if (row.itemName.trim() !== '') {
        for (let i = 0; i < row.noOfPrints; i++) {
          generated.push(row);
        }
      }
    });
    setLabelsToPrint(generated);
    if (generated.length > 0) {
       alert(`Generated ${generated.length} total labels! You can now print.`);
    } else {
       alert("Please enter an Item Name before generating labels.");
    }
  };

  const handlePrint = () => {
    if (!labelContainerRef.current) { return; }
    const labelsHtml = labelContainerRef.current.innerHTML;
    const printStyles = `
        <style>
            @page { size: 85mm 55mm; margin: 0; }
            body { margin: 0; }
            .label {
                width: 85mm; height: 55mm; padding: 3mm; box-sizing: border-box;
                overflow: hidden; font-family: Arial, sans-serif; color: black;
                display: flex; flex-direction: column; border-radius: 2mm; border: 1px solid #222;
                page-break-after: always; page-break-inside: avoid !important;
                background: white;
            }
            .label-header {
                display: flex; justify-content: space-between; align-items: center;
                padding-bottom: 1.5mm; border-bottom: 1px solid #222;
                background: linear-gradient(90deg, #111 0%, #333 100%);
                color: #fff; padding-left: 2mm; padding-right: 2mm; border-top-left-radius: 2mm; border-top-right-radius: 2mm;
            }
            .brand-info { display: flex; align-items: center; gap: 2mm; }
            .brand-mark { width: 8mm; height: 8mm; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #ffd166, #f77f00);
                display: inline-flex; align-items: center; justify-content: center; color: #111; font-weight: 900; font-size: 8pt; letter-spacing: 0.5px; }
            .brand-name { font-size: 12pt; font-weight: 800; letter-spacing: 0.8px; }
            .brand-division { font-size: 6pt; opacity: 0.9; }
            .reg-info { font-size: 6pt; text-align: right; line-height: 1.2; }
            .label-body { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; padding: 1mm 2mm; gap: 1.5mm; }
            .product-name { font-size: 18pt; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
            .price-pill { margin: 0 auto; font-size: 12pt; font-weight: 800; color: #111; background: #ffd166; padding: 1mm 3mm; border-radius: 6mm; border: 1px solid #222; }
            .accent-divider { height: 1mm; background: linear-gradient(90deg, transparent, #f77f00 25%, #ffd166 50%, #f77f00 75%, transparent); border-radius: 2mm; }
            .details-grid { font-size: 9pt; }
            .detail-row { display: flex; justify-content: space-between; padding: 0.5mm 0; align-items: center; }
            .detail-label { font-weight: 800; letter-spacing: 0.5px; }
            .detail-value { text-align: right; font-weight: 600; }
        </style>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`<html><head><title>Print Labels</title>${printStyles}</head><body>${labelsHtml}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { 
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const totalLabels = tableData.reduce((sum, item) => sum + (item.noOfPrints || 0), 0);
  
  return (
    <div className="container">
      <div className="top-actions">
        <a href="/" className="btn-back" aria-label="Back to Dashboard">← Back to Dashboard</a>
      </div>
      <h1>Label Printing System</h1>
      <div className="controls">
        <h3>Upload Excel or Enter Manually</h3>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
        <button className="btn-upload" onClick={() => fileInputRef.current?.click()}>📤 Upload Excel File</button>
        <p className="file-info">Expected columns: Item Name, Price, Quantity, UoM, Mfg Date, Exp Date, No of Prints</p>
      </div>
      
      <div className="table-section">
        <table className="data-table">
            <thead>
                <tr>
                    <th>Item Name *</th>
                    <th>Price (₹)</th>
                    <th>Quantity / UoM</th>
                    <th>Mfg Date</th>
                    <th>Exp Date</th>
                    <th>Prints</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            {tableData.map((row) => (
                <tr key={row.id}>
                    <td><input type="text" value={row.itemName} onChange={e => handleTableChange(row.id, 'itemName', e.target.value)} /></td>
                    <td><input type="text" value={row.price} onChange={e => handleTableChange(row.id, 'price', e.target.value)} /></td>
                    <td>
                        <div className="quantity-uom-cell">
                            <input type="text" value={row.quantity} onChange={e => handleTableChange(row.id, 'quantity', e.target.value)} className="quantity-input"/>
                            <select value={row.uom} onChange={e => handleTableChange(row.id, 'uom', e.target.value as TableRow['uom'])} className="uom-select">
                                <option value="grams">grams</option>
                                <option value="kg">kg</option>
                                <option value="pieces">pieces</option>
                                <option value="liter">liter</option>
                            </select>
                        </div>
                    </td>
                    <td><input type="date" value={row.mfgDate} onChange={e => handleTableChange(row.id, 'mfgDate', e.target.value)} /></td>
                    <td><input type="date" value={row.expDate} onChange={e => handleTableChange(row.id, 'expDate', e.target.value)} /></td>
                    <td><input type="number" min="1" value={row.noOfPrints} onChange={e => handleTableChange(row.id, 'noOfPrints', parseInt(e.target.value) || 1)} style={{width: '70px'}}/></td>
                    <td><button className="btn-remove" onClick={() => removeTableRow(row.id)} disabled={tableData.length === 1}>Remove</button></td>
                </tr>
            ))}
            </tbody>
        </table>
        <div className="table-actions">
            <button className="btn-add" onClick={addTableRow}>+ Add Row</button>
            <div className="total-info">Total Labels to Generate: <strong>{totalLabels}</strong></div>
        </div>
      </div>

      <div className="main-actions">
        <button className="btn-generate" onClick={generateLabels}>🔄 Generate Labels</button>
        <button className="btn-print" onClick={handlePrint}>🖨️ Print Labels</button>
      </div>
      
      {labelsToPrint.length > 0 && (
        <div className="preview-section">
          <h3>Label Preview</h3>
          <div className="label-container" ref={labelContainerRef}>
            {labelsToPrint.map((label, index) => {
              let priceDisplay = '';
              if (label.price || label.quantity) {
                  const pricePart = label.price ? `₹${label.price}` : '';
                  const quantityPart = label.quantity ? `${label.quantity} ${label.uom}` : '';
                  priceDisplay = [pricePart, quantityPart].filter(Boolean).join(' / ');
              }
              
              return (
                <div className="label" key={index}>
                  <div className="label-header">
                    <div className="brand-info"><div className="brand-mark">S</div><div><div className="brand-name">SUDHAMRIT</div><div className="brand-division">(A DIVISION OF SUDHASTAR)</div></div></div>
                    <div className="reg-info"><div>FSSAI: 21523014001786</div><div>GST: 27AAAAS0976Q1ZU</div></div>
                  </div>
                  {/* UPDATED: This is the new layout */}
                  <div className="label-body">
                    <AutoFitText className="product-name" text={label.itemName} maxPt={18} minPt={10} />
                    {priceDisplay && <div className="price-pill">{priceDisplay}</div>}
                    <div className="accent-divider"></div>
                    <div className="details-grid">
                      <div className="detail-row"><span className="detail-label">MFG DATE:</span><span className="detail-value">{formatDateForDisplay(label.mfgDate)}</span></div>
                      <div className="detail-row"><span className="detail-label">BEST BEFORE:</span><span className="detail-value">{formatDateForDisplay(label.expDate)}</span></div>
                      {/* The old price row is now removed from here */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; }
        .container { max-width: 1200px; margin: 20px auto; padding: 25px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .top-actions { display: flex; justify-content: flex-start; margin-bottom: 10px; }
        .btn-back { display: inline-flex; align-items: center; gap: 8px; background-color: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .btn-back:hover { background-color: #e2e8f0; }
        h1 { text-align: center; color: #333; }
        .controls, .table-section, .main-actions { margin-bottom: 25px; padding: 20px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; }
        h3 { margin-top: 0; margin-bottom: 15px; color: #343a40; border-bottom: 1px solid #e9ecef; padding-bottom: 10px; }
        button { border: none; border-radius: 5px; padding: 10px 15px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s ease-in-out; }
        .btn-upload { background-color: #28a745; color: white; }
        .btn-add { background-color: #007bff; color: white; }
        .btn-remove { background-color: #dc3545; color: white; }
        .btn-generate { background-color: #17a2b8; color: white; padding: 12px 25px; }
        .btn-print { background-color: #6c757d; color: white; padding: 12px 25px; }
        .file-info { font-size: 13px; color: #6c757d; margin-top: 10px; }
        .table-section { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { border: 1px solid #dee2e6; padding: 12px; text-align: left; vertical-align: middle; }
        .data-table th { background-color: #f8f9fa; color: #495057; font-weight: 600; }
        .data-table input, .data-table select { width: 100%; border: 1px solid #ced4da; padding: 8px; border-radius: 4px; box-sizing: border-box; }
        .data-table input:focus, .data-table select:focus { outline: none; border-color: #80bdff; box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }
        .quantity-uom-cell { display: flex; gap: 5px; }
        .quantity-input { flex-grow: 1; }
        .uom-select { flex-basis: 90px; flex-shrink: 0; }
        .table-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
        .total-info { font-weight: bold; color: #343a40; }
        .preview-section { margin-top: 30px; border-top: 2px solid #f0f0f0; padding-top: 20px; }
        .label-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; padding: 10px; }
        .label {
            width: 85mm; height: 55mm; border: 1px solid #222; padding: 3mm; box-sizing: border-box;
            overflow: hidden; background: white; display: flex; flex-direction: column; border-radius: 8px;
            font-family: Arial, Helvetica, sans-serif; color: black; position: relative;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .label:before { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 8px; background: linear-gradient(135deg, rgba(247,127,0,0.08), rgba(255,209,102,0.08)); }
        .label-header { display: flex; justify-content: space-between; align-items: center; padding: 2mm; margin: -3mm -3mm 2mm; border-bottom: 1px solid #222; background: linear-gradient(90deg, #111, #333); color: #fff; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .brand-info { display: flex; align-items: center; gap: 2mm; }
        .brand-mark { width: 8mm; height: 8mm; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #ffd166, #f77f00); display: inline-flex; align-items: center; justify-content: center; color: #111; font-weight: 900; font-size: 8pt; letter-spacing: 0.5px; }
        .brand-name { font-size: 12pt; font-weight: 800; letter-spacing: 0.8px; }
        .brand-division { font-size: 6pt; opacity: 0.9; color: #e2e8f0; }
        .reg-info { font-size: 6pt; text-align: right; line-height: 1.2; }
        .label-body { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 2mm; gap: 2mm; }
        .product-name { font-size: 18pt; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
        .price-pill { display: inline-block; align-self: center; font-size: 12pt; font-weight: 800; color: #111; background: #ffd166; padding: 1mm 3mm; border-radius: 12mm; border: 1px solid #222; }
        .accent-divider { height: 1mm; background: linear-gradient(90deg, transparent, #f77f00 20%, #ffd166 50%, #f77f00 80%, transparent); border-radius: 2mm; }
        .details-grid { font-size: 9pt; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.5mm 0; align-items: center; }
        .detail-label { font-weight: 800; letter-spacing: 0.5px; }
        .detail-value { text-align: right; font-weight: 600; }
        @media print { body > .container { display: none; } }
      `}</style>
    </div>
  );
};

export default LabelPrintingSystem;