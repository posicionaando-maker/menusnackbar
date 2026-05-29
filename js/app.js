// App principal - SnackBar PWA
let menuData = null;
let currentCategory = null;
let searchTimeout = null;

// Inicializar la app
document.addEventListener('DOMContentLoaded', async () => {
    await loadMenuData();
    setupEventListeners();
    registerServiceWorker();
    checkOnlineStatus();
    renderCategories();
    renderProducts();
});

// Cargar datos del menú
async function loadMenuData() {
    try {
        const response = await fetch('/data/menu.json');
        menuData = await response.json();
        await saveMenuToLocalCache(menuData);
    } catch (error) {
        console.log('Cargando menú desde caché...');
        menuData = await loadMenuFromLocalCache();
    }
}

// Guardar en caché local (IndexedDB)
async function saveMenuToLocalCache(menu) {
    if (window.indexedDB) {
        const db = await openDB();
        const transaction = db.transaction(['menu'], 'readwrite');
        const store = transaction.objectStore('menu');
        await store.put(menu, 'snackbar-menu');
    }
}

// Cargar desde caché local
async function loadMenuFromLocalCache() {
    const db = await openDB();
    const transaction = db.transaction(['menu'], 'readonly');
    const store = transaction.objectStore('menu');
    return new Promise((resolve) => {
        const request = store.get('snackbar-menu');
        request.onsuccess = () => resolve(request.result || getDefaultMenu());
        request.onerror = () => resolve(getDefaultMenu());
    });
}

// Renderizar categorías
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!menuData) return;
    
    container.innerHTML = menuData.categories.map(cat => `
        <button class="category-btn ${currentCategory === cat.id ? 'active' : ''}" 
                data-category="${cat.id}">
            ${cat.icon} ${cat.name}
        </button>
    `).join('');
    
    // Agregar event listeners a las categorías
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = parseInt(e.currentTarget.dataset.category);
            currentCategory = categoryId;
            renderCategories();
            renderProducts();
        });
    });
}

// Renderizar productos
function renderProducts() {
    const container = document.getElementById('productsContainer');
    if (!menuData) return;
    
    let products = menuData.products;
    
    // Filtrar por categoría
    if (currentCategory) {
        products = products.filter(p => p.categoryId === currentCategory);
    }
    
    // Filtrar por búsqueda
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    if (searchTerm) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (products.length === 0) {
        container.innerHTML = '<div class="no-results">No hay productos disponibles</div>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-product='${JSON.stringify(product)}'>
            <div class="product-icon">${product.image}</div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-btn" data-product='${JSON.stringify(product)}'>+</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Event listeners para los botones de agregar
    document.querySelectorAll('.add-btn, .product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            let product;
            if (e.target.classList.contains('add-btn')) {
                product = JSON.parse(e.target.dataset.product);
            } else {
                product = JSON.parse(card.dataset.product);
            }
            openCustomizationModal(product);
        });
    });
}

// Abrir modal de personalización
function openCustomizationModal(product) {
    const modal = document.getElementById('customizeModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalBody = document.getElementById('modalBody');
    const basePriceSpan = document.getElementById('basePrice');
    
    modalProductName.textContent = product.name;
    basePriceSpan.textContent = `$${product.price.toFixed(2)}`;
    
    let customizationsHTML = '';
    
    if (product.customizations && Object.keys(product.customizations).length > 0) {
        for (const [type, options] of Object.entries(product.customizations)) {
            customizationsHTML += `
                <div class="customization-group">
                    <h4>${getCustomizationTitle(type)}</h4>
                    ${options.map(opt => `
                        <label class="customization-option">
                            <input type="checkbox" data-price="${opt.price}" data-name="${opt.name}" class="customization-checkbox">
                            <span>${opt.name}</span>
                            ${opt.price > 0 ? `<span class="extra-price">+$${opt.price.toFixed(2)}</span>` : ''}
                        </label>
                    `).join('')}
                </div>
            `;
        }
    } else {
        customizationsHTML = '<p>Sin opciones de personalización</p>';
    }
    
    modalBody.innerHTML = customizationsHTML;
    modal.style.display = 'flex';
    
    // Actualizar total cuando se seleccionan extras
    const checkboxes = modalBody.querySelectorAll('.customization-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => updateModalTotal(product.price));
    });
    
    // Configurar botón de confirmar
    const confirmBtn = document.getElementById('confirmAddToCart');
    confirmBtn.onclick = () => {
        const selectedExtras = getSelectedExtras();
        addToCart(product, selectedExtras);
        modal.style.display = 'none';
    };
    
    updateModalTotal(product.price);
}

// Actualizar total en modal
function updateModalTotal(basePrice) {
    let extrasTotal = 0;
    document.querySelectorAll('.customization-checkbox:checked').forEach(cb => {
        extrasTotal += parseFloat(cb.dataset.price || 0);
    });
    const total = basePrice + extrasTotal;
    document.getElementById('extrasInfo').innerHTML = extrasTotal > 0 ? 
        `<span>Extras: +$${extrasTotal.toFixed(2)}</span>` : '';
    document.getElementById('basePrice').textContent = `$${total.toFixed(2)}`;
}

// Obtener extras seleccionados
function getSelectedExtras() {
    const extras = [];
    document.querySelectorAll('.customization-checkbox:checked').forEach(cb => {
        extras.push({
            name: cb.dataset.name,
            price: parseFloat(cb.dataset.price || 0)
        });
    });
    return extras;
}

// Configurar event listeners
function setupEventListeners() {
    // Carrito toggle
    document.getElementById('cartToggle').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.add('open');
        document.getElementById('overlay').classList.add('active');
    });
    
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('overlay').addEventListener('click', closeCart);
    
    // Búsqueda con debounce
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderProducts();
        }, 300);
    });
    
    // Cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('customizeModal').style.display = 'none';
    });
    
    // Checkout
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registrado:', reg))
            .catch(err => console.log('Error SW:', err));
    }
}

// Verificar estado online/offline
function checkOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    window.addEventListener('online', () => banner.style.display = 'none');
    window.addEventListener('offline', () => banner.style.display = 'block');
    if (!navigator.onLine) banner.style.display = 'block';
}

function getCustomizationTitle(type) {
    const titles = {
        'extras': '🍕 Extras',
        'sauces': '🥫 Salsas',
        'flavors': '🌶️ Sabores'
    };
    return titles[type] || type;
}

function getDefaultMenu() {
    return {
        categories: [{ id: 1, name: "Productos", icon: "🍔" }],
        products: [{ id: 1, name: "Producto ejemplo", price: 5.00, description: "Descripción", categoryId: 1, image: "🍔", customizations: {} }]
    };
}
