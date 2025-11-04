import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

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

  const isExpiryBeforeMfg = (mfg: string, exp: string): boolean => {
    if (!mfg || !exp) return false;
    const m = new Date(mfg);
    const e = new Date(exp);
    if (isNaN(m.getTime()) || isNaN(e.getTime())) return false;
    return e.getTime() < m.getTime();
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
    const invalidRows = tableData.filter((row) => isExpiryBeforeMfg(row.mfgDate, row.expDate));
    if (invalidRows.length > 0) {
      alert(`Error: Expiry date cannot be earlier than MFG date in ${invalidRows.length} row(s). Please fix before continuing.`);
      return;
    }
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

  const getFontSize = (text: string, baseSize: number = 22) => {
    const length = text.length;
    if (length <= 15) return baseSize;
    if (length <= 25) return baseSize - 4;
    if (length <= 35) return baseSize - 6;
    if (length <= 45) return baseSize - 8;
    if (length <= 60) return baseSize - 10;
    return baseSize - 12;
  };

  const handlePrint = () => {
    const invalidRows = tableData.filter((row) => isExpiryBeforeMfg(row.mfgDate, row.expDate));
    if (invalidRows.length > 0) {
      alert('Error: Expiry date cannot be earlier than MFG date. Please correct the dates before printing.');
      return;
    }
    if (!labelContainerRef.current) { return; }
    const labelsHtml = labelContainerRef.current.innerHTML;
    const printStyles = `
        <style>
            @page { size: 85mm 55mm; margin: 0; }
            body { margin: 0; }
            .label {
                width: 85mm; height: 55mm; padding: 3mm; box-sizing: border-box;
                overflow: hidden; font-family: Arial, sans-serif; color: black;
                display: flex; flex-direction: column;
                page-break-after: always; page-break-inside: avoid !important;
            }
            .label-header { 
                display: flex; 
                justify-content: space-between; 
                border-bottom: 1px solid #333; 
                padding-bottom: 1.5mm;
                flex-shrink: 0;
            }
            .brand-name { font-size: 14pt; font-weight: bold; }
            .brand-division { font-size: 7pt; }
            .reg-info { font-size: 7pt; text-align: right; }
            .label-body { 
                flex-grow: 1; 
                display: flex; 
                flex-direction: column; 
                justify-content: space-between;
                overflow: hidden;
            }
            .product-section {
                flex-shrink: 1;
                min-height: 0;
                overflow: hidden;
            }
            .product-name { 
                font-weight: bold; 
                text-align: center; 
                margin: 1mm 0; 
                text-transform: uppercase; 
                word-wrap: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
                line-height: 1;
                max-height: 20mm;
                overflow: hidden;
            }
            .product-price-uom {
                text-align: center;
                font-weight: bold;
                margin: 1mm 0 2mm 0;
                color: #333;
                word-wrap: break-word;
                overflow-wrap: break-word;
                line-height: 1;
                max-height: 12mm;
                overflow: hidden;
            }
            .details-grid { 
                font-size: 10pt; 
                flex-shrink: 0;
                margin-top: auto;
            }
            .detail-row { display: flex; justify-content: space-between; padding: 0.5mm 0; align-items: center; }
            .detail-label { font-weight: bold; }
            .detail-value { text-align: right; }
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
  
  const handleReset = () => {
    const confirmReset = window.confirm('This will clear all rows and previews. Continue?');
    if (!confirmReset) return;
    setTableData([{ id: 1, itemName: '', price: '', quantity: '', uom: 'grams', mfgDate: '', expDate: '', noOfPrints: 1 }]);
    setLabelsToPrint([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
  const hasInvalidDates = tableData.some((row) => isExpiryBeforeMfg(row.mfgDate, row.expDate));
  
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
        {hasInvalidDates && (
          <div className="warning-banner" role="alert">
            One or more rows have invalid dates: Expiry date is earlier than MFG date. Please correct them to proceed.
          </div>
        )}
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
                    {(() => {
                      const invalid = isExpiryBeforeMfg(row.mfgDate, row.expDate);
                      return (
                        <>
                          <td>
                            <input
                              type="date"
                              value={row.mfgDate}
                              onChange={e => handleTableChange(row.id, 'mfgDate', e.target.value)}
                              style={invalid ? { borderColor: '#dc3545' } : undefined}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={row.expDate}
                              onChange={e => handleTableChange(row.id, 'expDate', e.target.value)}
                              style={invalid ? { borderColor: '#dc3545' } : undefined}
                            />
                            {invalid && (
                              <div className="error-text">Expiry date must be after MFG date.</div>
                            )}
                          </td>
                        </>
                      );
                    })()}
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
        <button className="btn-generate" onClick={generateLabels} disabled={hasInvalidDates} title={hasInvalidDates ? 'Fix invalid dates to continue' : undefined}>🔄 Generate Labels</button>
        <button className="btn-print" onClick={handlePrint} disabled={hasInvalidDates} title={hasInvalidDates ? 'Fix invalid dates to continue' : undefined}>🖨️ Print Labels</button>
        <button className="btn-reset" onClick={handleReset}>↩️ Reset</button>
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
              
              const productNameSize = getFontSize(label.itemName, 22);
              const priceUomSize = getFontSize(priceDisplay, 22);
              
              return (
                <div className="label" key={index}>
                  <div className="label-header">
                    <div className="brand-info"><div className="brand-name">SUDHAMRIT</div><div className="brand-division">(A DIVISION OF SUDHASTAR)</div></div>
                    <div className="reg-info"><div>FSSAI: 21523014001786</div><div>GST: 27AAAAS0976Q1ZU</div></div>
                  </div>
                  <div className="label-body">
                    <div className="product-name" style={{ fontSize: `${productNameSize}pt` }}>{label.itemName}</div>
                    {priceDisplay && <div className="product-price-uom" style={{ fontSize: `${priceUomSize}pt` }}>{priceDisplay}</div>}
                    <div className="details-grid">
                      <div className="detail-row"><span className="detail-label">MFG DATE:</span><span className="detail-value">{formatDateForDisplay(label.mfgDate)}</span></div>
                      <div className="detail-row"><span className="detail-label">BEST BEFORE:</span><span className="detail-value">{formatDateForDisplay(label.expDate)}</span></div>
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
        button {
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease, transform .05s ease, color .15s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(16,24,40,.08), 0 1px 1px rgba(16,24,40,.08);
        }
        button:hover:not(:disabled) { filter: brightness(1.02); }
        button:active:not(:disabled) { transform: translateY(1px); }
        button:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,.35); }
        button:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }

        .main-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .main-actions button { min-width: 160px; justify-content: center; }

        .btn-upload { background-color: #22c55e; color: #ffffff; border-color: #16a34a; }
        .btn-upload:hover:not(:disabled) { background-color: #16a34a; }

        .btn-add { background-color: #3b82f6; color: #ffffff; border-color: #2563eb; }
        .btn-add:hover:not(:disabled) { background-color: #2563eb; }

        .btn-remove { background-color: #ef4444; color: #ffffff; border-color: #dc2626; }
        .btn-remove:hover:not(:disabled) { background-color: #dc2626; }

        .btn-generate { background-color: #06b6d4; color: #ffffff; border-color: #0891b2; }
        .btn-generate:hover:not(:disabled) { background-color: #0891b2; }

        .btn-print { background-color: #64748b; color: #ffffff; border-color: #475569; }
        .btn-print:hover:not(:disabled) { background-color: #475569; }

        .btn-reset { background-color: #f59e0b; color: #111827; border-color: #d97706; }
        .btn-reset:hover:not(:disabled) { background-color: #d97706; color: #0f172a; }
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
            width: 85mm; height: 55mm; border: 1px dashed #ccc; padding: 3mm; box-sizing: border-box;
            overflow: hidden; background: white; display: flex; flex-direction: column;
            font-family: Arial, Helvetica, sans-serif; color: black;
        }
        .label-header { 
            display: flex; 
            justify-content: space-between; 
            border-bottom: 1px solid #333; 
            padding-bottom: 1.5mm;
            flex-shrink: 0;
        }
        .brand-name { font-size: 14pt; font-weight: bold; }
        .brand-division { font-size: 7pt; }
        .reg-info { font-size: 7pt; text-align: right; }
        .label-body { 
            flex-grow: 1; 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between;
            overflow: hidden;
        }
        .product-section {
            flex-shrink: 1;
            min-height: 0;
            overflow: hidden;
        }
        .product-name { 
            font-weight: bold; 
            text-align: center; 
            margin: 1mm 0; 
            text-transform: uppercase; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            line-height: 1;
            max-height: 20mm;
            overflow: hidden;
        }
        .product-price-uom {
            text-align: center;
            font-weight: bold;
            margin: 1mm 0 2mm 0;
            color: #333;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1;
            max-height: 12mm;
            overflow: hidden;
        }
        .details-grid { 
            font-size: 10pt;
            flex-shrink: 0;
            margin-top: auto;
        }
        .detail-row { display: flex; justify-content: space-between; padding: 0.5mm 0; align-items: center; }
        .detail-label { font-weight: bold; }
        .detail-value { text-align: right; }
        .error-text { color: #dc3545; font-size: 12px; margin-top: 4px; }
        .warning-banner { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        @media print { body > .container { display: none; } }
      `}</style>
    </div>
  );
};

export default LabelPrintingSystem;
