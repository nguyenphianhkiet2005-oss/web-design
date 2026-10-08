const products = [
    { id: 'espresso', name: 'House espresso', category: 'Espresso', description: 'A rich, balanced double shot.', price: 3.25, icon: '☕' },
    { id: 'latte', name: 'Vanilla latte', category: 'Espresso', description: 'Espresso, steamed milk, vanilla.', price: 5.25, icon: '🥛' },
    { id: 'cappuccino', name: 'Cappuccino', category: 'Espresso', description: 'Espresso under soft milk foam.', price: 4.75, icon: '☕' },
    { id: 'mocha', name: 'Dark mocha', category: 'Espresso', description: 'Chocolate, espresso, silky milk.', price: 5.5, icon: '🍫' },
    { id: 'cold-brew', name: 'Slow cold brew', category: 'Cold drinks', description: 'Smooth, steeped overnight.', price: 4.5, icon: '🧋' },
    { id: 'matcha', name: 'Iced matcha', category: 'Cold drinks', description: 'Bright matcha with oat milk.', price: 5.75, icon: '🍵' },
    { id: 'chai', name: 'Spiced chai', category: 'Tea & more', description: 'Black tea with warming spices.', price: 4.25, icon: '🫖' },
    { id: 'lemonade', name: 'House lemonade', category: 'Tea & more', description: 'Fresh lemon, a little sweetness.', price: 3.75, icon: '🍋' }
];

const storageKey = 'daily-grind-demo-orders-v1';
const statuses = ['Pending', 'Preparing', 'Ready', 'Completed'];
const categories = ['All drinks', ...new Set(products.map(product => product.category))];
const money = value => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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

let selectedCategory = 'All drinks';
let cart = new Map();
let orders = [];
let noticeTimer;

function showNotice(message) {
    elements.notice.textContent = message;
    elements.notice.hidden = false;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => { elements.notice.hidden = true; }, 5000);
}

function loadOrders() {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some(order =>
        !order || typeof order.id !== 'string' || typeof order.customer !== 'string' ||
        !order.customer.trim() || !Array.isArray(order.items) ||
        order.items.some(item => !item || typeof item.id !== 'string' ||
            typeof item.name !== 'string' || !Number.isInteger(item.quantity) ||
            item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0) ||
        !Number.isFinite(order.total) || order.total < 0 ||
        !['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].includes(order.status) ||
        !Number.isFinite(Date.parse(order.createdAt))
    )) {
        throw new Error('Saved demo orders have an unexpected format.');
    }
    return parsed;
}

function saveOrders(nextOrders) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(nextOrders));
        orders = nextOrders;
        renderDashboard();
        return true;
    } catch (error) {
        showNotice(`Could not save your orders in this browser: ${error.message}`);
        return false;
    }
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
    const visibleProducts = products.filter(product =>
        (selectedCategory === 'All drinks' || product.category === selectedCategory) &&
        `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query)
    );
    elements.menu.innerHTML = visibleProducts.map(product => `
        <article class="menu-card">
            <span class="drink-icon" aria-hidden="true">${product.icon}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="menu-card-bottom">
                <span class="menu-price">${money(product.price)}</span>
                <button class="add-button" type="button" data-add="${product.id}" aria-label="Add ${escapeHtml(product.name)} to order">Add +</button>
            </div>
        </article>`).join('');
    elements.emptyMenu.hidden = visibleProducts.length > 0;
}

function renderCart() {
    const items = [...cart.values()];
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    elements.cartCount.textContent = quantity;
    elements.cartTotal.textContent = money(total);
    elements.emptyCart.hidden = items.length > 0;
    elements.checkoutButton.disabled = items.length === 0;
    elements.cart.innerHTML = items.map(item => `
        <div class="cart-line">
            <div><strong>${escapeHtml(item.name)}</strong><div class="cart-line-price">${money(item.price * item.quantity)}</div></div>
            <div class="quantity-controls" aria-label="${escapeHtml(item.name)} quantity">
                <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${escapeHtml(item.name)}">+</button>
            </div>
        </div>`).join('');
}

function dateLabel(value) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderDashboard() {
    const open = orders.filter(order => ['Pending', 'Preparing', 'Ready'].includes(order.status));
    const completed = orders.filter(order =>
        order.status === 'Completed' && new Date(order.createdAt).toDateString() === new Date().toDateString()
    );
    elements.pendingCount.textContent = open.length;
    elements.openOrders.textContent = open.length;
    elements.completedOrders.textContent = completed.length;
    elements.salesToday.textContent = money(completed.reduce((sum, order) => sum + order.total, 0));
    elements.ordersCount.textContent = `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`;
    elements.emptyOrders.hidden = orders.length > 0;
    elements.orders.innerHTML = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(order => {
        const detail = order.items.map(item => `${item.quantity} × ${escapeHtml(item.name)}`).join(', ');
        const nextStatus = statuses[statuses.indexOf(order.status) + 1];
        const action = nextStatus
            ? `<button class="status-button" type="button" data-order="${escapeHtml(order.id)}" data-status="${nextStatus}">Mark ${nextStatus.toLowerCase()} →</button>`
            : '';
        const cancel = order.status === 'Pending'
            ? `<button class="status-button" type="button" data-order="${escapeHtml(order.id)}" data-status="Cancelled">Cancel</button>`
            : '';
        return `<article class="order-card">
            <div>
                <div class="order-main"><strong>${escapeHtml(order.customer)}</strong><span class="order-id">${escapeHtml(order.id)}</span><span class="status-pill" data-status="${order.status}">${order.status}</span></div>
                <p class="order-detail">${detail}<br>${dateLabel(order.createdAt)}</p>
            </div>
            <div class="order-actions">${cancel}${action}<strong>${money(order.total)}</strong></div>
        </article>`;
    }).join('');
}

function addToCart(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    const current = cart.get(productId);
    cart.set(productId, { ...product, quantity: (current?.quantity ?? 0) + 1 });
    renderCart();
}

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const isOrderView = button.dataset.view === 'order';
        document.querySelectorAll('.tab-button').forEach(tab => {
            const active = tab === button;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        document.querySelector('#order-view').classList.toggle('is-visible', isOrderView);
        document.querySelector('#order-view').hidden = !isOrderView;
        document.querySelector('#manage-view').classList.toggle('is-visible', !isOrderView);
        document.querySelector('#manage-view').hidden = isOrderView;
    });
});

elements.filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderFilters();
    renderMenu();
});

elements.menu.addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (button) addToCart(button.dataset.add);
});

elements.search.addEventListener('input', renderMenu);

elements.cart.addEventListener('click', event => {
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    const item = cart.get(button.dataset.quantity);
    if (!item) return;
    item.quantity += Number(button.dataset.change);
    if (item.quantity < 1) cart.delete(item.id);
    renderCart();
});

elements.checkout.addEventListener('submit', event => {
    event.preventDefault();
    const customer = elements.customerName.value.trim();
    if (!customer || cart.size === 0) return;
    const items = [...cart.values()].map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = {
        id: `DG-${Date.now().toString(36).toUpperCase()}`,
        customer,
        items,
        total,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };
    if (!saveOrders([order, ...orders])) return;
    cart.clear();
    elements.checkout.reset();
    renderCart();
    showNotice(`Pickup order ${order.id} is in. Thanks, ${customer}!`);
});

elements.orders.addEventListener('click', event => {
    const button = event.target.closest('[data-order][data-status]');
    if (!button) return;
    const order = orders.find(item => item.id === button.dataset.order);
    if (!order) return;
    const allowed = button.dataset.status === 'Cancelled'
        ? order.status === 'Pending'
        : statuses[statuses.indexOf(order.status) + 1] === button.dataset.status;
    if (!allowed) {
        showNotice('That order status change is no longer available. Refresh the dashboard and try again.');
        return;
    }
    saveOrders(orders.map(item => item.id === order.id ? { ...item, status: button.dataset.status } : item));
});

document.querySelector('#clear-orders').addEventListener('click', () => {
    if (!orders.length) {
        showNotice('There are no demo orders to clear.');
        return;
    }
    if (!window.confirm('Clear all demo orders saved in this browser? This cannot be undone.')) return;
    if (saveOrders([])) showNotice('Demo orders cleared from this browser.');
});

try {
    orders = loadOrders();
} catch (error) {
    showNotice(`Could not load saved demo orders: ${error.message} You can clear them from the order dashboard.`);
}
renderFilters();
renderMenu();
renderCart();
renderDashboard();
