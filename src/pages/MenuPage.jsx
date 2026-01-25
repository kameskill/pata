import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import CartModal from "../components/CartModal";
import { useCart } from "../context/Cart";
import supabase from "../config/Client";
import MenuCard from "../components/MenuCard";
import MenuItemModal from "../components/MenuItemModal";

function MenuPage() {
  const navigate = useNavigate();

  const [cartOpen, setCartOpen] = useState(false);
  const { cart, addToCart } = useCart();

  const [open, setOpen] = useState(false);
  const [featuredMenu, setFeaturedMenu] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  const [itemOpen, setItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const cartBadgeCount = useMemo(
    () => (cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart]
  );

  const openItemModal = (item) => {
    setSelectedItem(item);
    setItemOpen(true);
  };

  // ✅ If logged in -> redirect to /home, else stay on /menu
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const user = data?.session?.user;
      if (user?.id) navigate("/home", { replace: true });
    };

    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) navigate("/home", { replace: true });
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: featured, error: fErr } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_featured", true);

      const { data: regular, error: rErr } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_featured", false);

      if (fErr || rErr) {
        console.error(fErr || rErr);
      } else {
        setFeaturedMenu(featured || []);
        setMenu(regular || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const navBtnClass = ({ isActive }) =>
    [
      "px-3 py-1 rounded-full font-semibold transition border",
      isActive
        ? "bg-black text-white border-black"
        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
    ].join(" ");

  return (
    <>
      {/* ✅ Home-style Header */}
      <header className="w-full bg-white border-b border-gray-300 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-7xl mx-auto p-4 md:p-6 gap-3">
          <h1 className="text-xl md:text-3xl font-bold truncate">Crispy Pata sa A.Luna</h1>

          {/* Desktop nav (Cart LAST) */}
          <nav className="hidden md:block">
            <ul className="flex items-center gap-3 text-sm">
              <li>
                <NavLink to="/" className={navBtnClass}>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/menu" className={navBtnClass}>
                  Menu
                </NavLink>
              </li>
              <li>
                <NavLink to="/login" className={navBtnClass}>
                  Log in / Sign up
                </NavLink>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
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
              onClick={() => setCartOpen(true)}
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
              className="p-2 rounded-md border border-gray-200 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {open ? (
                /* ❌ Close icon */
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                /* ☰ Hamburger icon */
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
              )}
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
                <NavLink
                  to="/"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "w-full block text-left px-3 py-2 rounded-lg font-semibold",
                      isActive ? "bg-black text-white" : "bg-gray-100 text-gray-700",
                    ].join(" ")
                  }
                >
                  Home
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/menu"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "w-full block text-left px-3 py-2 rounded-lg font-semibold",
                      isActive ? "bg-black text-white" : "bg-gray-100 text-gray-700",
                    ].join(" ")
                  }
                >
                  Menu
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "w-full block text-left px-3 py-2 rounded-lg font-semibold",
                      isActive ? "bg-black text-white" : "bg-gray-100 text-gray-700",
                    ].join(" ")
                  }
                >
                  Log in / Sign up
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="flex min-h-screen flex-col w-full space-y-6 mt-5">
        <section className="flex flex-col gap-4 mx-auto p-4 md:p-0 max-w-7xl w-full">
          <h2 className="text-2xl font-bold">Featured menu</h2>

          {loading ? (
            <div className="text-gray-700">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {featuredMenu.map((item) => (
                <div key={item.id}>
                  <MenuCard
                    image={item.image_url}
                    name={item.name}
                    description={item.description}
                    weight={item.weight}
                    prepTime={`${item.prep_time} mins`}
                    price={item.price}
                    onAdd={() => addToCart(item)}
                    onImageClick={() => openItemModal(item)}
                  />
                </div>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-bold">Menu</h2>

          {loading ? (
            <div className="text-gray-700">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {menu.map((item) => (
                <div key={item.id}>
                  <MenuCard
                    image={item.image_url}
                    name={item.name}
                    description={item.description}
                    weight={item.weight}
                    prepTime={`${item.prep_time} mins`}
                    price={item.price}
                    onAdd={() => addToCart(item)}
                    onImageClick={() => openItemModal(item)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <CartModal open={cartOpen} onClose={() => setCartOpen(false)} />

        <MenuItemModal open={itemOpen} onClose={() => setItemOpen(false)} item={selectedItem} />
      </main>
    </>
  );
}

export default MenuPage;
