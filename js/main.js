// --- MAIN APP MODULE (main.js) ---
// Initializes the app, manages state, and handles all events.

import { initDB, dbOperations, seedInitialData } from './db.js';
import * as UI from './ui.js';

// --- GLOBAL STATE & VARIABLES ---
let appData = {};
let currentView = 'dashboard';

// --- CORE APP LOGIC ---

const loadAppData = async () => {
    const stores = ['tasks', 'stores', 'shoppingLists', 'familyMembers', 'journalEntries'];
    const dataPromises = stores.map(s => dbOperations.getAll(s));
    const [tasks, storesData, shoppingLists, familyMembers, journalEntries] = await Promise.all(dataPromises);
    appData = { 
        tasks: tasks || [], 
        stores: storesData || [], 
        shoppingLists: shoppingLists || [], 
        familyMembers: familyMembers || [], 
        journalEntries: journalEntries || [] 
    };
};

const switchView = (viewName, params = {}) => {
    currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== `${viewName}-view`));
    document.getElementById('fab').classList.toggle('hidden', ['list-detail', 'shopping'].includes(viewName));
    
    const fabActions = { 
        'dashboard': () => openModal('add-item-modal'), 
        'journal': () => openModal('journal-entry-modal'), 
        'calendar': () => openModal('add-item-modal') 
    };
    document.getElementById('fab').onclick = fabActions[viewName] || (() => {});
    
    const renderMap = { 
        'dashboard': UI.renderDashboard, 
        'shopping': UI.renderShopping, 
        'list-detail': () => UI.renderListDetail(params.storeId, appData), 
        'calendar': UI.renderCalendar, 
        'journal': UI.renderJournal 
    };
    renderMap[viewName]?.(appData);
};

const openModal = (modalId, params = {}) => {
    const renderMap = { 
        'settings-modal': UI.renderSettingsModal, 
        'add-item-modal': () => UI.renderTaskModal(params.id, appData), 
        'journal-entry-modal': () => UI.renderJournalEntryModal(params, appData) 
    };
    renderMap[modalId]?.(appData);
    document.getElementById(modalId)?.classList.add('active');
};

const closeModal = (modalId) => {
    document.getElementById(modalId)?.classList.remove('active');
};

const toggleShoppingItem = async (itemId, isChecked) => {
    const item = appData.shoppingLists.find(i => i.id === itemId);
    if(item) { 
        item.completed = isChecked; 
        await dbOperations.put('shoppingLists', item);
        // The visual update is handled by the event listener to avoid a full re-render
    }
};

// --- EVENT HANDLERS (MASTER DELEGATION PATTERN) ---

function masterClickHandler(event) {
    const target = event.target;
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) return;

    const { action, view, modalId, taskId, storeId, journalId } = actionTarget.dataset;

    if (action === 'switch-view') switchView(view, { storeId: parseInt(storeId) });
    if (action === 'open-modal') openModal(modalId, { id: parseInt(taskId), journalId: parseInt(journalId) });
    if (action === 'close-modal') closeModal(modalId);
    if (action === 'toggle-shopping-item') {
        const checkbox = actionTarget;
        toggleShoppingItem(parseInt(checkbox.dataset.itemId), checkbox.checked);
        checkbox.closest('.shopping-item').classList.toggle('completed', checkbox.checked);
    }
}

async function masterSubmitHandler(event) {
    event.preventDefault();
    const form = event.target;

    if (form.id === 'task-form') {
        const taskId = parseInt(form.querySelector('#task-id').value);
        const task = isNaN(taskId) ? {} : await dbOperations.get('tasks', taskId);
        const taskData = {
            id: isNaN(taskId) ? undefined : taskId,
            name: form.querySelector('#task-name').value,
            type: form.querySelector('#task-type').value,
            assignee: form.querySelector('#task-assignee').value,
            date: form.querySelector('#task-date').value,
            time: form.querySelector('#task-time').value,
            journalEntryId: task.journalEntryId || null
        };
        await dbOperations.put('tasks', taskData);
        await loadAppData();
        switchView(currentView);
        closeModal('add-item-modal');
    }

    if (form.id === 'add-member-form') {
        const name = form.querySelector('#member-name').value.trim();
        if (!name) return;
        await dbOperations.add('familyMembers', { name, birthday: form.querySelector('#member-birthday').value || undefined });
        await loadAppData();
        UI.renderSettingsModal(appData); // Re-render just the modal content
    }
    
    if (form.id === 'add-list-form') {
        const storeName = form.querySelector('#new-store-name').value.trim();
        if(!storeName) return;
        let store = appData.stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());
        const storeId = store ? store.id : await dbOperations.add('stores', { name: storeName });
        await loadAppData();
        switchView('list-detail', { storeId });
    }

    if (form.id === 'add-item-form') {
        const input = form.querySelector('#new-item-name');
        const storeId = parseInt(form.dataset.storeId);
        if(!input.value.trim() || isNaN(storeId)) return;
        await dbOperations.add('shoppingLists', { storeId, name: input.value.trim(), completed: false });
        await loadAppData();
        UI.renderListDetail(storeId, appData);
    }

    if (form.id === 'journal-form') {
        const entryData = {
            id: parseInt(form.dataset.journalId) || undefined,
            date: new Date().toISOString().split('T')[0],
            title: form.querySelector('#journal-title').value,
            content: form.querySelector('#journal-content').value
        };
        const savedJournalId = await dbOperations.put('journalEntries', entryData);
        
        const taskId = parseInt(form.dataset.taskId);
        if (taskId) {
            const task = await dbOperations.get('tasks', taskId);
            if(task) { task.journalEntryId = savedJournalId; await dbOperations.put('tasks', task); }
        }
        await loadAppData();
        if(currentView === 'journal') UI.renderJournal(appData);
        closeModal('journal-entry-modal');
    }
}

// --- INITIALIZATION ---
const initApp = async () => {
    try {
        await initDB();
        await seedInitialData();
        await loadAppData();
        
        // Centralized event listeners
        document.addEventListener('click', masterClickHandler);
        document.addEventListener('submit', masterSubmitHandler);
        
        switchView('dashboard');
    } catch (error) {
        console.error('Error initializing app:', error);
        document.body.innerHTML = `<div style="padding:2rem;text-align:center;"><h1>Error Loading Application</h1><p>${error.message}</p></div>`;
    }
};

document.addEventListener('DOMContentLoaded', initApp);
