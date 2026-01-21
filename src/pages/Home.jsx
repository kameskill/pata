import React, { useEffect, useMemo, useState } from "react";
import supabase from "../config/Client";
import { useCart } from "../context/Cart";
import MenuCard from "../components/MenuCard";
import MenuItemModal from "../components/MenuItemModal";
import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();

    const {
        cart,
        addToCart,
        increaseQty,
        decreaseQty,
        removeFromCart,
        clearCart,
        totalPrice,
        setQty,
    } = useCart();

    const [user, setUser] = useState(null);
    const [active, setActive] = useState("menu"); // menu | cart | orders | profile

    const [menu, setMenu] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);

    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const [placing, setPlacing] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [open, setOpen] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const PICKUP_ADDRESS = "124 F.Vergel Concepcion Baliuag Bulacan (Pickup Only)";
    const PICKUP_NOTE = "Note: This is for pickup only.";

    const [profile, setProfile] = useState({
        full_name: "",
        phone: "",
        notes: "",
    });
    const [savingProfile, setSavingProfile] = useState(false);

    const [checkout, setCheckout] = useState({
        phone: "",
        notes: "",
        payment: "pickup",
    });

    const setError = (text) => setMsg({ type: "error", text });
    const setSuccess = (text) => setMsg({ type: "success", text });

    const cartBadgeCount = useMemo(
        () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        [cart]
    );

    const itemsPayload = useMemo(
        () =>
            cart.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
            })),
        [cart]
    );

    const fillCheckoutFromProfile = (p) => {
        setCheckout((prev) => ({
            ...prev,
            phone: prev.phone?.trim() ? prev.phone : p.phone || "",
            notes: prev.notes?.trim() ? prev.notes : p.notes || "",
        }));
    };

    // ✅ Ensure profile row exists (for confirmed users)
    const ensureProfile = async (u) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", u.id)
            .maybeSingle();

        if (error) {
            console.error(error);
            return;
        }

        if (data) return;

        const payload = {
            user_id: u.id,
            full_name: u.user_metadata?.full_name || "",
            phone: u.user_metadata?.phone || "",
            notes: null,
        };

        const { error: insertError } = await supabase.from("profiles").insert([payload]);
        if (insertError) console.error(insertError);
    };

    // ✅ Fetch profile by user_id
    const fetchProfile = async (u) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("full_name, phone, notes")
            .eq("user_id", u.id)
            .maybeSingle();

        if (error) {
            console.error(error);
            return null;
        }

        const p = {
            full_name: data?.full_name || "",
            phone: data?.phone || "",
            notes: data?.notes || "",
        };

        setProfile(p);
        fillCheckoutFromProfile(p);
        return p;
    };

    // ✅ ONLY ONE init useEffect (no duplicates)
    useEffect(() => {
        const init = async () => {
            const {
                data: { user: u },
            } = await supabase.auth.getUser();

            if (!u) {
                navigate("/login");
                return;
            }

            setUser(u);

            const metaName =
                u?.user_metadata?.full_name ||
                u?.user_metadata?.name ||
                u?.user_metadata?.fullname ||
                "";

            if (metaName) {
                setProfile((p) => ({ ...p, full_name: p.full_name || metaName }));
            }

            await ensureProfile(u);
            await fetchProfile(u);
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    useEffect(() => {
        const fetchMenu = async () => {
            setLoadingMenu(true);
            const { data, error } = await supabase
                .from("menu_items")
                .select("*")
                .order("id", { ascending: true });

            if (error) console.error(error);
            else setMenu(data || []);
            setLoadingMenu(false);
        };

        fetchMenu();
    }, []);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        setMsg({ type: "", text: "" });

        try {
            const {
                data: { user: u },
            } = await supabase.auth.getUser();

            if (!u) {
                navigate("/login");
                return;
            }

            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_id", u.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load orders.");
        } finally {
            setLoadingOrders(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const navBtnClass = ({ isActive }) =>
        [
            "px-3 py-1 rounded-full font-semibold transition border",
            isActive
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
        ].join(" ");

    const setTab = async (id) => {
        setMsg({ type: "", text: "" });
        setActive(id);
        setOpen(false);

        if (id === "orders") await fetchOrders();
        if (id === "cart") fillCheckoutFromProfile(profile);
    };

    const saveProfile = async () => {
        setMsg({ type: "", text: "" });

        if (!profile.full_name.trim()) return setError("Please enter your full name.");
        if (!profile.phone.trim()) return setError("Please enter your phone number.");

        setSavingProfile(true);

        try {
            const {
                data: { user: u },
            } = await supabase.auth.getUser();

            if (!u) {
                navigate("/login");
                return;
            }

            const payload = {
                user_id: u.id,
                full_name: profile.full_name,
                phone: profile.phone,
                notes: profile.notes || null,
            };

            const { error } = await supabase
                .from("profiles")
                .upsert(payload, { onConflict: "user_id" });

            if (error) throw error;

            setSuccess("Profile saved. Your phone will be auto-filled on checkout.");
            fillCheckoutFromProfile(profile);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to save profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const placeOrder = async () => {
        setMsg({ type: "", text: "" });

        if (cart.length === 0) return setError("Your cart is empty.");

        const effective = {
            phone: checkout.phone?.trim() ? checkout.phone : profile.phone,
            notes: checkout.notes?.trim() ? checkout.notes : profile.notes,
            payment: checkout.payment,
        };

        if (!effective.phone?.trim())
            return setError("Please enter your phone number (or save it in Profile).");

        setPlacing(true);

        try {
            const {
                data: { user: u },
            } = await supabase.auth.getUser();

            if (!u) {
                navigate("/login");
                return;
            }

            const payload = {
                user_id: u.id,
                items: itemsPayload,
                total: totalPrice,
                phone: effective.phone,
                notes: effective.notes || null,
                pickup_address: PICKUP_ADDRESS,
                payment_method: effective.payment,
                status: "pending",
            };

            const { error } = await supabase.from("orders").insert([payload]);
            if (error) throw error;

            setSuccess("Order placed! We will contact you to confirm your pickup.");
            clearCart();

            setCheckout((p) => ({
                ...p,
                phone: profile.phone || "",
                notes: profile.notes || "",
                payment: p.payment || "pickup",
            }));

            setActive("orders");
            await fetchOrders();
        } catch (err) {
            console.error(err);
            setError(err.message || "Checkout failed.");
        } finally {
            setPlacing(false);
        }
    };

    const openItemModal = (item) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    if (!user) {
        return (
            <div className="min-h-screen grid place-items-center bg-white p-6">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-white pb-16 md:pb-0">
            {/* ✅ Modal */}
            <MenuItemModal
                open={modalOpen}
                item={selectedItem}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedItem(null);
                }}
            />

            {/* Header */}
            <header className="w-full bg-white border-b border-gray-300 sticky top-0 z-30">
                <div className="flex items-center justify-between max-w-7xl mx-auto p-4 md:p-6 gap-3">
                    <h1 className="text-xl md:text-3xl font-bold truncate">
                        Crispy Pata sa A.Luna
                    </h1>

                    {/* Desktop nav (Cart is LAST) */}
                    <nav className="hidden md:block">
                        <ul className="flex items-center gap-3 text-sm">
                            <li>
                                <button
                                    className={navBtnClass({ isActive: active === "menu" })}
                                    onClick={() => setTab("menu")}
                                >
                                    Menu
                                </button>
                            </li>
                            <li>
                                <button
                                    className={navBtnClass({ isActive: active === "orders" })}
                                    onClick={() => setTab("orders")}
                                >
                                    Orders
                                </button>
                            </li>
                            <li>
                                <button
                                    className={navBtnClass({ isActive: active === "profile" })}
                                    onClick={() => setTab("profile")}
                                >
                                    Profile
                                </button>
                            </li>

                            {/* Cart last */}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setTab("cart")}
                                    className="relative px-3 py-1 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition flex flex-row gap-2 items-center"
                                >
                                    <i className="fa-solid fa-cart-shopping" />
                                    Cart
                                    {cartBadgeCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full px-2">
                                            {cartBadgeCount}
                                        </span>
                                    )}
                                </button>
                            </li>
                        </ul>
                    </nav>

                    {/* Mobile right controls: Cart ALWAYS visible + Hamburger */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTab("cart")}
                            className="relative px-3 py-2 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition flex flex-row gap-2 items-center text-sm"
                        >
                            <i className="fa-solid fa-cart-shopping" />
                            Cart
                            {cartBadgeCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold rounded-full px-2">
                                    {cartBadgeCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setOpen((v) => !v)}
                            className="p-2 rounded-md border border-gray-200"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown nav */}
                <div
                    className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                        }`}
                >
                    <nav className="px-4 pb-6">
                        <ul className="flex flex-col gap-3 text-base">
                            <li>
                                <button
                                    onClick={() => setTab("menu")}
                                    className={[
                                        "w-full text-left px-3 py-2 rounded-lg font-semibold",
                                        active === "menu"
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-gray-700",
                                    ].join(" ")}
                                >
                                    Menu
                                </button>
                            </li>

                            <li>
                                <button
                                    onClick={() => setTab("orders")}
                                    className={[
                                        "w-full text-left px-3 py-2 rounded-lg font-semibold",
                                        active === "orders"
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-gray-700",
                                    ].join(" ")}
                                >
                                    Orders
                                </button>
                            </li>

                            <li>
                                <button
                                    onClick={() => setTab("profile")}
                                    className={[
                                        "w-full text-left px-3 py-2 rounded-lg font-semibold",
                                        active === "profile"
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-gray-700",
                                    ].join(" ")}
                                >
                                    Profile
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* Message */}
            {msg.text && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div
                        className={[
                            "rounded-md border p-3 text-sm",
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
                {/* MENU */}
                {active === "menu" && (
                    <>
                        <div className="flex items-end justify-between mb-4">
                            <h2 className="text-2xl font-bold">Menu</h2>
                            <button
                                onClick={() => setTab("cart")}
                                className="px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                            >
                                Go to Cart →
                            </button>
                        </div>

                        {loadingMenu ? (
                            <div className="text-gray-700">Loading menu...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                {menu.map((item) => (
                                    <MenuCard
                                        key={item.id}
                                        image={item.image_url}
                                        name={item.name}
                                        description={item.description}
                                        weight={item.weight}
                                        prepTime={`${item.prep_time} mins`}
                                        price={item.price}
                                        onAdd={() => addToCart(item)}
                                        onImageClick={() => openItemModal(item)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* CART + CHECKOUT */}
                {active === "cart" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cart */}
                        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-4 md:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-2xl font-bold">Cart</h2>
                                <button
                                    onClick={() => setTab("profile")}
                                    className="text-sm px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                                >
                                    Edit profile →
                                </button>
                            </div>

                            {cart.length === 0 ? (
                                <p className="text-gray-600 mt-3">Your cart is empty.</p>
                            ) : (
                                <div className="mt-4 flex flex-col gap-4">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-start border-b pb-3 gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-semibold truncate">{item.name}</div>
                                                <div className="text-sm text-gray-600">₱{item.price}</div>

                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <button
                                                        onClick={() => decreaseQty(item.id)}
                                                        className="w-9 h-9 rounded-full border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        -
                                                    </button>

                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => setQty(item.id, e.target.value)}
                                                        className="w-16 h-9 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black/20"
                                                    />

                                                    <button
                                                        onClick={() => increaseQty(item.id)}
                                                        className="w-9 h-9 rounded-full border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50"
                                                    >
                                                        +
                                                    </button>

                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="ml-2 text-red-500 text-sm hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="font-bold whitespace-nowrap">
                                                ₱{Number(item.price) * Number(item.quantity)}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-2">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold text-lg">₱{totalPrice}</span>
                                    </div>

                                    <button
                                        onClick={clearCart}
                                        className="self-start px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                                    >
                                        Clear cart
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Checkout */}
                        <div className="border border-gray-200 rounded-xl p-4 md:p-6 h-fit">
                            <h3 className="text-xl font-bold">Checkout</h3>

                            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                <div className="font-semibold">Pickup Address</div>
                                <div>{PICKUP_ADDRESS}</div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                {/* Payment */}
                                <div>
                                    <label className="text-sm font-semibold">Payment method</label>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCheckout((p) => ({ ...p, payment: "pickup" }))}
                                            className={[
                                                "px-3 py-2 rounded-full border font-semibold text-sm",
                                                checkout.payment === "pickup"
                                                    ? "bg-black text-white border-black"
                                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                                            ].join(" ")}
                                        >
                                            Pay upon pickup
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setCheckout((p) => ({ ...p, payment: "gcash" }))}
                                            className={[
                                                "px-3 py-2 rounded-full border font-semibold text-sm",
                                                checkout.payment === "gcash"
                                                    ? "bg-black text-white border-black"
                                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                                            ].join(" ")}
                                        >
                                            GCash
                                        </button>
                                    </div>

                                    {/* ✅ keep the note */}
                                    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                        {checkout.payment === "gcash" ? (
                                            <>
                                                You can pay via GCash before we process your order, or we
                                                will contact you to confirm before processing.
                                                <br />
                                                <span className="font-semibold">{PICKUP_NOTE}</span>
                                            </>
                                        ) : (
                                            <span className="font-semibold">{PICKUP_NOTE}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="text-sm font-semibold">Phone number</label>
                                    <input
                                        value={checkout.phone}
                                        onChange={(e) =>
                                            setCheckout((p) => ({ ...p, phone: e.target.value }))
                                        }
                                        className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                        placeholder="09xx xxx xxxx"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-sm font-semibold">Notes (optional)</label>
                                    <textarea
                                        value={checkout.notes}
                                        onChange={(e) =>
                                            setCheckout((p) => ({ ...p, notes: e.target.value }))
                                        }
                                        className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                        placeholder="Any instructions"
                                        rows={3}
                                    />
                                </div>

                                <div className="mt-1 flex items-center justify-between font-bold">
                                    <span>Total</span>
                                    <span>₱{totalPrice}</span>
                                </div>

                                <button
                                    onClick={placeOrder}
                                    disabled={placing || cart.length === 0}
                                    className="mt-2 px-4 py-2.5 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition disabled:opacity-60"
                                >
                                    {placing ? "Placing..." : "Place Order"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ORDERS */}
                {active === "orders" && (
                    <div className="border border-gray-200 rounded-xl p-4 md:p-6">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-2xl font-bold">Your Orders</h2>
                            <button
                                onClick={fetchOrders}
                                className="px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                                disabled={loadingOrders}
                            >
                                {loadingOrders ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>

                        {loadingOrders ? (
                            <p className="text-gray-600 mt-4">Loading orders...</p>
                        ) : orders.length === 0 ? (
                            <p className="text-gray-600 mt-4">No orders yet.</p>
                        ) : (
                            <div className="mt-4 flex flex-col gap-4">
                                {orders.map((o) => (
                                    <div key={o.id} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div className="font-bold">Order #{String(o.id).slice(0, 8)}</div>
                                            <div className="text-sm text-gray-600">
                                                {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
                                            </div>
                                        </div>

                                        <div className="mt-2 text-sm">
                                            <span className="font-semibold">Total:</span> ₱{o.total}
                                        </div>

                                        <div className="mt-1 text-sm">
                                            <span className="font-semibold">Phone:</span> {o.phone || "—"}
                                        </div>

                                        <div className="mt-1 text-sm">
                                            <span className="font-semibold">Pickup:</span>{" "}
                                            {o.pickup_address || PICKUP_ADDRESS}
                                        </div>

                                        {o.payment_method && (
                                            <div className="mt-1 text-sm text-gray-600">
                                                Payment: {String(o.payment_method).toUpperCase()}
                                            </div>
                                        )}
                                        {o.status && (
                                            <div className="mt-1 text-sm text-gray-600">Status: {o.status}</div>
                                        )}

                                        <div className="mt-3 text-sm text-gray-700">
                                            <div className="font-semibold mb-1">Items</div>
                                            <ul className="list-disc ml-5 space-y-1">
                                                {(o.items || []).map((it, idx) => (
                                                    <li key={idx}>
                                                        {it.name} — ₱{it.price} × {it.quantity}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {o.notes && (
                                            <div className="mt-3 text-sm text-gray-700">
                                                <span className="font-semibold">Notes:</span> {o.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PROFILE */}
                {active === "profile" && (
                    <div className="border border-gray-200 rounded-xl p-4 md:p-6">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                                <h2 className="text-2xl font-bold">Profile</h2>
                                <p className="text-sm text-gray-600 mt-1">Email: {user.email}</p>
                            </div>

                            <button
                                onClick={logout}
                                className="px-4 py-2 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                            >
                                Log out
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Details */}
                            <div className="border border-gray-200 rounded-xl p-4 md:p-6">
                                <h3 className="text-lg font-bold">Customer details</h3>

                                <div className="mt-4 flex flex-col gap-3">
                                    <div>
                                        <label className="text-sm font-semibold">Full name</label>
                                        <input
                                            value={profile.full_name}
                                            onChange={(e) =>
                                                setProfile((p) => ({ ...p, full_name: e.target.value }))
                                            }
                                            className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                            placeholder="Juan Dela Cruz"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold">Phone number</label>
                                        <input
                                            value={profile.phone}
                                            onChange={(e) =>
                                                setProfile((p) => ({ ...p, phone: e.target.value }))
                                            }
                                            className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                            placeholder="09xx xxx xxxx"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold">Notes (optional)</label>
                                        <textarea
                                            value={profile.notes}
                                            onChange={(e) =>
                                                setProfile((p) => ({ ...p, notes: e.target.value }))
                                            }
                                            className="mt-1 w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                            placeholder="Any instructions"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={saveProfile}
                                            disabled={savingProfile}
                                            className="px-5 py-2.5 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition disabled:opacity-60"
                                        >
                                            {savingProfile ? "Saving..." : "Save details"}
                                        </button>

                                        <button
                                            onClick={() => {
                                                fillCheckoutFromProfile(profile);
                                                setTab("cart");
                                            }}
                                            className="px-5 py-2.5 rounded-full border border-gray-200 font-semibold hover:bg-gray-50"
                                        >
                                            Go to Checkout →
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="border border-gray-200 rounded-xl p-4 md:p-6">
                                <h3 className="text-lg font-bold">Saved info preview</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    This is what will auto-fill when you place an order.
                                </p>

                                <div className="mt-4 text-sm text-gray-700 space-y-2">
                                    <div>
                                        <span className="font-semibold">Name:</span>{" "}
                                        {profile.full_name || "—"}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Email:</span> {user.email}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Phone:</span>{" "}
                                        {profile.phone || "—"}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Notes:</span>{" "}
                                        {profile.notes || "—"}
                                    </div>
                                    <div className="pt-2">
                                        <span className="font-semibold">Pickup:</span> {PICKUP_ADDRESS}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Home;
