import { useEffect, useRef } from 'react';

interface ItemRow {
  itemNameSnapshot: string;
  hsnCodeSnapshot: string;
  rate: number;
  qty: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

interface SalesBillData {
  billNo: string;
  billDateTime: string;
  crRefNo: string;
  preparedBy: string;
  customerName: string;
  customerAddress: string;
  customerGstNo: string;
  placeOfSupply: string;
  vehicleNo: string;
  itemRows: ItemRow[];
  amountBeforeTax: number;
  gstTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  netAmount: number;
  amountInWords: string;
  billType?: string;
}

interface PrintableSalesBillProps {
  billData: SalesBillData;
  onPrintComplete?: () => void;
  showPrintDialog?: boolean;
  previewMode?: boolean;
  onClose?: () => void;
}

export const PrintableSalesBill = ({ billData, onPrintComplete, showPrintDialog = true, previewMode = false, onClose }: PrintableSalesBillProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPrintDialog && !previewMode) {
      // Small delay to ensure render is complete before printing
      const timer = setTimeout(() => {
        window.print();
        if (onPrintComplete) {
          onPrintComplete();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showPrintDialog, onPrintComplete, previewMode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (previewMode) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
        } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          window.print();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [previewMode, onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const isInvoiceCustomer = billData.billType === 'Invoice Customer';

  const containerClass = previewMode 
    ? "fixed inset-0 z-50 overflow-auto bg-gray-900 bg-opacity-90 flex items-start justify-center p-4" 
    : "";

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-bill,
          #printable-bill * {
            visibility: visible;
          }
          #printable-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }

        .print-container {
          background: white;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          font-family: 'Courier New', monospace;
          color: #000;
          line-height: 1.4;
          ${previewMode ? 'margin-top: 60px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);' : ''}
        }

        .print-header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }

        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .company-details {
          font-size: 11px;
          margin: 2px 0;
        }

        .invoice-title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }

        .bill-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin-bottom: 10px;
          font-size: 11px;
          border: 1px solid #000;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 150px 10px 1fr;
          padding: 4px 8px;
          border-bottom: 1px solid #000;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: bold;
        }

        .detail-colon {
          font-weight: bold;
        }

        .detail-value {
          word-break: break-word;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 11px;
        }

        .items-table th,
        .items-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
        }

        .items-table th {
          background: #f5f5f5;
          font-weight: bold;
          text-align: center;
        }

        .items-table td.number {
          text-align: right;
        }

        .items-table td.center {
          text-align: center;
        }

        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin: 10px 0;
        }

        .summary-table {
          width: 300px;
          font-size: 11px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 8px;
          border-bottom: 1px solid #000;
        }

        .summary-row.total {
          font-weight: bold;
          background: #f5f5f5;
        }

        .amount-in-words {
          margin: 10px 0;
          padding: 8px;
          border: 1px solid #000;
          font-size: 11px;
          font-weight: bold;
        }

        .terms-section {
          margin-top: 10px;
          font-size: 10px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }

        .terms-title {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .terms-list {
          margin: 0;
          padding-left: 15px;
        }

        .terms-list li {
          margin: 3px 0;
        }
      `}</style>

      <div className={containerClass}>
        {previewMode && (
          <div className="no-print fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Bill Preview</h3>
              <span className="text-sm text-gray-300">Bill No: {billData.billNo}</span>
              <span className="text-xs text-gray-400 ml-2">Press Ctrl+P to print, Esc to close</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                title="Print bill (Ctrl+P)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Bill
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                title="Close preview (Esc)"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div id="printable-bill" className="print-container" ref={printRef}>
        {/* Company Header */}
        <div className="print-header">
          <div className="company-name">Ask M Sand</div>
          <div className="company-details">No:48, Thollamur Village & Post, Villupuram District,</div>
          <div className="company-details">Ph: 9952277580 , GST No : 33AAKPK1163A2ZB</div>
          <div className="company-details">Udayam Certificate No : PY03B0006694</div>
        </div>

        {/* Invoice Title */}
        <div className="invoice-title">INVOICE</div>

        {/* Bill Details Grid */}
        {isInvoiceCustomer ? (
          // Invoice Customer Format - Simpler Layout
          <div style={{ marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '20%', padding: '4px 0', fontWeight: 'bold' }}>Invoice No</td>
                  <td style={{ width: '5%', padding: '4px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ width: '25%', padding: '4px 0' }}>{billData.billNo}</td>
                  <td style={{ width: '20%', padding: '4px 0', fontWeight: 'bold' }}>Date</td>
                  <td style={{ width: '5%', padding: '4px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ width: '25%', padding: '4px 0' }}>{formatDate(billData.billDateTime)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Customer Name</td>
                  <td style={{ padding: '4px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ padding: '4px 0' }}>{billData.customerName}</td>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Time</td>
                  <td style={{ padding: '4px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ padding: '4px 0' }}>{formatTime(billData.billDateTime)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0' }}></td>
                  <td style={{ padding: '4px 4px' }}></td>
                  <td style={{ padding: '4px 0' }}></td>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Prepared By</td>
                  <td style={{ padding: '4px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ padding: '4px 0' }}>{billData.preparedBy}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Place Of Supply</td>
                  <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>:</td>
                  <td style={{ padding: '6px 0' }}>{billData.placeOfSupply}</td>
                  <td style={{ padding: '6px 0' }}></td>
                  <td style={{ padding: '6px 4px' }}></td>
                  <td style={{ padding: '6px 0' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Vehicle No</td>
                  <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>:</td>
                  <td colSpan={4} style={{ padding: '6px 0' }}>{billData.vehicleNo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          // Tax Invoice Format - Full Layout with borders
          <div style={{ marginBottom: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #000' }}>
              <tbody>
                <tr>
                  <td style={{ width: '15%', padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Invoice No</td>
                  <td style={{ width: '5%', padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ width: '30%', padding: '4px 8px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>{billData.billNo}</td>
                  <td style={{ width: '15%', padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Cr.Ref No</td>
                  <td style={{ width: '5%', padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ width: '30%', padding: '4px 8px', borderBottom: '1px solid #000' }}>{billData.crRefNo || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000', verticalAlign: 'top' }} rowSpan={3}>Customer Name</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', verticalAlign: 'top' }} rowSpan={3}>:</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', borderBottom: '1px solid #000', verticalAlign: 'top' }} rowSpan={3}>
                    {billData.customerName}<br/>
                    {billData.customerAddress}
                  </td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Date</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #000' }}>{formatDate(billData.billDateTime)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Time</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #000' }}>{formatTime(billData.billDateTime)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Prepared By</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #000' }}>{billData.preparedBy}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>GST No</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>{billData.customerGstNo || '-'}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', borderBottom: '1px solid #000' }}>Place Of Supply</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000' }}>:</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #000' }}>{billData.placeOfSupply}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>Vehicle No</td>
                  <td style={{ padding: '4px 4px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center' }}>:</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000' }} colSpan={4}>{billData.vehicleNo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>DESCRIPTION OF ITEM</th>
              <th style={{ width: '12%' }}>HSN CODE</th>
              <th style={{ width: '10%' }}>RATE</th>
              <th style={{ width: '10%' }}>QTY</th>
              <th style={{ width: '12%' }}>AMOUNT</th>
              <th style={{ width: '8%' }}>GST%</th>
              <th style={{ width: '10%' }}>GST</th>
              <th style={{ width: '13%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {billData.itemRows.map((item, index) => (
              <tr key={index}>
                <td>{item.itemNameSnapshot}</td>
                <td className="center">{item.hsnCodeSnapshot}</td>
                <td className="number">{item.rate.toFixed(2)}</td>
                <td className="number">{item.qty.toFixed(5)}</td>
                <td className="number">{item.amount.toFixed(2)}</td>
                <td className="center">{item.gstPercent.toFixed(2)}</td>
                <td className="number">{item.gstAmount.toFixed(2)}</td>
                <td className="number">{item.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="summary-section">
          <div className="summary-table">
            <div className="summary-row">
              <span>Amount :</span>
              <span>{billData.amountBeforeTax.toFixed(2)}</span>
            </div>
            {billData.cgstTotal > 0 && (
              <>
                <div className="summary-row">
                  <span>CGST :</span>
                  <span>{billData.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>SGST :</span>
                  <span>{billData.sgstTotal.toFixed(2)}</span>
                </div>
              </>
            )}
            {billData.igstTotal > 0 && (
              <div className="summary-row">
                <span>IGST :</span>
                <span>{billData.igstTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>NET AMOUNT :</span>
              <span>{billData.netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-in-words">
          In words: {billData.amountInWords}
        </div>

        {/* Terms & Conditions */}
        <div className="terms-section">
          <div className="terms-title">TERMS & CONDITIONS :</div>
          <ol className="terms-list">
            <li>Unless otherwise stated all prices are strictly nett.</li>
            <li>Our responsibility ceases on delivery of the goods on Road transpor</li>
            <li>Goods supplied to order will not be accepted back.</li>
          </ol>
        </div>
        </div>
      </div>
    </>
  );
};
