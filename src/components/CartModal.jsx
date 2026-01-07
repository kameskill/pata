import { useCart } from "../context/Cart";
import supabase from "../config/Client";

function CartModal({ open, onClose }) {
    const { cart, removeFromCart, totalPrice, clearCart } = useCart();

    if (!open) return null;

    const handleCheckout = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log("User:", user);

            if (!user) {
                alert("Please login before checkout!");
                window.location.href = "/login";
                return;
            }

            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const { data, error } = await supabase.from("orders").insert([
                {
                    user_id: user.id,
                    items: cart.map((item) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                    total: totalPrice,
                },
            ]);

            if (error) throw error;

            alert("Order placed successfully!");
            clearCart();
            onClose();
        } catch (err) {
            console.error("Checkout failed:", err);
            alert("Something went wrong. Check console for details.");
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white p-4 flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
                >
                    &times;
                </button>

                <h2 className="text-xl font-bold mb-4">Your Cart</h2>

                {cart.length === 0 ? (
                    <p className="text-gray-500">Your cart is empty.</p>
                ) : (
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="flex justify-between items-center border-b pb-2"
                            >
                                <div>
                                    <h3 className="font-semibold">{item.name}</h3>
                                    <p className="text-sm">
                                        ₱{item.price} × {item.quantity}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-500 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₱{totalPrice}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        className="mt-4 w-full bg-black text-white py-2 rounded"
                        disabled={cart.length === 0}
                    >
                        Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CartModal;