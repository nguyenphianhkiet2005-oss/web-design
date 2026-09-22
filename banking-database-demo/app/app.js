const accounts = [
    { customer: 'Jordan Lee', type: 'Checking', number: '•••• 0001', balance: 2450.00, status: 'Active' },
    { customer: 'Jordan Lee', type: 'Savings', number: '•••• 0002', balance: 8200.00, status: 'Active' },
    { customer: 'Taylor Morgan', type: 'Checking', number: '•••• 0003', balance: 5120.75, status: 'Active' },
    { customer: 'Casey Nguyen', type: 'Checking', number: '•••• 0004', balance: 1875.40, status: 'Active' }
];

const activity = [
    ['Opening deposit', 'Deposit · account 0001', '$2,500.00'],
    ['Payroll deposit', 'Deposit · account 0003', '$5,120.75'],
    ['Demo transfer', 'Transfer · audit recorded', '$125.50']
];

const money = value => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
document.querySelector('#total-assets').textContent = money(accounts.reduce((sum, account) => sum + account.balance, 0));
document.querySelector('#active-accounts').textContent = accounts.length;
document.querySelector('#transaction-count').textContent = activity.length;
document.querySelector('#account-rows').innerHTML = accounts.map(account => `<tr><td>${account.customer}</td><td>${account.type}</td><td>${account.number}</td><td class="amount">${money(account.balance)}</td><td class="badge">${account.status}</td></tr>`).join('');
document.querySelector('#activity-list').innerHTML = activity.map(([title, detail, amount]) => `<div class="activity"><strong>${title}</strong><span>${detail} · ${amount}</span></div>`).join('');