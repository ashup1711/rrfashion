import { useState, useEffect, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { SyncEngine } from '../../lib/sync';
import db, { type PosProduct } from '../../lib/db';
import { apiClient } from '../../api/client';

const DEVICE_UUID = localStorage.getItem('pos_device_uuid') || crypto.randomUUID();
const API_KEY = localStorage.getItem('pos_api_key') || '';

interface ReceiptOrder {
  clientUuid: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  customerName: string;
  createdAt: string;
  storeName?: string;
}

/** Thermal-print-friendly receipt component */
const Receipt = ({ order }: { order: ReceiptOrder | null }) => {
  if (!order) return null;

  return (
    <div className="p-4 text-sm" style={{ width: '80mm', fontFamily: 'monospace' }}>
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold">{order.storeName || 'RR FASHION'}</h2>
        <p className="text-xs">{new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <div className="border-t border-b border-dashed py-2 mb-2">
        <p className="text-xs">Order #: {order.clientUuid.slice(0, 8).toUpperCase()}</p>
        <p className="text-xs">Customer: {order.customerName}</p>
        <p className="text-xs">Payment: {order.paymentMethod}</p>
      </div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Item</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-right py-1">Price</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1 pr-2 truncate max-w-[120px]">{item.name}</td>
              <td className="text-right py-1">{item.quantity}</td>
              <td className="text-right py-1">₹{item.unitPrice}</td>
              <td className="text-right py-1">
                ₹{(item.quantity * item.unitPrice).toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed pt-2 text-right font-bold">
        <p>Total: ₹{order.totalAmount.toFixed(2)}</p>
      </div>

      <div className="text-center mt-4 text-xs">
        <p>Thank you for shopping!</p>
        <p>Visit us again at RR FASHION</p>
      </div>
    </div>
  );
};

export default function PosPage() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<Array<{ product: PosProduct; qty: number }>>([]);
  const [search, setSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastOrder, setLastOrder] = useState<ReceiptOrder | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const syncEngine = useRef<SyncEngine | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `receipt-${lastOrder?.clientUuid?.slice(0, 8) || 'order'}`,
    onAfterPrint: () => setShowReceipt(false),
  });

  const printReceipt = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  useEffect(() => {
    localStorage.setItem('pos_device_uuid', DEVICE_UUID);

    syncEngine.current = new SyncEngine(DEVICE_UUID, API_KEY);

    // Report sync results including conflicts
    syncEngine.current.onChange = (result) => {
      if (result.conflicts > 0) {
        checkConflictCount();
      }
      checkPending();
    };

    loadProducts();
    checkPending();
    checkConflictCount();

    const onlineHandler = () => {
      setSyncStatus('online');
      if (syncEngine.current) {
        syncEngine.current.syncNow().then((result) => {
          if (result.conflicts > 0) checkConflictCount();
          checkPending();
        });
      }
    };
    const offlineHandler = () => setSyncStatus('offline');

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    if (navigator.onLine) {
      syncEngine.current.startAutoSync();
    } else {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      syncEngine.current?.stopAutoSync();
    };
  }, []);

  async function loadProducts() {
    const cached = await db.products.toArray();
    if (cached.length > 0) {
      setProducts(cached);
    }

    const storeId = localStorage.getItem('pos_store_id');
    if (!storeId) return;

    try {
      const storeParam = storeId !== 'default' ? storeId : '';
      const res = await apiClient.get('/pos/inventory', {
        params: { storeId: storeParam || undefined, limit: 200 },
        headers: {
          'x-pos-api-key': API_KEY,
          'x-pos-device-id': DEVICE_UUID,
        },
      });
      const items = (res.data?.items || []).map((v: any) => ({
        id: v.variantId,
        name: `${v.productName} - ${v.size}/${v.color}`,
        sku: v.sku,
        size: v.size,
        color: v.color,
        salePrice: v.salePrice,
        stock: v.quantityAvailable,
      }));

      await db.products.clear();
      await db.products.bulkAdd(items);
      setProducts(items);
    } catch {
      if (cached.length === 0) setSyncStatus('offline');
    }
  }

  async function checkPending() {
    const count = await db.syncQueue.count();
    setPendingCount(count);
  }

  async function checkConflictCount() {
    const count = await db.conflicts
      .where({ status: 'unresolved' })
      .count();
    setConflictCount(count);
  }

  function handleSearch(val: string) {
    setSearch(val);
  }

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  function addToCart(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.product.id === productId ? { ...c, qty } : c)),
      );
    }
  }

  const total = cart.reduce((sum, c) => sum + c.product.salePrice * c.qty, 0);

  async function checkout() {
    if (cart.length === 0) return;
    setSyncStatus('syncing');

    const orderUuid = crypto.randomUUID();
    const order = {
      clientUuid: orderUuid,
      storeId: localStorage.getItem('pos_store_id') || 'default',
      customerName: 'Walk-in Customer',
      items: cart.map((c) => ({
        variantId: c.product.id,
        quantity: c.qty,
        type: 'sale' as const,
        unitPrice: c.product.salePrice,
      })),
      totalAmount: total,
      paymentMethod: 'CASH',
    };

    try {
      if (navigator.onLine && API_KEY) {
        await apiClient.post('/pos/orders', order, {
          headers: {
            'x-pos-api-key': API_KEY,
            'x-pos-device-id': DEVICE_UUID,
          },
        });
      } else {
        await syncEngine.current!.queueOrder(order);
        await checkPending();
      }

      // Save receipt to IndexedDB for offline access
      const receiptOrder: ReceiptOrder = {
        clientUuid: orderUuid,
        items: cart.map((c) => ({
          name: c.product.name,
          sku: c.product.sku,
          quantity: c.qty,
          unitPrice: c.product.salePrice,
        })),
        totalAmount: total,
        paymentMethod: 'CASH',
        customerName: 'Walk-in Customer',
        createdAt: new Date().toISOString(),
        storeName: 'RR Fashion',
      };

      await db.syncQueue.add({
        entity: 'receipt',
        action: 'PRINT',
        data: JSON.stringify(receiptOrder),
        createdAt: new Date().toISOString(),
      });

      setLastOrder(receiptOrder);
      setShowReceipt(true);
      setCart([]);
    } catch {
      // Store receipt even if order fails
      const receiptOrder: ReceiptOrder = {
        clientUuid: orderUuid,
        items: cart.map((c) => ({
          name: c.product.name,
          sku: c.product.sku,
          quantity: c.qty,
          unitPrice: c.product.salePrice,
        })),
        totalAmount: total,
        paymentMethod: 'CASH',
        customerName: 'Walk-in Customer',
        createdAt: new Date().toISOString(),
        storeName: 'RR Fashion',
      };

      await syncEngine.current!.queueOrder(order);
      await checkPending();

      setLastOrder(receiptOrder);
      setShowReceipt(true);
      setCart([]);
    }

    setSyncStatus(navigator.onLine ? 'online' : 'offline');
  }

  async function manualSync() {
    setSyncStatus('syncing');
    const result = await syncEngine.current!.syncNow();
    await checkPending();
    await checkConflictCount();
    setSyncStatus(navigator.onLine ? 'online' : 'offline');
    alert(`Synced: ${result.synced}, Failed: ${result.failed}${result.conflicts > 0 ? `, Conflicts: ${result.conflicts}` : ''}`);
  }

  // Hidden receipt component for printing
  const receiptContent = showReceipt && lastOrder && (
    <div className="hidden">
      <div ref={receiptRef}>
        <Receipt order={lastOrder} />
      </div>
    </div>
  );

  if (!API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold mb-4">POS Device Not Configured</h1>
          <p className="text-gray-600 mb-4">
            Set your POS API key and device UUID in localStorage:
          </p>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4">
            {`localStorage.setItem('pos_api_key', 'YOUR_API_KEY')\nlocalStorage.setItem('pos_store_id', 'STORE_ID')`}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {receiptContent}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">RR Fashion POS</h1>
        <div className="flex items-center gap-3">
          {/* Conflict badge */}
          {conflictCount > 0 && (
            <button
              onClick={() => navigate('/admin/pos/conflicts')}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              title="View conflicts"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
            </button>
          )}
          <span className="text-sm text-gray-500">
            Pending: {pendingCount}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              syncStatus === 'online'
                ? 'bg-green-100 text-green-700'
                : syncStatus === 'offline'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {syncStatus === 'online' ? 'Online' : syncStatus === 'offline' ? 'Offline' : 'Syncing...'}
          </span>
          {(syncStatus === 'offline' || pendingCount > 0) && (
            <button
              onClick={manualSync}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4"
            autoFocus
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.slice(0, 50).map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-3 rounded-lg shadow text-left hover:shadow-md transition"
              >
                <div className="font-medium text-sm truncate">{product.name}</div>
                <div className="text-xs text-gray-500">{product.sku}</div>
                <div className="font-bold text-sm mt-1">₹{product.salePrice}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-80 bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-lg mb-3">Cart</h2>
          {cart.length === 0 ? (
            <div>
              <p className="text-gray-400 text-sm">Tap products to add</p>
              {showReceipt && lastOrder && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Last Order Complete</p>
                  <button
                    onClick={printReceipt}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Receipt
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {cart.map((c) => (
                <div key={c.product.id} className="flex items-center justify-between mb-2 pb-2 border-b">
                  <div className="flex-1">
                    <div className="text-sm truncate">{c.product.name}</div>
                    <div className="text-xs text-gray-500">₹{c.product.salePrice}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(c.product.id, c.qty - 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-6 text-center">{c.qty}</span>
                    <button
                      onClick={() => updateQty(c.product.id, c.qty + 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="font-bold text-lg mt-4">
                Total: ₹{total.toFixed(2)}
              </div>
              <button
                onClick={checkout}
                disabled={cart.length === 0}
                className="w-full mt-4 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
              >
                Checkout {syncStatus === 'offline' ? '(Offline)' : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
