// Gestión del carrito
let cart = [];

// Cargar carrito guardado
async function loadCart() {
    const savedCart = localStorage.getItem('snackbar-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartUI();
}

// Agregar al carrito
function addToCart(product, extras = []) {
    const cartItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        extras: extras,
        totalPrice: product.price + extras.reduce((sum, e) => sum + e.price, 0),
        quantity: 1
    };
    
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    showNotification('✅ Producto agregado al carrito');
}

// Actualizar UI del carrito
function updateCartUI() {
    const cartContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
        cartCount.textContent = '0';
        cartTotal.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    cartContainer.innerHTML = cart.map((item, index) => {
        total += item.totalPrice;
        const extrasText = item.extras.length > 0 ? 
            `<div class="item-extras">+ ${item.extras.map(e => e.name).join(', ')}</div>` : '';
        
        return `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    ${extrasText}
                    <div class="item-price">$${item.totalPrice.toFixed(2)}</div>
                </div>
                <button class="remove-item" data-index="${index}">🗑️</button>
            </div>
        `;
    }).join('');
    
    cartCount.textContent = cart.length;
    cartTotal.textContent = `$${total.toFixed(2)}`;
    
    // Event listeners para eliminar items
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            cart.splice(index, 1);
            saveCart();
            updateCartUI();
            showNotification('🗑️ Producto eliminado');
        });
    });
}

// Guardar carrito
function saveCart() {
    localStorage.setItem('snackbar-cart', JSON.stringify(cart));
}

// Checkout
async function checkout() {
    if (cart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Preparar mensaje para WhatsApp (opcional)
    const message = generateWhatsAppMessage(cart, total);
    const whatsappUrl = `https://wa.me/${menuData?.businessInfo.phone || '1234567890'}?text=${encodeURIComponent(message)}`;
    
    // Guardar pedido localmente
    const order = {
        id: Date.now(),
        date: new Date().toISOString(),
        items: cart,
        total: total,
        status: 'pendiente'
    };
    
    const orders = JSON.parse(localStorage.getItem('snackbar-orders') || '[]');
    orders.push(order);
    localStorage.setItem('snackbar-orders', JSON.stringify(orders));
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Limpiar carrito
    cart = [];
    saveCart();
    updateCartUI();
    closeCart();
    
    showNotification('✅ Pedido enviado! En breve te confirmamos');
}

function generateWhatsAppMessage(cart, total) {
    let message = `🍔 *NUEVO PEDIDO SNACKBAR* 🍔\n\n`;
    message += `*Cliente:* ${getCustomerName() || 'Cliente Web'}\n`;
    message += `*Teléfono:* ${getCustomerPhone() || 'No especificado'}\n`;
    message += `*Pedido:*\n`;
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - $${item.basePrice.toFixed(2)}\n`;
        if (item.extras.length > 0) {
            message += `   Extras: ${item.extras.map(e => e.name).join(', ')}\n`;
        }
    });
    
    message += `\n*Total:* $${total.toFixed(2)}\n`;
    message += `\n*Método de pago:* Efectivo / Transferencia\n`;
    message += `\n¡Gracias por tu pedido! 🎉`;
    
    return message;
}

function getCustomerName() {
    let name = prompt('📝 ¿Cuál es tu nombre?', 'Cliente');
    localStorage.setItem('customer-name', name);
    return name;
}

function getCustomerPhone() {
    let phone = prompt('📱 ¿Número de teléfono?', '');
    localStorage.setItem('customer-phone', phone);
    return phone;
}

function showNotification(message, type = 'success') {
    // Crear notificación toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// Inicializar carrito
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});
