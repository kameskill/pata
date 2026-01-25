import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/Cart";
import supabase from "../config/Client";
import MenuCard from "../components/MenuCard";

function LandingPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [open, setOpen] = useState(false);
  const [featuredMenu, setFeaturedMenu] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ If logged in -> go to /home, else stay here
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

      if (fErr || rErr) console.error(fErr || rErr);
      else {
        setFeaturedMenu(featured || []);
        setMenu(regular || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // ✅ same “pill” style like Home
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
          <h1 className="text-xl md:text-3xl font-bold truncate">
            Crispy Pata sa A.Luna
          </h1>

          {/* Desktop nav (Order Now LAST) */}
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

              {/* Order Now last */}
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/menu")}
                  className="relative px-3 py-1 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition flex flex-row gap-2 items-center"
                >
                  <i className="fa-solid fa-cart-shopping" />
                  Order Now!
                </button>
              </li>
            </ul>
          </nav>

          {/* Mobile right controls: Order Now ALWAYS visible + Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="relative px-3 py-2 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition flex flex-row gap-2 items-center text-sm"
            >
              <i className="fa-solid fa-cart-shopping" />
              Order Now!
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

      {/* Body (same as yours) */}
      <main className="flex flex-col gap-4 p-4 md:p-0 max-w-7xl mx-auto">
        <section className="h-50 md:h-180 mt-4 bg-[url('/pataXXL.jpg')] bg-no-repeat bg-center bg-contain flex items-center">
          <div className="bg-black/50 w-full h-55 md:h-110 lg:h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4">
              <h1 className="text-white text-2xl md:text-4xl font-bold">
                Crispy Pata & Fried Chicken
              </h1>
              <p className="text-white/90 text-sm md:text-base mt-2 max-w-xl">
                We serve a variety of crispy pata and fried chicken — perfectly seasoned,
                golden-crispy, and made fresh for every order.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 mx-auto p-4 md:p-0">
          <h2 className="text-2xl font-bold">Featured menu</h2>

          {loading ? (
            <div className="text-gray-700">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {featuredMenu.map((item) => (
                <MenuCard
                  key={item.id}
                  image={item.image_url}
                  name={item.name}
                  description={item.description}
                  weight={item.weight}
                  prepTime={`${item.prep_time} mins`}
                  price={item.price}
                  onAdd={() => {
                    addToCart(item);
                    navigate("/menu");
                  }}
                />
              ))}
            </div>
          )}

          <h2 className="text-2xl font-bold">Menu</h2>

          {loading ? (
            <div className="text-gray-700">Loading...</div>
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
                  onAdd={() => {
                    addToCart(item);
                    navigate("/menu");
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default LandingPage;
