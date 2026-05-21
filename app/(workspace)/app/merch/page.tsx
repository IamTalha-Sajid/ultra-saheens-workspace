"use client";

import { useEffect, useState, useCallback } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";

type OrderItem = {
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Order = {
  _id: string;
  orderId: string;
  status: "pending" | "processing" | "dispatched" | "cancelled";
  paymentMethod: "cod" | "prepaid";
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  prepaidDiscount: number;
  total: number;
  createdAt: string;
};

const STATUS_OPTIONS = ["pending", "processing", "dispatched", "cancelled"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  processing: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  dispatched: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-amber-400",
  processing: "bg-indigo-400",
  dispatched: "bg-emerald-400",
  cancelled: "bg-red-400",
};

function formatPKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILTER_OPTIONS = ["all", ...STATUS_OPTIONS] as const;
type Filter = (typeof FILTER_OPTIONS)[number];

export default function MerchOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useFeedback();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merch/orders");
      if (res.ok) {
        const data = await res.json() as { orders: Order[] };
        setOrders(data.orders);
      } else {
        toast({ message: "Failed to load orders.", variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: Status) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/merch/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.orderId === orderId ? { ...o, status } : o))
        );
        toast({ message: `Order ${orderId} marked as ${status}.`, variant: "success" });
      } else {
        toast({ message: "Failed to update status.", variant: "error" });
      }
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-panel mx-4 mt-3 flex shrink-0 flex-col gap-1 rounded-xl px-5 py-4 md:mx-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="glass-pill text-rose-400">Shop</span>
              <span className="glass-pill">{orders.length} total orders</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
              Executive Merch — Orders
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              All orders placed on shop.ultrashaheens.com
            </p>
          </div>
          <button
            onClick={() => void fetchOrders()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Status summary chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <span key={s} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              {s.charAt(0).toUpperCase() + s.slice(1)}: {counts[s] ?? 0}
            </span>
          ))}
        </div>
      </header>

      {/* Filter tabs */}
      <div className="mx-4 mt-3 flex gap-1 md:mx-6">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              filter === f
                ? "bg-white/10 text-white shadow-inner"
                : "text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
            }`}
          >
            {f === "all" ? `All (${orders.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 opacity-30">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-sm">No {filter === "all" ? "" : filter} orders found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => (
              <div
                key={order._id}
                className="glass-card rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all hover:bg-white/[0.04]"
              >
                {/* Order row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  {/* Order ID + date */}
                  <div className="min-w-[140px]">
                    <p className="font-mono text-xs font-bold text-white">{order.orderId}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{formatDate(order.createdAt)}</p>
                  </div>

                  {/* Customer */}
                  <div className="min-w-[130px] flex-1">
                    <p className="truncate text-sm font-semibold text-white">{order.customer.name}</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">{order.customer.phone} · {order.customer.city}</p>
                  </div>

                  {/* Payment method */}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    order.paymentMethod === "prepaid"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/20 bg-white/5 text-white/60"
                  }`}>
                    {order.paymentMethod === "prepaid" ? "Prepaid" : "COD"}
                  </span>

                  {/* Total */}
                  <p className="text-sm font-bold text-white">{formatPKR(order.total)}</p>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>

                  {/* Status changer */}
                  <select
                    value={order.status}
                    disabled={updating === order.orderId}
                    onChange={(e) => void updateStatus(order.orderId, e.target.value as Status)}
                    className="rounded-lg border border-white/10 bg-[var(--surface-overlay)] px-2 py-1.5 text-xs text-white/80 transition-all hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-40"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#27272a]">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                    className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {expanded === order._id ? "Hide" : "Details"}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${expanded === order._id ? "rotate-180" : ""}`}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* Expanded detail */}
                {expanded === order._id && (
                  <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Customer details */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Customer</p>
                        <p className="text-sm font-semibold text-white">{order.customer.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{order.customer.phone}</p>
                        <p className="mt-1 text-xs text-white/70">{order.customer.address}</p>
                        <p className="text-xs text-white/70">{order.customer.city}</p>
                      </div>

                      {/* Items */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:col-span-1 lg:col-span-1">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Items</p>
                        <div className="space-y-1.5">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-white">{item.productName}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">Size: {item.size} · Qty: {item.quantity}</p>
                              </div>
                              <p className="shrink-0 text-xs font-semibold text-white">{formatPKR(item.lineTotal)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing summary */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pricing</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-white/70">
                            <span>Subtotal</span>
                            <span>{formatPKR(order.subtotal)}</span>
                          </div>
                          {order.prepaidDiscount > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Prepaid discount (5%)</span>
                              <span>− {formatPKR(order.prepaidDiscount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-white/70">
                            <span>Delivery</span>
                            <span>{formatPKR(order.deliveryCharge)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 font-bold text-white">
                            <span>Total</span>
                            <span>{formatPKR(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
