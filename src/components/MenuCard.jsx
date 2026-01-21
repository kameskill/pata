import React from "react";

export default function MenuCard({
    image,
    name,
    description,
    weight,
    prepTime,
    price,
    onAdd,
    onImageClick, // ✅ NEW
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* ✅ IMAGE ONLY CLICK */}
            <img
                src={image}
                alt={name}
                onClick={onImageClick}
                className="w-full h-48 object-cover cursor-pointer"
                loading="lazy"
            />

            <div className="p-4 space-y-2">
                <h3 className="text-lg font-bold">{name}</h3>

                {description && (
                    <p className="text-sm text-gray-600">{description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{weight}</span>
                    <span>{prepTime}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <p className="text-lg font-bold">₱{price}</p>

                    {/* ✅ ADD TO CART (NO MODAL POPUP) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd?.();
                        }}
                        className="px-3 py-1 rounded-full bg-black text-white font-semibold
              hover:bg-neutral-800 active:scale-95 transition"
                    >
                        Add to cart
                    </button>
                </div>
            </div>
        </div>
    );
}