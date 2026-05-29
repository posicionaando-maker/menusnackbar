// IndexedDB para almacenamiento local
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SnackBarDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('menu')) {
                db.createObjectStore('menu');
            }
            if (!db.objectStoreNames.contains('orders')) {
                db.createObjectStore('orders', { keyPath: 'id' });
            }
        };
    });
}

// Guardar pedido offline
async function saveOrderOffline(order) {
    const db = await openDB();
    const transaction = db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    await store.add(order);
}

// Sincronizar pedidos cuando vuelva online
window.addEventListener('online', async () => {
    const db = await openDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const orders = await store.getAll();
    
    for (const order of orders) {
        // Reenviar pedidos pendientes
        console.log('Sincronizando pedido:', order);
        // Aquí iría la lógica para reenviar a WhatsApp/API
    }
});
