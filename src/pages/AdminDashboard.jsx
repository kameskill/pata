import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/Client";

const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

function AdminDashboard() {
    const navigate = useNavigate();

    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const [orders, setOrders] = useState([]);
    const ordersRef = useRef([]);
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    // userId -> full_name
    const [userNames, setUserNames] = useState({});

    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");

    const [msg, setMsg] = useState({ type: "", text: "" });
    const setError = (t) => setMsg({ type: "error", text: t });
    const setSuccess = (t) => setMsg({ type: "success", text: t });

    const fmtMoney = (n) => {
        const v = Number(n || 0);
        return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const safeLower = (v) => String(v || "").toLowerCase();

    // ✅ check session + admin
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const { data: userRes, error: userErr } = await supabase.auth.getUser();
                if (userErr) throw userErr;

                const user = userRes?.user;
                if (!user) {
                    navigate("/login", { replace: true });
                    return;
                }

                const { data: prof, error: profErr } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (profErr) throw profErr;

                if (!prof?.is_admin) {
                    navigate("/home", { replace: true });
                    return;
                }

                if (!mounted) return;
                setIsAdmin(true);
            } catch (e) {
                console.error(e);
                navigate("/home", { replace: true });
            } finally {
                if (mounted) setChecking(false);
            }
        };

        init();
        return () => {
            mounted = false;
        };
    }, [navigate]);

    const fetchOrders = async () => {
        setMsg({ type: "", text: "" });
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select(
                    "id, created_at, status, total, phone, pickup_address, payment_method, user_id, items, notes"
                )
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (e) {
            console.error(e);
            setError(e?.message || "Failed to load orders.");
        } finally {
            setLoading(false);
        }
    };

    // fetch user full names for displayed orders
    const fetchUserNames = async (ordersList) => {
        try {
            const ids = Array.from(
                new Set((ordersList || []).map((o) => o.user_id).filter(Boolean))
            );
            if (ids.length === 0) return;

            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", ids);

            if (error) throw error;

            const map = {};
            (data || []).forEach((p) => {
                map[p.user_id] = p.full_name || "";
            });

            setUserNames((prev) => ({ ...prev, ...map }));
        } catch (e) {
            // If RLS blocks profiles read, orders will still render using fallback user_id
            console.error("fetchUserNames error:", e);
        }
    };

    useEffect(() => {
        if (!isAdmin) return;
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    // when orders change, load names
    useEffect(() => {
        if (!isAdmin) return;
        fetchUserNames(orders);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, isAdmin]);

    // Optional realtime refresh
    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase
            .channel("admin-orders")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();

        return (orders || [])
            .filter((o) => (filter === "all" ? true : safeLower(o.status) === filter))
            .filter((o) => {
                if (!text) return true;

                const id = String(o.id || "").toLowerCase();
                const phone = String(o.phone || "").toLowerCase();
                const userId = String(o.user_id || "").toLowerCase();
                const fullName = String(userNames?.[o.user_id] || "").toLowerCase();

                const items = Array.isArray(o.items)
                    ? o.items.map((it) => `${it?.name} ${it?.price} ${it?.quantity}`.toLowerCase()).join(" ")
                    : "";

                return (
                    id.includes(text) ||
                    phone.includes(text) ||
                    userId.includes(text) ||
                    fullName.includes(text) ||
                    items.includes(text)
                );
            });
    }, [orders, filter, q, userNames]);

    const updateStatus = async (orderId, nextStatus) => {
        setMsg({ type: "", text: "" });

        const id = String(orderId);
        const status = safeLower(nextStatus);

        const prev = ordersRef.current;

        // optimistic UI
        setOrders((cur) => cur.map((o) => (String(o.id) === id ? { ...o, status, _saving: true } : o)));

        try {
            const { error } = await supabase.from("orders").update({ status }).eq("id", id);
            if (error) throw error;

            setOrders((cur) =>
                cur.map((o) => (String(o.id) === id ? { ...o, _saving: false } : o))
            );

            setSuccess("Status updated.");
            // ✅ ensure list + counts match DB
            await fetchOrders();
        } catch (e) {
            console.error(e);
            setOrders(prev);

            const detail = e?.details ? ` (${e.details})` : "";
            setError((e?.message || "Failed to update status.") + detail);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/", { replace: true });
    };

    if (checking) {
        return (
            <div className="min-h-screen grid place-items-center bg-white p-6">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const badgeClass = (status) => {
        const s = safeLower(status);
        return [
            "text-xs font-bold px-2 py-1 rounded-full border capitalize",
            s === "pending"
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : s === "confirmed"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : s === "preparing"
                        ? "border-purple-300 bg-purple-50 text-purple-700"
                        : s === "ready"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : s === "completed"
                                ? "border-gray-300 bg-gray-50 text-gray-700"
                                : "border-red-300 bg-red-50 text-red-700",
        ].join(" ");
    };

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs font-semibold tracking-wide text-gray-500">Admin Panel</div>
                        <h1 className="text-xl md:text-2xl font-extrabold truncate">Orders</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchOrders}
                            disabled={loading}
                            className="px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-60"
                        >
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </header>

            {msg.text && (
                <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
                    <div
                        className={[
                            "rounded-md border p-3 text-sm whitespace-pre-wrap",
                            msg.type === "error"
                                ? "border-red-300 bg-red-50 text-red-700"
                                : "border-green-300 bg-green-50 text-green-700",
                        ].join(" ")}
                    >
                        {msg.text}
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setFilter("all")}
                            className={[
                                "px-3 py-2 rounded-full border font-semibold text-sm",
                                filter === "all"
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                            ].join(" ")}
                        >
                            All ({orders.length})
                        </button>

                        {STATUS_OPTIONS.map((s) => {
                            const count = orders.filter((o) => safeLower(o.status) === s).length;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setFilter(s)}
                                    className={[
                                        "px-3 py-2 rounded-full border font-semibold text-sm capitalize",
                                        filter === s
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                                    ].join(" ")}
                                >
                                    {s} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="md:ml-auto w-full md:w-[360px]">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search: order id, phone, user name, user id, item name…"
                            className="w-full border border-gray-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-gray-700">Loading orders...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-gray-600">No orders found.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filtered.map((o) => {
                            const status = safeLower(o.status || "pending");
                            const fullName = userNames?.[o.user_id] || "";
                            const userLabel = fullName ? fullName : o.user_id ? String(o.user_id).slice(0, 8) + "…" : "—";

                            return (
                                <div key={o.id} className="rounded-xl border border-gray-200 p-4 md:p-5">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="font-extrabold">Order #{String(o.id).slice(0, 8)}</div>
                                                <span className={badgeClass(status)}>{status || "—"}</span>
                                                {o._saving && <span className="text-xs text-gray-500">Saving…</span>}
                                            </div>

                                            <div className="mt-1 text-sm text-gray-600">
                                                {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="font-semibold">Total:</span> ₱{fmtMoney(o.total)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold">Phone:</span> {o.phone || "—"}
                                                </div>
                                                <div className="md:col-span-2">
                                                    <span className="font-semibold">Pickup:</span> {o.pickup_address || "—"}
                                                </div>
                                                <div>
                                                    <span className="font-semibold">Payment:</span>{" "}
                                                    {o.payment_method ? String(o.payment_method).toUpperCase() : "—"}
                                                </div>
                                                <div className="truncate">
                                                    <span className="font-semibold">User:</span> {userLabel}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-[260px]">
                                            <label className="text-xs font-semibold text-gray-600">Update status</label>
                                            <select
                                                value={status}
                                                onChange={(e) => updateStatus(o.id, e.target.value)}
                                                className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20 capitalize"
                                                disabled={!!o._saving}
                                            >
                                                {STATUS_OPTIONS.map((s) => (
                                                    <option key={s} value={s} className="capitalize">
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>

                                            {o.notes && (
                                                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                                    <div className="font-semibold mb-1">Notes</div>
                                                    <div className="whitespace-pre-wrap">{o.notes}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t pt-4">
                                        <div className="text-sm font-bold mb-2">Items</div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-[520px] w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="text-left text-gray-600">
                                                        <th className="py-2 pr-3">Name</th>
                                                        <th className="py-2 pr-3">Price</th>
                                                        <th className="py-2 pr-3">Qty</th>
                                                        <th className="py-2 pr-3">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {(Array.isArray(o.items) ? o.items : []).map((it, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 pr-3 font-semibold">{it?.name}</td>
                                                            <td className="py-2 pr-3">₱{fmtMoney(it?.price)}</td>
                                                            <td className="py-2 pr-3">{it?.quantity}</td>
                                                            <td className="py-2 pr-3 font-semibold">
                                                                ₱{fmtMoney(Number(it?.price) * Number(it?.quantity))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;
