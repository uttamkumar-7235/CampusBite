import React, { useState } from 'react';
import { Order } from '../types';
import { Printer, Copy, Check, X, QrCode, Download, UtensilsCrossed } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface OrderSlipModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSlipModal: React.FC<OrderSlipModalProps> = ({ order, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySlip = () => {
    const textSlip = `
========================================
    PRASAD INSTITUTE OF TECHNOLOGY
         CAMPUS CENTRAL CANTEEN
      Jaunpur, Uttar Pradesh - 222001
========================================
TOKEN NUMBER: #${order.order_number}
PICKUP COUNTER: Counter #2 (Hot Food)
----------------------------------------
Order ID: ${order.id.slice(0, 8).toUpperCase()}
Date & Time: ${formattedDate} ${formattedTime}
Customer: ${order.profile?.full_name || 'Student'}
${order.student_roll ? `Roll No: ${order.student_roll}\n` : ''}${order.profile?.phone ? `Phone: ${order.profile.phone}\n` : ''}Type: ${order.pickup_type === 'takeaway' ? 'Parcel / Takeaway' : 'Dine-In'}
Payment: ${order.payment_method === 'upi_counter' ? 'UPI Counter (pitcanteen@upi)' : 'Cash at Counter #1'}
Payment Status: ${order.payment_status.toUpperCase()}
----------------------------------------
ITEMS ORDERED:
${order.order_items.map((it, i) => `${i + 1}. ${it.quantity}x ${it.item_name} @ ₹${it.unit_price} = ₹${it.subtotal}`).join('\n')}
----------------------------------------
Subtotal:              ₹${order.total.toFixed(2)}
Student Subsidy (GST): ₹0.00 (Waived)
TOTAL PAYABLE:         ₹${order.total.toFixed(2)}
========================================
Please show Token #${order.order_number} at Counter #2
Keep this receipt until food handover.
Thank you for dining with PIT Canteen!
========================================
    `.trim();

    navigator.clipboard?.writeText(textSlip);
    setCopied(true);
    showToast({
      type: 'info',
      title: 'Slip Copied to Clipboard',
      message: 'Full token receipt text copied. You can paste it into WhatsApp or save it.',
    });
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-6 z-10 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="no-print bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs">
              PIT
            </div>
            <div>
              <h3 className="text-xs font-bold leading-tight">Canteen Order Slip</h3>
              <p className="text-[10px] text-stone-400">Token #{order.order_number} · Customer Copy</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Print thermal receipt or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleCopySlip}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors cursor-pointer"
              title="Copy receipt text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close slip"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 bg-stone-50 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:bg-white">
          <div
            id="printable-canteen-slip"
            className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-stone-200/80 font-mono text-stone-900 print:border-none print:shadow-none print:p-4 print:w-full print:max-w-[80mm] print:mx-auto"
          >
            {/* Canteen College Header */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300 space-y-1">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-xs font-black mb-1">
                PIT
              </div>
              <h2 className="text-sm font-black tracking-wider uppercase text-stone-900">
                Prasad Institute of Technology
              </h2>
              <p className="text-[11px] text-stone-600 tracking-tight">
                Campus Central Canteen & Cafeteria
              </p>
              <p className="text-[10px] text-stone-500">
                Panch-Hatiya, Jaunpur, UP · Ph: +91 5452 266900
              </p>
              <p className="text-[9px] text-stone-400">
                GSTIN: 09AAACP1234F1Z5 · FSSAI: 12722055000192
              </p>
            </div>

            {/* Huge Token Highlight Box */}
            <div className="my-4 py-3 px-4 bg-stone-100 rounded-xl text-center border border-stone-300/80">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                KITCHEN ORDER TICKET (KOT)
              </div>
              <div className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight my-1">
                #{order.order_number}
              </div>
              <div className="inline-block bg-stone-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Pickup: Counter #2
              </div>
            </div>

            {/* Metadata Rows */}
            <div className="text-xs space-y-1 py-2 border-b border-dashed border-stone-300 text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">Receipt Ref:</span>
                <span className="font-bold font-mono">PIT-{order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date / Time:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Student:</span>
                <span className="font-bold text-stone-900 truncate max-w-[170px]">
                  {order.profile?.full_name || 'Campus Student'}
                </span>
              </div>
              {order.student_roll && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Roll No:</span>
                  <span className="font-bold">{order.student_roll}</span>
                </div>
              )}
              {order.profile?.phone && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Contact:</span>
                  <span>{order.profile.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Order Serving:</span>
                <span className="font-bold text-stone-900 uppercase">
                  {order.pickup_type === 'takeaway' ? '🥡 Takeaway / Parcel' : '🍽️ Dine-In'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Current Status:</span>
                <span className="font-bold uppercase tracking-wider text-orange-700">
                  {order.status}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-stone-300 text-xs">
              <div className="flex justify-between font-bold text-stone-900 border-b border-stone-200 pb-1 mb-2 text-[11px] uppercase tracking-wider">
                <span className="w-6">Qty</span>
                <span className="flex-1 px-2">Item</span>
                <span className="w-14 text-right">Price</span>
                <span className="w-14 text-right">Amount</span>
              </div>

              <div className="space-y-1.5">
                {order.order_items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-stone-800 text-xs">
                    <span className="w-6 font-bold text-stone-900">{it.quantity}x</span>
                    <span className="flex-1 px-2 truncate">{it.item_name}</span>
                    <span className="w-14 text-right tabular-nums text-stone-500">₹{it.unit_price}</span>
                    <span className="w-14 text-right font-bold tabular-nums">₹{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-2.5 p-2 bg-stone-100 rounded text-[11px] text-stone-700 border border-stone-200 italic">
                  <strong>Kitchen Note:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-stone-300">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({order.order_items.length} items)</span>
                <span className="tabular-nums">₹{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Campus Canteen GST (0%)</span>
                <span>₹0.00 (Waived)</span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-900 pt-1.5 border-t border-stone-200">
                <span>TOTAL AMOUNT</span>
                <span className="tabular-nums">₹{order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 text-xs border-b border-dashed border-stone-300 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Payment Mode:</span>
                <span className="font-bold">
                  {order.payment_method === 'upi_counter' ? 'UPI Counter (pitcanteen@upi)' : 'Cash at Counter #1'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Payment Status:</span>
                <span className="font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {order.payment_status === 'paid' ? 'Paid / Settled' : 'Pay at Counter'}
                </span>
              </div>
            </div>

            {/* QR Code / Barcode Block for Scanner */}
            <div className="pt-4 text-center space-y-2">
              <div className="flex flex-col items-center justify-center">
                {/* Simulated QR Code box */}
                <div className="p-2 border-2 border-stone-900 rounded-lg inline-block bg-white">
                  <QrCode className="w-20 h-20 text-stone-900" />
                </div>
                <span className="text-[9px] font-mono tracking-widest text-stone-500 mt-1">
                  TOKEN-TOKEN-{order.order_number}-{order.id.slice(0, 6)}
                </span>
              </div>

              <div className="text-[10px] text-stone-500 leading-tight max-w-xs mx-auto">
                Please present this token at <strong className="text-stone-800">Counter #2</strong> when called.
                <br />
                Retain this slip until order handover.
              </div>

              <div className="text-[9px] text-stone-400 pt-1">
                *** THANK YOU FOR VISITING PIT CANTEEN ***
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden in Print) */}
        <div className="no-print p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-stone-500 text-[11px] text-center sm:text-left">
            Thermal standard: 80mm roll width. Click print to open system dialog.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-5 py-2 bg-stone-900 hover:bg-orange-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
