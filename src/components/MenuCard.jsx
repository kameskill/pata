import React from 'react'

function MenuCard({
    image,
    name,
    description,
    weight,
    prepTime,
    price,
    onAdd
}) {
    return (
        <article className="w-full bg-white rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition">
            <img
                src={image}
                alt={name}
                className="w-full h-48 object-cover"
            />

            <div className="flex flex-col p-4 gap-6">
                <header className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold">{name}</h3>
                    {description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                            {description}
                        </p>
                    )}

                    <div className="flex gap-4 items-center mt-2">
                        {weight && (
                            <span className="text-gray-500 text-sm">{weight}</span>
                        )}
                        {prepTime && (
                            <span className="flex items-center gap-2 bg-gray-200 rounded-full px-3 py-1 text-sm">
                                <i className="fa-regular fa-clock"></i>
                                {prepTime}
                            </span>
                        )}
                    </div>
                </header>

                <footer className="flex justify-between items-center">
                    <div>
                        <span className="text-gray-500 text-sm">Starting</span>
                        <p className="text-lg font-bold">₱ {price}</p>
                    </div>

                    <button
                        onClick={onAdd}
                        className="rounded-xl px-4 py-2 bg-orange-200 hover:bg-orange-300 active:scale-95 transition"
                    >
                        <span className="text-sm font-bold text-orange-600">
                            + Add
                        </span>
                    </button>
                </footer>
            </div>
        </article>
    )
}

export default MenuCard