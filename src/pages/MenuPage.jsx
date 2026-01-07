import React from 'react'
import CartModal from "../components/CartModal";
import { useCart } from "../context/Cart";
import supabase from '../config/Client';
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router';
import MenuCard from '../components/MenuCard';

function MenuPage() {
  const [cartOpen, setCartOpen] = useState(false);
  const { cart, addToCart } = useCart();
  const [open, setOpen] = useState(false);
  const [featuredMenu, setFeaturedMenu] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: featured, error: fErr } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_featured', true)

      const { data: regular, error: rErr } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_featured', false)

      if (fErr || rErr) {
        console.error(fErr || rErr)
      } else {
        setFeaturedMenu(featured)
        setMenu(regular)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const linkClass = ({ isActive }) =>
    `relative py-2 ${isActive
      ? "after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-black"
      : ""
    }`;
  return (
    <>
      <header className="w-full bg-white border-b border-gray-300">
        <div className="flex items-center justify-between max-w-7xl mx-auto p-4 md:p-8">
          <h1 className="text-xl md:text-4xl font-bold">
            Crispy Pata sa A.Luna
          </h1>
          <nav className="hidden md:block">
            <ul className="flex gap-6 text-lg">
              <li>
                <NavLink to="/" className={linkClass}>Home</NavLink>
              </li>
              <li>
                <NavLink to="/menu" className={linkClass}>Menu</NavLink>
              </li>
              <li>
                <NavLink
                  to="/login">Log in / Sign up
                </NavLink>
              </li>
              <li>
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative px-3 py-1 rounded-full bg-black text-white font-semibold
             hover:bg-neutral-800 active:scale-95 transition
             flex flex-row gap-2 items-center"
                >
                  <i className="fa-solid fa-cart-shopping"></i>
                  Cart

                  {cart?.length > 0 && (
                    <span
                      className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold
                 rounded-full px-2"
                    >
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2"
          >
            <svg
              className="w-7 h-7"
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

        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <nav className="px-4 pb-6 mt-1">
            <ul className="flex flex-col gap-4 text-lg">
              <li>
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative px-3 py-1 rounded-full bg-black text-white font-semibold
             hover:bg-neutral-800 active:scale-95 transition
             flex flex-row gap-2 items-center"
                >
                  <i className="fa-solid fa-cart-shopping"></i>
                  Cart

                  {cart?.length > 0 && (
                    <span
                      className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold
                 rounded-full px-2"
                    >
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <NavLink to="/" className={linkClass} onClick={() => setOpen(false)}>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/menu" className={linkClass} onClick={() => setOpen(false)}>
                  Menu
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/login">Log in / Sign up
                </NavLink>
              </li>
            </ul>
          </nav>

        </div>
      </header>
      <main className="flex min-h-screen flex-col w-full space-y-6 mt-5">
        <section className="flex flex-col gap-4 mx-auto p-4 md:p-0">
          <h2 className="text-2xl font-bold">Featured menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {featuredMenu.map(item => (
              <MenuCard
                key={item.id}
                image={item.image_url}
                name={item.name}
                description={item.description}
                weight={item.weight}
                prepTime={`${item.prep_time} mins`}
                price={item.price}
                onAdd={() => addToCart(item)}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold">Menu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {menu.map(item => (
              <MenuCard
                key={item.id}
                image={item.image_url}
                name={item.name}
                description={item.description}
                weight={item.weight}
                prepTime={`${item.prep_time} mins`}
                price={item.price}
                onAdd={() => addToCart(item)}
              />
            ))}
          </div>
        </section>
        <CartModal
          open={cartOpen}
          onClose={() => setCartOpen(false)}
        />
      </main>
    </>
  )
}

export default MenuPage