export async function getProducts() {
    // Return mock product data
    return [
        {
            id: 1,
            name: "De Dilute Lemon Soda",
            description: "Refreshing lemon soda with a fizzy kick.",
            price: 2.99,
        },
        {
            id: 2,
            name: "De Dilute Peach Tea",
            description: "Sweet peach tea with natural flavors.",
            price: 3.49,
        },
        {
            id: 3,
            name: "De Dilute Cold Brew",
            description: "Smooth and bold cold brew coffee.",
            price: 4.25,
        },
    ];
}