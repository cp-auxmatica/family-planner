// --- DATABASE MODULE (db.js) ---
// Handles all interactions with IndexedDB.

const DB_NAME = 'HomeHubDB_v14';
const DB_VERSION = 1;
let db = null;

// Generic request handler to promisify IndexedDB requests
const dbRequest = (storeName, mode, action, ...args) => new Promise((resolve, reject) => {
    if (!db) return reject("Database not initialized.");
    const tx = db.transaction(storeName, mode);
    tx.onerror = event => reject(event.target.error);
    const request = tx.objectStore(storeName)[action](...args);
    if (mode === 'readonly') {
        request.onsuccess = () => resolve(request.result);
    } else {
        tx.oncomplete = () => resolve(request.result || request.source.key);
    }
});

// Initializes the database and creates object stores if needed
export const initDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = e => reject(e.target.error);
    request.onsuccess = e => {
        db = e.target.result;
        resolve(db);
    };
    request.onupgradeneeded = e => {
        db = e.target.result;
        ['tasks', 'stores', 'shoppingLists', 'familyMembers', 'journalEntries'].forEach(name => {
            if (!db.objectStoreNames.contains(name)) {
                db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            }
        });
    };
});

// Exportable object with all database operations
export const dbOperations = {
    add: (storeName, data) => dbRequest(storeName, 'readwrite', 'add', data),
    getAll: (storeName) => dbRequest(storeName, 'readonly', 'getAll'),
    get: (storeName, id) => dbRequest(storeName, 'readonly', 'get', id),
    put: (storeName, data) => dbRequest(storeName, 'readwrite', 'put', data),
};
