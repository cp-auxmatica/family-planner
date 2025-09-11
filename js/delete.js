// --- MAIN APP MODULE (main.js) ---
// Initializes the app, manages state, and handles events.

import { initDB, dbOperations, seedInitialData } from './db.js';
import { 
    renderDashboard, renderShopping, renderListDetail, renderCalendar, renderJournal,
    renderTaskModal, renderSettingsModal, renderJournalEntryModal
} from './ui.js';
import { formatTime, getTaskIcon } from './utils.js';

// --- GLOBAL STATE & VARIABLES ---
window.appData = {};
window.currentView = 'dashboard';
let calendar;

// --- CORE FUNCTIONS ---

const loadAppData = async () => {
    const stores = ['tasks', 'stores', 'shoppingLists', 'familyMembers', 'journalEntries'];
    const dataPromises = stores.map(s => dbOperations.getAll(s));
    const [tasks, storesData, shoppingLists, familyMembers, journalEntries] = await Promise.all(dataPromises);
    window.appData = { 
        tasks: tasks || [], 
        stores: storesData || [], 
        shoppingLists: shoppingLists || [], 
        familyMembers: familyMembers || [], 
        journalEntries: journalEntries || [] 
    };
};
window.loadAppData = loadAppData; // Expose to UI module

const switchView = (viewName, params = {}) => {
    window.currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== `${viewName}-view`));
    document.getElementById('fab').classList.toggle('hidden', ['list-detail', 'shopping'].includes(viewName));
    document.getElementById('fab').onclick = { 
        'dashboard': () => openModal('add-item-modal'), 
        'journal': () => openModal('journal-entry-modal'), 
        'calendar': () => openModal('add-item-modal') 
    }[viewName] || (() => {});
    
    const renderMap = { 
        'dashboard': renderDashboard, 
        'shopping': renderShopping, 
        'list-detail': () => renderListDetail(params.storeId, window.appData), 
        'calendar': renderCalendar, 
        'journal': renderJournal 
    };
    renderMap[viewName]?.(window.appData);
};
window.switchView = switchView; // Expose to global scope for inline onclicks

const openModal = (modalId, params = {}) => {
    const renderMap = { 
        'settings-modal': renderSettingsModal, 
        'add-item-modal': () => renderTaskModal(params.id), 
        'journal-entry-modal': () => renderJournalEntryModal(params) 
    };
    renderMap[modalId]?.();
    document.getElementById(modalId)?.classList.add('active');
};
window.openModal = openModal;

const closeModal = (modalId) => {
    document.getElementById(modalId)?.classList.remove('active');
};
window.closeModal = closeModal;

const toggleShoppingItem = async (itemId, isChecked) => {
    const item = window.appData.shoppingLists.find(i => i.id === itemId);
    if(item) { 
        item.completed = isChecked; 
        await dbOperations.put('shoppingLists', item);
        // No full reload needed, just a visual update
        const itemElement = document.querySelector(`input[onchange="window.toggleShoppingItem(${itemId}, this.checked)"]`);
        if (itemElement) {
            itemElement.closest('.shopping-item').classList.toggle('completed', isChecked);
        }
    }
};
window.toggleShoppingItem = toggleShoppingItem;

// --- INITIALIZATION ---

const initApp = async () => {
    try {
        await initDB();
        await seedInitialData();
        await loadAppData();
        
        // Setup initial event listeners
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
        document.getElementById('fab').addEventListener('click', () => openModal('add-item-modal'));
        document.getElementById('settings-btn').addEventListener('click', () => openModal('settings-modal'));
        
        switchView('dashboard'); // Start the app on the dashboard
    } catch (error) {
        console.error('Error initializing app:', error);
        document.body.innerHTML = `<div style="padding:2rem;text-align:center;"><h1>Error Loading Application</h1><p>${error.message}</p></div>`;
    }
};

document.addEventListener('DOMContentLoaded', initApp);
