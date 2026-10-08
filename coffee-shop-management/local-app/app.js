const categories = ['All drinks', 'Espresso', 'Cold drinks', 'Tea & more'];
const statusFlow = ['Pending', 'Preparing', 'Ready', 'Completed'];
const iconFor = category => ({
    Espresso: '☕',
    'Cold drinks': '🧋',
    'Tea & more': '🍵'
}[category] || '☕');
const money = cents => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const elements = {
    notice: document.querySelector('#notice'),
    menu: document.querySelector('#menu-grid'),
    emptyMenu: document.querySelector('#empty-menu'),
    filters: document.querySelector('#category-filters'),
    search: document.querySelector('#menu-search'),
    cart: document.querySelector('#cart-items'),
    emptyCart: document.querySelector('#empty-cart'),
    cartCount: document.querySelector('#cart-count'),
    cartTotal: document.querySelector('#cart-total'),
    customerName: document.querySelector('#customer-name'),
    checkout: document.querySelector('#checkout-form'),
    checkoutButton: document.querySelector('#checkout-button'),
    pendingCount: document.querySelector('#pending-count'),
    openOrders: document.querySelector('#open-orders'),
    completedOrders: document.querySelector('#completed-orders'),
    salesToday: document.querySelector('#sales-today'),
    ordersCount: document.querySelector('#orders-count'),
    orders: document.querySelector('#orders-list'),
    emptyOrders: document.querySelector('#empty-orders')
};

let products = [];
let selectedCategory = 'All drinks';
let cart = new Map();
let orders = [];
let metrics = { openOrders: 0, completedToday: 0, salesTodayCents: 0 };
let noticeTimeout;
let busy = false;

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
    return body;
}

function notify(message, isError = false) {
    elements.notice.textContent = message;
    elements.notice.classList.toggle('is-error', isError);
    elements.notice.hidden = false;
    window.clearTimeout(noticeTimeout);
    noticeTimeout = window.setTimeout(() => { elements.notice.hidden = true; }, 6500);
}

function renderFilters() {
    elements.filters.innerHTML = categories.map(category => `
        <button class="filter-button${category === selectedCategory ? ' is-active' : ''}" type="button"
            data-category="${escapeHtml(category)}" aria-pressed="${category === selectedCategory}">
            ${escapeHtml(category)}
        </button>`).join('');
}

function renderMenu() {
    const query = elements.search.value.trim().toLowerCase();
    const visible = products.filter(product =>
        (selectedCategory === 'All drinks' || product.category === selectedCategory) &&
        `${product.name} ${product.description || ''} ${product.category}`.toLowerCase().includes(query)
    );
    elements.menu.innerHTML = visible.map(product => {
        const soldOut = product.stock < 1;
        return `<article class="menu-card${soldOut ? ' is-sold-out' : ''}">
            <span class="drink-icon" aria-hidden="true">${iconFor(product.category)}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description || '')}</p>
            <div class="menu-card-bottom">
                <span class="menu-price">${money(product.priceCents)}</span>
                <button class="add-button" type="button" data-add="${product.id}" ${soldOut ? 'disabled' : ''}
                    aria-label="${soldOut ? 'Sold out: ' : 'Add '}${escapeHtml(product.name)}">${soldOut ? 'Sold out' : 'Add +'}</button>
            </div>
            <span class="stock-note${product.stock <= 5 ? ' is-low' : ''}">${product.stock} in stock</span>
        </article>`;
    }).join('');
    elements.emptyMenu.hidden = visible.length > 0;
}

function renderCart() {
    const items = [...cart.values()];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    elements.cartCount.textContent = count;
    elements.cartTotal.textContent = money(total);
    elements.emptyCart.hidden = items.length > 0;
    elements.checkoutButton.disabled = items.length === 0 || busy;
    elements.cart.innerHTML = items.map(item => `
        <div class="cart-line">
            <div><strong>${escapeHtml(item.name)}</strong><div class="cart-line-price">${money(item.priceCents * item.quantity)}</div></div>
            <div class="quantity-controls" aria-label="${escapeHtml(item.name)} quantity">
                <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${escapeHtml(item.name)}">+</button>
            </div>
        </div>`).join('');
}

function renderOrders() {
    elements.pendingCount.textContent = metrics.openOrders;
    elements.openOrders.textContent = metrics.openOrders;
    elements.completedOrders.textContent = metrics.completedToday;
    elements.salesToday.textContent = money(metrics.salesTodayCents);
    elements.ordersCount.textContent = `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`;
    elements.emptyOrders.hidden = orders.length > 0;
    elements.orders.innerHTML = orders.map(order => {
        const detail = order.items.map(item => `${item.quantity} × ${escapeHtml(item.name)}`).join(', ');
        const nextStatus = statusFlow[statusFlow.indexOf(order.status) + 1];
        const nextButton = nextStatus
            ? `<button class="status-button" type="button" data-order="${order.id}" data-status="${nextStatus}">Mark ${nextStatus.toLowerCase()} →</button>`
            : '';
        const cancelButton = order.status === 'Pending'
            ? `<button class="status-button" type="button" data-order="${order.id}" data-status="Cancelled">Cancel</button>`
            : '';
        const createdAt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt));
        return `<article class="order-card">
            <div>
                <div class="order-main"><strong>${escapeHtml(order.customer)}</strong><span class="order-id">${escapeHtml(order.number)}</span><span class="status-pill" data-status="${order.status}">${order.status}</span></div>
                <p class="order-detail">${detail}<br>${createdAt}</p>
            </div>
            <div class="order-actions">${cancelButton}${nextButton}<strong class="order-history-total">${money(order.totalCents)}</strong></div>
        </article>`;
    }).join('');
}

async function refreshData() {
    const [menu, recentOrders, dashboardMetrics] = await Promise.all([
        api('/api/menu'),
        api('/api/orders'),
        api('/api/metrics')
    ]);
    products = menu;
    orders = recentOrders;
    metrics = dashboardMetrics;
    renderMenu();
    renderCart();
    renderOrders();
}

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', async () => {
        const showOrder = button.dataset.view === 'order';
        document.querySelectorAll('.tab-button').forEach(tab => {
            const active = tab === button;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        document.querySelector('#order-view').classList.toggle('is-visible', showOrder);
        document.querySelector('#order-view').hidden = !showOrder;
        document.querySelector('#manage-view').classList.toggle('is-visible', !showOrder);
        document.querySelector('#manage-view').hidden = showOrder;
        try {
            await refreshData();
        } catch (error) {
            notify(error.message, true);
        }
    });
});

elements.filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderFilters();
    renderMenu();
});

elements.search.addEventListener('input', renderMenu);
elements.menu.addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    const product = products.find(item => item.id === Number(button.dataset.add));
    if (!product) return;
    const item = cart.get(product.id);
    if ((item?.quantity || 0) >= product.stock) {
        notify(`Only ${product.stock} ${product.name} available in MySQL inventory.`, true);
        return;
    }
    cart.set(product.id, { ...product, quantity: (item?.quantity || 0) + 1 });
    renderCart();
});

elements.cart.addEventListener('click', event => {
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    const item = cart.get(Number(button.dataset.quantity));
    if (!item) return;
    const change = Number(button.dataset.change);
    if (change > 0 && item.quantity >= item.stock) {
        notify(`Only ${item.stock} ${item.name} available in MySQL inventory.`, true);
        return;
    }
    item.quantity += change;
    if (item.quantity < 1) cart.delete(item.id);
    renderCart();
});

elements.checkout.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    renderCart();
    try {
        const result = await api('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                customerName: elements.customerName.value.trim(),
                items: [...cart.values()].map(item => ({ productId: item.id, quantity: item.quantity }))
            })
        });
        cart.clear();
        elements.checkout.reset();
        await refreshData();
        notify(`Order ${result.orderNumber} saved in your local MySQL database.`);
    } catch (error) {
        notify(error.message, true);
        try { await refreshData(); } catch (refreshError) { notify(refreshError.message, true); }
    } finally {
        busy = false;
        renderCart();
    }
});

elements.orders.addEventListener('click', async event => {
    const button = event.target.closest('[data-order][data-status]');
    if (!button) return;
    button.disabled = true;
    try {
        await api(`/api/orders/${button.dataset.order}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: button.dataset.status })
        });
        await refreshData();
        notify(`Order status updated to ${button.dataset.status}.`);
    } catch (error) {
        notify(error.message, true);
        button.disabled = false;
    }
});

document.querySelector('#refresh-orders').addEventListener('click', async () => {
    try {
        await refreshData();
        notify('Orders and inventory refreshed from MySQL.');
    } catch (error) {
        notify(error.message, true);
    }
});

refreshData().catch(error => {
    notify(`Could not connect to the local MySQL app: ${error.message} Start it with npm start and check your MySQL connection.`, true);
});
