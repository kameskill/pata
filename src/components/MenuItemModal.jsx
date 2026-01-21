import React, { useEffect } from "react";

export default function MenuItemModal({ open, onClose, item }) {
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || !item) return null;

    const prep = item.prep_time ? `${item.prep_time} mins` : "";
    const weight = item.weight ? item.weight : "";

    const brief = item.description
        ? item.description
        : `Made fresh to order${prep ? ` in about ${prep}` : ""}${weight ? ` • ${weight}` : ""}.`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                // click outside closes
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* modal card */}
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
                <div className="flex items-start justify-between p-5 border-b border-gray-200">
                    <div>
                        <h3 className="text-xl font-bold">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {prep}
                            {prep && weight ? " • " : ""}
                            {weight}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {item.image_url && (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-56 object-cover rounded-xl"
                            loading="lazy"
                        />
                    )}

                    <p className="text-base text-gray-800">{brief}</p>
                </div>
            </div>
        </div>
    );
}