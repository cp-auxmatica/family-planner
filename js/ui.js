// --- UI MODULE (ui.js) ---
// Handles all rendering and direct DOM manipulation.

import { formatTime, getTaskIcon } from './utils.js';
import { dbOperations } from './db.js';
import { loadAppData, switchView } from './main.js';

let calendar;

// --- RENDER VIEWS ---

export const renderDashboard = (appData) => {
    const container = document.getElementById('dashboard-view');
    const today = new Date();
    const allTodayTasks = appData.tasks.filter(t => t.date === today.toISOString().split('T')[0]);
    const timedTasks = allTodayTasks.filter(t => t.time).sort((a,b) => a.time.localeCompare(b.time));
    const dailyTasks = allTodayTasks.filter(t => !t.time);
    const shoppingNeeded = appData.shoppingLists.filter(i => !i.completed).length;

    let todayHtml = `<h2 class="list-header">Today, ${today.toLocaleDateString([],{month:'long', day:'numeric'})}</h2>`;
    if (timedTasks.length > 0) timedTasks.forEach(item => { todayHtml += `<div class="list-item" onclick="window.openModal('add-item-modal', {id:${item.id}})"><i class="list-item-icon fas ${getTaskIcon(item.type)}"></i><span class="list-item-aside">${formatTime(item.time)}</span><span class="list-item-content list-item-title">${item.name}</span>${item.assignee ? `<span class="list-item-assignee">${item.assignee}</span>` : ''}</div>`; });
    else todayHtml += `<div class="list-item"><p class="list-item-subtitle">No timed events scheduled.</p></div>`;
    
    let dailyHtml = `<h2 class="list-header">Daily Activities</h2>`;
    if(shoppingNeeded > 0) dailyHtml += `<div class="list-item" onclick="window.switchView('shopping')"><i class="list-item-icon fas fa-shopping-cart"></i><span class="list-item-content list-item-title">Shopping List</span><span class="list-item-assignee">${shoppingNeeded} needed</span></div>`;
    dailyTasks.forEach(item => { dailyHtml += `<div class="list-item" onclick="window.openModal('add-item-modal', {id:${item.id}})"><i class="list-item-icon fas ${getTaskIcon(item.type)}"></i><span class="list-item-content list-item-title">${item.name}</span>${item.assignee ? `<span class="list-item-assignee">${item.assignee}</span>` : ''}</div>`; });
    if (dailyTasks.length === 0 && shoppingNeeded === 0) dailyHtml += `<div class="list-item"><p class="list-item-subtitle">No daily tasks.</p></div>`;

    container.innerHTML = todayHtml + dailyHtml;
};

export const renderShopping = (appData) => {
    const container = document.getElementById('shopping-view');
    let html = `<div class="view-header"><h1 class="view-title">Shopping</h1></div>`;
    if (appData.stores.length === 0) {
        html += `<div class="list-item"><p class="list-item-subtitle">No stores found. Add one in Settings.</p></div>`;
    } else {
        appData.stores.forEach(store => {
            const items = appData.shoppingLists.filter(i => i.storeId === store.id);
            const itemsNeeded = items.filter(i => !i.completed).length;
            html += `<div class="list-item" onclick="window.switchView('list-detail', { storeId: ${store.id} })"><i class="list-item-icon fas fa-store"></i><div class="list-item-content"><p class="list-item-title">${store.name}</p>${items.length > 0 ? `<p class="list-item-subtitle">${itemsNeeded} of ${items.length} items needed</p>` : `<p class="list-item-subtitle">No items on list</p>`}</div><i class="fas fa-chevron-right"></i></div>`;
        });
    }
    container.innerHTML = html;
};

export const renderListDetail = (storeId, appData) => {
    const container = document.getElementById('list-detail-view');
    const store = appData.stores.find(s => s.id === storeId);
    const items = appData.shoppingLists.filter(i => i.storeId === storeId);
    let html = `<div class="view-header"><button class="btn btn-ghost" onclick="window.switchView('shopping')"><i class="fas fa-arrow-left"></i></button><h1 class="view-title">${store?.name || ''}</h1></div>`;
    if(items.length > 0) items.forEach(item => { html += `<div class="shopping-item ${item.completed ? 'completed' : ''}"><input type="checkbox" class="checkbox" onchange="window.toggleShoppingItem(${item.id}, this.checked)" ${item.completed ? 'checked' : ''}><span class="item-name">${item.name}</span></div>`; });
    else html += `<div class="list-item"><p class="list-item-subtitle">No items in this list yet.</p></div>`;
    html += `<form id="add-item-form" style="display:flex;gap:0.5rem;padding:1rem;background-color:var(--bg-tertiary);border-top:1px solid var(--border);"><input type="text" id="new-item-name" class="form-input" placeholder="Add an item..." required><button type="submit" class="btn btn-primary">Add</button></form>`;
    container.innerHTML = html;

    document.getElementById('add-item-form').addEventListener('submit', async e => {
        e.preventDefault();
        const input = document.getElementById('new-item-name');
        if(!input.value.trim()) return;
        await dbOperations.add('shoppingLists', { storeId, name: input.value.trim(), completed: false });
        await loadAppData();
        renderListDetail(storeId, window.appData);
    });
};

export const renderCalendar = (appData) => {
    const container = document.getElementById('calendar-view');
    container.innerHTML = `<div id="calendar-container" style="background: var(--bg-secondary);"></div>`;
    calendar = new FullCalendar.Calendar(document.getElementById('calendar-container'), {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        events: appData.tasks.filter(t => t.time),
        height: 'auto',
        eventClick: (info) => {
            openModal('add-item-modal', {id: parseInt(info.event.id)})
        }
    });
    calendar.render();
};

export const renderJournal = (appData) => {
    let html = `<div class="view-header"><h1 class="view-title">Journal</h1></div>`;
    if (appData.journalEntries.length === 0) {
        html += `<div class="list-item"><p class="list-item-subtitle">No journal entries yet.</p></div>`;
    } else {
        appData.journalEntries.sort((a,b) => b.date.localeCompare(a.date)).forEach(entry => {
            html += `<div class="list-item" style="display:block;" onclick="window.openModal('journal-entry-modal', {id: ${entry.id}})">
                <p class="list-item-title">${entry.title}</p>
                <p class="list-item-subtitle">${new Date(entry.date+'T00:00:00').toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'})}</p>
                <p style="font-size:0.9rem; margin-top:0.5rem; white-space: normal;">${entry.content}</p>
            </div>`;
        });
    }
    document.getElementById('journal-view').innerHTML = html;
};

// --- RENDER MODALS ---

export const renderTaskModal = async (taskId = null) => {
    const task = taskId ? await dbOperations.get('tasks', taskId) : {};
    const modal = document.getElementById('add-item-modal');
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title">${taskId ? 'Edit Item' : 'New Item'}</h3><button class="btn btn-ghost" onclick="window.closeModal('add-item-modal')"><i class="fas fa-times"></i></button></div><div class="modal-body"><form id="task-form"><input type="hidden" id="task-id" value="${taskId || ''}"><div class="form-group"><label class="form-label">Title</label><input type="text" class="form-input" id="task-name" value="${task?.name || ''}" required></div><div class="form-group"><label class="form-label">Type</label><select class="form-input" id="task-type" required>${['Appointment','Doctor','Dentist','School','Meeting','Work','Chore','Errand'].map(t => `<option value="${t}" ${task?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Assign To</label><select class="form-input" id="task-assignee">${window.appData.familyMembers.map(m => `<option value="${m.name}" ${task?.assignee === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="task-date" value="${task?.date || new Date().toISOString().split('T')[0]}" required></div><div class="form-group"><label class="form-label">Time</label><input type="time" class="form-input" id="task-time" value="${task?.time || ''}"></div></form></div><div class="modal-footer"><button type="button" class="btn btn-outline" onclick="window.openModal('journal-entry-modal', { taskId: ${taskId}, journalId: ${task?.journalEntryId || null} })">Journal</button><div style="flex:1;"></div><button type="button" class="btn btn-outline" onclick="window.closeModal('add-item-modal')">Cancel</button><button type="submit" form="task-form" class="btn btn-primary">Save</button></div></div>`;
    document.getElementById('task-form').addEventListener('submit', async e => {
        e.preventDefault();
        const taskData = { id: parseInt(document.getElementById('task-id').value) || undefined, name: document.getElementById('task-name').value, type: document.getElementById('task-type').value, assignee: document.getElementById('task-assignee').value, date: document.getElementById('task-date').value, time: document.getElementById('task-time').value, journalEntryId: task?.journalEntryId };
        if (taskData.id) await dbOperations.put('tasks', taskData);
        else { delete taskData.id; await dbOperations.add('tasks', taskData); }
        await loadAppData();
        switchView(window.currentView);
        closeModal('add-item-modal');
    });
};

export const renderSettingsModal = () => {
    const container = document.getElementById('settings-modal');
    container.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title">Settings</h3><button class="btn btn-ghost" onclick="window.closeModal('settings-modal')"><i class="fas fa-times"></i></button></div><div class="modal-body"><h4>Family Members</h4><div id="family-members-list" style="margin-top: 1rem;"></div><form id="add-member-form" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;"><input type="text" class="form-input" id="member-name" placeholder="Member Name" required style="flex: 1 1 120px;"><input type="date" class="form-input" id="member-birthday" style="flex: 1 1 120px;" title="Birthday"><button type="submit" class="btn btn-primary">Add</button></form></div></div>`;
    document.getElementById('family-members-list').innerHTML = window.appData.familyMembers.map(m => `<div class="list-item">${m.name} <span class="list-item-subtitle" style="margin-left: auto;">${m.birthday || ''}</span></div>`).join('') || 'No members added.';
    document.getElementById('add-member-form').addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('member-name').value.trim();
        if(!name) return;
        await dbOperations.add('familyMembers', { name, birthday: document.getElementById('member-birthday').value || undefined });
        await loadAppData();
        renderSettingsModal();
    });
};

export const renderJournalEntryModal = async (params = {}) => {
    const { taskId, journalId, id } = params; // id can be passed for direct journal editing
    const effectiveJournalId = journalId || id;
    let entry = effectiveJournalId ? await dbOperations.get('journalEntries', effectiveJournalId) : {};
    const modal = document.getElementById('journal-entry-modal');
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title">${effectiveJournalId ? 'Edit' : 'New'} Journal Entry</h3><button class="btn btn-ghost" onclick="window.closeModal('journal-entry-modal')"><i class="fas fa-times"></i></button></div><div class="modal-body"><form id="journal-form"><div class="form-group"><label class="form-label">Title</label><input type="text" class="form-input" id="journal-title" value="${entry?.title || ''}" required></div><div class="form-group"><label class="form-label">Content</label><textarea class="form-input" id="journal-content" rows="5">${entry?.content || ''}</textarea></div></form></div><div class="modal-footer"><button type="button" class="btn btn-outline" onclick="window.closeModal('journal-entry-modal')">Cancel</button><button type="submit" form="journal-form" class="btn btn-primary">Save</button></div></div>`;
    document.getElementById('journal-form').addEventListener('submit', async e => {
        e.preventDefault();
        const entryData = { id: effectiveJournalId, date: new Date().toISOString().split('T')[0], title: document.getElementById('journal-title').value, content: document.getElementById('journal-content').value };
        const savedJournalId = await dbOperations.put('journalEntries', entryData);
        if (taskId) {
            const task = await dbOperations.get('tasks', taskId);
            if (task) { task.journalEntryId = savedJournalId; await dbOperations.put('tasks', task); }
        }
        await loadAppData();
        if(window.currentView === 'journal') renderJournal();
        closeModal('journal-entry-modal');
    });
};
