(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/frontend/src/lib/api.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adminAPI",
    ()=>adminAPI,
    "analyticsAPI",
    ()=>analyticsAPI,
    "authAPI",
    ()=>authAPI,
    "default",
    ()=>__TURBOPACK__default__export__,
    "orgAPI",
    ()=>orgAPI,
    "qrAPI",
    ()=>qrAPI,
    "teamAPI",
    ()=>teamAPI,
    "trackAPI",
    ()=>trackAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/frontend/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
// ============================================
// lib/api.js - API Client
// ============================================
// Main tool for communicating with backend
// Token is automatically added to headers
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/axios/lib/axios.js [client] (ecmascript)");
;
const API_URL = ("TURBOPACK compile-time value", "http://localhost:5000/api") || 'http://localhost:5000/api';
// ====== Axios Instance ======
const api = __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});
// ====== Request Interceptor: Add Token ======
api.interceptors.request.use((config)=>{
    // Only runs in browser
    if ("TURBOPACK compile-time truthy", 1) {
        const token = localStorage.getItem('qr_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error)=>Promise.reject(error));
// ====== Response Interceptor: Handle Errors ======
api.interceptors.response.use((response)=>response, (error)=>{
    if (error.response) {
        // 401 = Token expired → Logout
        if (error.response.status === 401) {
            if ("TURBOPACK compile-time truthy", 1) {
                localStorage.removeItem('qr_token');
                localStorage.removeItem('qr_user');
                // Redirect to login page (if not already there)
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }
    }
    return Promise.reject(error);
});
const authAPI = {
    register: (data)=>api.post('/auth/register', data),
    login: (data)=>api.post('/auth/login', data),
    getMe: ()=>api.get('/auth/me'),
    updateProfile: (data)=>api.put('/auth/me', data),
    changePassword: (data)=>api.put('/auth/change-password', data),
    logout: ()=>api.post('/auth/logout'),
    deleteAccount: (data)=>api.delete('/auth/me', {
            data
        }),
    exportMyData: ()=>api.get('/auth/me/export')
};
const qrAPI = {
    generate: (data)=>api.post('/qr/generate', data),
    generateCustom: (data)=>api.post('/qr/generate-custom', data),
    bulkGenerate: (data)=>api.post('/qr/bulk-generate', data),
    getMyQRCodes: (page = 1)=>api.get(`/qr/my-codes?page=${page}`),
    getQRCode: (qrId)=>api.get(`/qr/${qrId}`),
    activate: (qrId, data)=>api.put(`/qr/${qrId}/activate`, data),
    deactivate: (qrId)=>api.put(`/qr/${qrId}/deactivate`),
    delete: (qrId)=>api.delete(`/qr/${qrId}`),
    downloadUrl: (qrId)=>`${API_URL}/qr/${qrId}/download`
};
const teamAPI = {
    create: (data)=>api.post('/teams/create', data),
    getMyTeams: ()=>api.get('/teams/my'),
    getTeam: (teamId)=>api.get(`/teams/${teamId}`),
    join: (inviteCode)=>api.post('/teams/join', {
            inviteCode
        }),
    leave: (teamId)=>api.post(`/teams/${teamId}/leave`),
    removeMember: (teamId, userId)=>api.delete(`/teams/${teamId}/members/${userId}`),
    getTeamQRCodes: (teamId)=>api.get(`/teams/${teamId}/qr-codes`),
    delete: (teamId)=>api.delete(`/teams/${teamId}`)
};
const trackAPI = {
    getScanInfo: (qrId)=>api.get(`/track/scan-info/${qrId}`),
    submitScan: (qrId, locationData)=>api.post(`/track/scan/${qrId}`, locationData),
    viewLocations: (data)=>api.post('/track/view', data)
};
const adminAPI = {
    getStats: ()=>api.get('/admin/stats'),
    getUsers: (page = 1, search = '')=>api.get(`/admin/users?page=${page}&search=${search}`),
    deactivateUser: (id)=>api.put(`/admin/users/${id}/deactivate`),
    getAllQRCodes: (page = 1)=>api.get(`/admin/qr-codes?page=${page}`),
    deleteQR: (qrId)=>api.delete(`/admin/qr/${qrId}`)
};
const analyticsAPI = {
    getDashboard: ()=>api.get('/analytics/dashboard')
};
const orgAPI = {
    create: (data)=>api.post('/org', data),
    getAll: ()=>api.get('/org'),
    getOne: (id)=>api.get(`/org/${id}`),
    update: (id, data)=>api.put(`/org/${id}`, data),
    delete: (id)=>api.delete(`/org/${id}`),
    sharedAccess: (data)=>api.post('/org/shared/access', data),
    // Groups
    createGroup: (orgId, data)=>api.post(`/org/${orgId}/groups`, data),
    getGroup: (groupId)=>api.get(`/org/groups/${groupId}`),
    updateGroup: (groupId, data)=>api.put(`/org/groups/${groupId}`, data),
    deleteGroup: (groupId)=>api.delete(`/org/groups/${groupId}`),
    // Members
    addMember: (groupId, data)=>api.post(`/org/groups/${groupId}/members`, data),
    addMembers: (groupId, data)=>api.post(`/org/groups/${groupId}/members/bulk`, data),
    updateMember: (memberId, data)=>api.put(`/org/members/${memberId}`, data),
    removeMember: (memberId)=>api.delete(`/org/members/${memberId}`),
    // Attendance
    getGroupForScan: (groupId)=>api.get(`/org/attendance/scan/${groupId}`),
    markAttendance: (groupId, data)=>api.post(`/org/attendance/mark/${groupId}`, data),
    getAttendance: (groupId, date)=>api.get(`/org/attendance/${groupId}${date ? `?date=${date}` : ''}`),
    updateAttendance: (groupId, data)=>api.put(`/org/attendance/${groupId}`, data),
    lockAttendance: (groupId, data)=>api.post(`/org/attendance/${groupId}/lock`, data),
    getReport: (groupId, startDate, endDate)=>api.get(`/org/attendance/${groupId}/report?startDate=${startDate}&endDate=${endDate}`)
};
const __TURBOPACK__default__export__ = api;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/lib/socket.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectSocket",
    ()=>connectSocket,
    "disconnectSocket",
    ()=>disconnectSocket,
    "getSocket",
    ()=>getSocket,
    "joinQRTracking",
    ()=>joinQRTracking,
    "joinUserRoom",
    ()=>joinUserRoom,
    "leaveQRTracking",
    ()=>leaveQRTracking,
    "onLiveLocation",
    ()=>onLiveLocation,
    "onNewScan",
    ()=>onNewScan,
    "onScanAlert",
    ()=>onScanAlert
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/frontend/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
// ============================================
// lib/socket.js - Socket.io Client
// ============================================
// WebSocket connection for real-time updates
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/socket.io-client/build/esm/index.js [client] (ecmascript) <locals>");
;
const SOCKET_URL = ("TURBOPACK compile-time value", "http://localhost:5000") || 'http://localhost:5000';
let socket = null;
const connectSocket = ()=>{
    if (socket?.connected) return socket;
    socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(SOCKET_URL, {
        transports: [
            'websocket',
            'polling'
        ],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000
    });
    socket.on('connect', ()=>{
        console.log('🔌 Socket connected:', socket.id);
    });
    socket.on('disconnect', (reason)=>{
        console.log('🔌 Socket disconnected:', reason);
    });
    socket.on('connect_error', (err)=>{
        console.warn('🔌 Socket error:', err.message);
    });
    return socket;
};
const getSocket = ()=>{
    if (!socket) return connectSocket();
    return socket;
};
const disconnectSocket = ()=>{
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
const joinUserRoom = (userId)=>{
    const s = getSocket();
    s.emit('join_user', userId);
};
const joinQRTracking = (qrId)=>{
    const s = getSocket();
    s.emit('join_qr_tracking', qrId);
};
const leaveQRTracking = (qrId)=>{
    const s = getSocket();
    s.emit('leave_qr_tracking', qrId);
};
const onScanAlert = (callback)=>{
    const s = getSocket();
    s.on('qr_scanned', callback);
    return ()=>s.off('qr_scanned', callback);
};
const onNewScan = (callback)=>{
    const s = getSocket();
    s.on('new_scan', callback);
    return ()=>s.off('new_scan', callback);
};
const onLiveLocation = (callback)=>{
    const s = getSocket();
    s.on('live_location', callback);
    return ()=>s.off('live_location', callback);
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/lib/translations.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LANGUAGES",
    ()=>LANGUAGES,
    "default",
    ()=>__TURBOPACK__default__export__,
    "detectLanguage",
    ()=>detectLanguage,
    "getTranslation",
    ()=>getTranslation
]);
// ============================================
// lib/translations.js - Multi-Language Support
// ============================================
// Hindi, English + auto-detect
// Aur languages add karna ho toh neeche object mein add karo
const translations = {
    // ══════════════════════════════════════════
    // ENGLISH
    // ══════════════════════════════════════════
    en: {
        lang: 'English',
        flag: '🇬🇧',
        // ── Common / Nav ──
        home: 'Home',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        dashboard: 'Dashboard',
        generate: 'Generate QR',
        track: 'Track Location',
        teams: 'Teams',
        profile: 'Profile',
        pricing: 'Pricing',
        scanner: 'Scanner',
        settings: 'Settings',
        back: 'Back',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        confirm: 'Confirm',
        loading: 'Loading...',
        submit: 'Submit',
        download: 'Download',
        print: 'Print',
        copy: 'Copy',
        share: 'Share',
        search: 'Search',
        noData: 'No data found',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        // ── Auth ──
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        name: 'Name',
        phone: 'Phone Number',
        forgotPassword: 'Forgot Password?',
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: 'Already have an account?',
        loginBtn: 'Login',
        registerBtn: 'Register',
        loginSuccess: 'Login successful!',
        registerSuccess: 'Account created successfully!',
        loginRequired: 'Login Required',
        loginToAccess: 'Please login to access this feature',
        signInToAccount: 'Sign in to your account',
        createAccount: 'Create your account',
        enterBothFields: 'Please enter both email and password',
        loginFailed: 'Login failed',
        // ── Home ──
        heroTitle: 'QR Code Tracking System',
        heroSubtitle: 'Track anything, anywhere with QR codes',
        getStarted: 'Get Started',
        features: 'Features',
        howItWorks: 'How It Works',
        // ── Dashboard ──
        myQRCodes: 'My QR Codes',
        adminPanel: 'Admin Panel',
        totalQR: 'Total QR',
        active: 'Active',
        inactive: 'Inactive',
        totalScans: 'Total Scans',
        noQRCodes: 'No QR Codes created yet',
        createFirstQR: 'Create First QR',
        newQR: 'New QR',
        currentPlan: 'Current Plan',
        qrCodesUsed: 'QR Codes used',
        upgradeForMore: 'Upgrade for more QR codes & notifications',
        deleteConfirm: 'Are you sure you want to delete this QR? This cannot be undone.',
        qrDeleted: 'QR Code deleted',
        // ── Generate ──
        generateQR: 'Generate QR Code',
        category: 'Category',
        child: 'Child',
        car: 'Car',
        bag: 'Bag',
        pet: 'Pet',
        key: 'Key',
        luggage: 'Luggage',
        other: 'Other',
        ownerMessage: 'Owner Message (Optional)',
        ownerMessageHint: 'Message for finder (e.g., please return)',
        setPassword: 'Set Password',
        passwordHint: 'Remember this password — you need it to track location',
        qrGenerated: 'QR Code generated!',
        generateBtn: 'Generate QR Code',
        // ── Custom QR ──
        customQR: 'Custom QR Design',
        chooseColors: 'Choose your colors',
        colorPresets: 'Color Presets',
        customColors: 'Custom Colors',
        darkColor: 'Dark Color',
        lightColor: 'Light/BG Color',
        size: 'Size',
        customQRReady: 'Custom QR Ready!',
        // ── Bulk Generate ──
        bulkGenerate: 'Bulk QR Generate',
        howManyQR: 'How many QR Codes?',
        defaultCategory: 'Default Category',
        prefix: 'QR ID Prefix (Optional)',
        prefixHint: 'No prefix = default format: QR-XXXXXX',
        generateBulk: 'Generate QR Codes',
        downloadAll: 'Download All',
        printAll: 'Print All',
        qrCodesReady: 'QR Codes Ready',
        // ── Track ──
        trackLocation: 'Track Location',
        trackSubtitle: 'Enter QR Number + Password to view location',
        qrCodeNumber: 'QR Code Number',
        viewLocation: 'View Location',
        searching: 'Searching...',
        lastSeenLocation: 'Last Seen Location',
        noGPSYet: 'No GPS Location Yet',
        noGPSDesc: 'QR code was scanned but GPS location was not available. IP-based location may be available in scan history.',
        scanHistory: 'Scan History',
        noScanHistory: 'No scan history',
        latest: 'Latest',
        approximate: 'Approximate',
        cities: 'Cities',
        countries: 'Countries',
        scans: 'Scans',
        fullMap: 'Full Map',
        justNow: 'Just now',
        minAgo: 'min ago',
        hoursAgo: 'hours ago',
        yesterday: 'Yesterday',
        daysAgo: 'days ago',
        locationHint: 'QR code scanned anywhere — last seen location will show here',
        // ── Scan Page ──
        qrTracker: 'QR Tracker',
        qrCheckingInfo: 'Checking QR Code...',
        locationCaptureStarted: 'Location capture started (IP-based)',
        locationCaptured: 'Location Captured!',
        qrCodeOf: "'s QR code",
        ownerMessageLabel: "Owner's message:",
        ipLocationCaptured: 'IP Location Captured',
        scanLogSaved: 'Scan log saved',
        gpsLocationCaptured: 'GPS Location Captured (Exact)',
        gpsCapturing: 'GPS capture in progress...',
        gpsNotAvailable: 'GPS not available — IP location being used',
        gpsDoneDesc: 'Owner will see exact GPS location',
        gpsDeniedDesc: 'GPS denied or timed out — IP location is sufficient',
        gpsCapturingDesc: 'Allow permission if prompted',
        locationCapturedEvenOnError: 'Your location has been captured!',
        ownerWillSeeIP: 'Owner will see IP-based location',
        // ── Activation ──
        qrInactive: 'QR Code Inactive — Register it',
        qrNotRegistered: 'This QR code is not registered yet. Fill the form below to activate tracking.',
        yourName: 'Your Name',
        namePlaceholder: 'e.g., Rahul Sharma',
        phonePlaceholder: '+91 98765 43210',
        messageForFinder: 'Message for finder',
        setPasswordLabel: 'Set Password',
        passwordForTracking: 'Password to view tracking',
        confirmPasswordLabel: 'Confirm Password',
        reenterPassword: 'Re-enter password',
        activateQR: 'Activate QR Code',
        activating: 'Activating...',
        activationConsent: 'By activating, you consent to GPS location tracking',
        qrActivated: 'QR Activated!',
        qrActivatedDesc: 'QR Code is now active! Tracking has started.',
        activatedInfo1: 'Anyone who scans this QR code will have their location captured',
        activatedInfo2: 'Use the password you set to view the location',
        activatedInfo3: 'Print the QR code and attach it — tracking will remain active',
        nameRequired: 'Name is required',
        phoneRequired: 'Phone number is required',
        passwordMinLength: 'Password must be at least 4 characters',
        passwordsNoMatch: 'Passwords do not match',
        passwordMin4: 'Password must be at least 4 characters',
        passwordMismatch: 'Passwords do not match',
        activationSuccess: 'QR Code activated! Tracking has started.',
        activationFailed: 'Activation failed. Please try again.',
        activationForm: 'Activation Form',
        enterFullName: 'Enter your full name',
        setTrackingPassword: 'Set a tracking password',
        passwordReminder: 'Remember this password — you will need it to view locations',
        reenterPassword: 'Re-enter password',
        dataSecure: 'Your data is encrypted and secure',
        pleaseWait: 'Please wait...',
        ownerNotified: 'Owner has been notified',
        approximateLocation: 'Approximate location captured',
        exactLocation: 'Exact GPS location captured',
        ipLocationUsed: 'IP-based location is being used',
        waitingForGPS: 'Waiting for GPS signal...',
        gpsNotAvailable: 'GPS not available',
        passwordSet: 'Password has been set for tracking',
        trackingActive: 'Tracking is now active',
        locationSavedAnyway: 'Location was still captured via IP',
        security: 'Security',
        // ── QR Display ──
        qrCode: 'QR Code',
        activeTrackingOn: 'ACTIVE — Tracking On',
        inactivePrintToActivate: 'INACTIVE — Print to Activate',
        howToUse: 'How to Use:',
        howToUseStep1: 'Download the QR code below',
        howToUseStep2: 'Print it and attach to your item',
        howToUseStep3: 'Someone scans with phone → fills form to activate',
        howToUseStep4: 'Tracking starts! View location with password',
        downloadPNG: 'Download PNG',
        highQuality: 'High Quality 1024px',
        printReady: 'Print-ready format',
        mapView: 'Map View',
        viewScanLocations: 'View scan locations',
        passwordTracking: 'Password tracking',
        // ── Map ──
        mapViewTitle: 'Map View',
        qrPassword: 'QR Password',
        enterPassword: 'Enter password',
        viewMap: 'View Map',
        goToTrack: 'Go to Track Page',
        scanLocations: 'scan locations',
        live: 'LIVE',
        locations: 'locations',
        noGPSLocations: 'No GPS locations found',
        mapWillShowWhenScanned: 'When QR is scanned with GPS, it will appear on map',
        unknownCity: 'Unknown City',
        // ── Teams ──
        createTeam: 'Create Team',
        joinTeam: 'Join Team',
        teamName: 'Team Name',
        teamNamePlaceholder: 'e.g., Family Tracking, Office QR',
        teamDescription: 'Description (Optional)',
        teamDescPlaceholder: 'Write something about the team?',
        createBtn: 'Create Team',
        creating: 'Creating...',
        teamCreated: 'Team created!',
        inviteCode: 'Team Invite Code',
        shareInviteCode: 'Share this code so others can join the team',
        members: 'Members',
        leaveTeam: 'Leave Team',
        leaveConfirm: 'Leave this team?',
        teamLeft: 'Left the team',
        noTeams: 'No teams yet',
        createOrJoin: 'Create a team or join with an invite code',
        joinBtn: 'Join Team',
        joining: 'Joining...',
        inviteCodePlaceholder: 'TEAM-XXXXXXXX',
        friendSharedCode: 'Enter the invite code shared by your friend',
        teamQRCodes: 'Team QR Codes',
        noTeamQRCodes: 'No QR codes from team members',
        owner: 'OWNER',
        member: 'MEMBER',
        admin: 'ADMIN',
        viewer: 'VIEWER',
        // ── Profile ──
        editProfile: 'Edit Profile',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        planInfo: 'Plan Information',
        free: 'Free',
        basic: 'Basic',
        pro: 'Pro',
        enterprise: 'Enterprise',
        // ── Pricing ──
        choosePlan: 'Choose a Plan',
        monthly: 'Monthly',
        perMonth: '/month',
        currentPlanBadge: 'Current Plan',
        selectPlan: 'Select Plan',
        popular: 'Popular',
        // ── Scanner ──
        scanQRCode: 'Scan QR Code',
        startCamera: 'Start Camera',
        stopCamera: 'Stop Camera',
        orEnterManually: 'Or enter QR code manually',
        enterQRId: 'Enter QR ID',
        goToScan: 'Go to Scan',
        // ── Admin ──
        totalUsers: 'Total Users',
        activeQR: 'Active QR',
        revenue: 'Revenue',
        premiumUsers: 'Premium Users',
        categoryDistribution: 'Category Distribution',
        recentUsers: 'Recent Users',
        recentScans: 'Recent Scans (All Users)',
        // ── Export ──
        exportCSV: 'Export CSV',
        exportJSON: 'Export JSON',
        // ── Errors ──
        serverError: 'Could not connect to server. Please try again.',
        qrNotFound: 'QR Code Not Found',
        incorrectPassword: 'Incorrect password. Please try again.',
        limitReached: 'QR code limit reached. Upgrade your plan.',
        networkError: 'Network error',
        // ── Additional/Missing Keys ──
        accountCreated: 'Account created',
        activateBtn: 'Activate',
        activateDesc: 'Activate QR Code description',
        activateTitle: 'Activate your QR Code',
        activated: 'QR Code activated!',
        backToHome: 'Back to Home',
        bulkGenerateDesc: 'Generate multiple QR codes at once',
        changing: 'Changing...',
        connectionError: 'Connection error',
        created: 'Created',
        current: 'Current',
        customColor: 'Custom Color',
        customQRDesc: 'Design your own QR code with custom colors',
        customQRTitle: 'Custom QR Code Design',
        dashboardDesc: 'Manage all your QR codes',
        deactivate: 'Deactivate',
        deactivateSuccess: 'QR Code deactivated successfully',
        deleteFailed: 'Failed to delete QR code',
        deleteSuccess: 'QR code deleted successfully',
        details: 'Details',
        device: 'Device',
        document: 'Document',
        downloadFailed: 'Download failed',
        downloadQR: 'Download QR',
        downloadSuccess: 'Downloaded successfully',
        downloading: 'Downloading...',
        edit: 'Edit',
        electronic: 'Electronics',
        emailPlaceholder: 'your@email.com',
        emptyFieldsError: 'Please fill in all required fields',
        enterInviteCode: 'Enter team invite code',
        enterName: 'Enter your name',
        enterpriseFeatures: 'Enterprise Features',
        example: 'Example',
        feature1Desc: 'Real-time location tracking with GPS',
        feature1Title: 'Real-Time Tracking',
        feature2Desc: 'Track multiple items simultaneously',
        feature2Title: 'Multiple QR Codes',
        feature3Desc: 'Collaborate with team members',
        feature3Title: 'Team Management',
        feature4Desc: 'Detailed analytics and insights',
        feature4Title: 'Analytics Dashboard',
        freeFeatures: 'Free Features',
        fullName: 'Full Name',
        generateAnother: 'Generate Another',
        generateNew: 'Generate New',
        generateQRDesc: 'Generate a QR code to track your items',
        generateSubtitle: 'Generate your first QR code',
        generateTitle: 'Generate QR Code',
        generating: 'Generating QR code',
        generationFailed: 'Failed to generate QR code',
        getStartedDesc: 'Start tracking your items with QR codes',
        googleMaps: 'Google Maps',
        gps: 'GPS',
        gpsAttempting: 'Attempting to capture GPS location...',
        gpsCaptured: 'GPS location captured',
        gpsUpdated: 'GPS location updated',
        haveAccount: 'Already have an account?',
        heroDesc: 'Never lose your items again. Track them in real-time using QR codes.',
        instructions: 'Instructions',
        ip: 'IP Location',
        ipCaptured: 'IP location captured',
        join_qr_tracking: 'Join QR Tracking',
        lastLocation: 'Last Location',
        limit: 'Limit',
        liveAlerts: 'Live Alerts',
        liveMap: 'Live Map',
        liveTracking: 'Live Tracking',
        loadMore: 'Load More',
        loadingError: 'Error loading data',
        locationDataReceived: 'Location data received',
        loginHere: 'Login here',
        loginSubtitle: 'Sign in to your account',
        loginTitle: 'Welcome Back',
        loginToGenerate: 'You need to login to generate QR codes',
        maps: 'Maps',
        memberSince: 'Member since',
        message: 'Message',
        messagePlaceholder: 'Enter your message here',
        min6Chars: 'Minimum 6 characters',
        minCharacters: 'Minimum characters required',
        minutesAgo: 'minutes ago',
        more: 'More',
        myTeams: 'My Teams',
        nameEmailPasswordRequired: 'Name, email, and password are required',
        nameOfItem: 'Name of item',
        newScan: 'New scan',
        noAccount: "Don't have an account?",
        noCoordinates: 'No coordinates available',
        noGPSLocation: 'No GPS location',
        noGPSLocationDesc: 'GPS location not available',
        noScansYet: 'No scans yet',
        noTeamsDesc: 'You are not part of any team',
        notRegistered: 'Not registered',
        notSet: 'Not set',
        of: 'of',
        openStreetMap: 'Open Street Map',
        optional: 'Optional',
        passwordChangeFailed: 'Failed to change password',
        passwordChangeSuccess: 'Password changed successfully',
        passwordMin6Chars: 'Password must be at least 6 characters',
        passwordNeeded: 'Password is needed',
        passwordPlaceholder: 'Enter password',
        placeholder: 'Placeholder',
        plan: 'Plan',
        preview: 'Preview',
        printQR: 'Print QR',
        proFeatures: 'Pro Features',
        profileInfo: 'Profile Information',
        qrLimit: 'QR Code Limit',
        quantity: 'Quantity',
        quantityRange: 'Quantity Range',
        reactivateInstructions: 'Print the QR code and scan it to reactivate',
        realtimeTracking: 'Real-time Tracking',
        records: 'Records',
        registerHere: 'Register here',
        registerSubtitle: 'Create a new account',
        registerTitle: 'Create Your Account',
        registeredName: 'Registered Name',
        registrationFailed: 'Registration failed',
        registrationForm: 'Registration Form',
        requiredFields: 'All fields are required',
        requiredToView: 'Required to view',
        role: 'Role',
        saveChanges: 'Save Changes',
        saving: 'Saving...',
        scanError: 'Scan error',
        scanSuccess: 'Scan successful',
        scanTitle: 'Scan QR Code',
        scanning: 'Scanning...',
        showAll: 'Show All',
        showLess: 'Show Less',
        specialInstructions: 'Special Instructions',
        status: 'Status',
        step: 'Step',
        step1: 'Step 1',
        step2: 'Step 2',
        step3: 'Step 3',
        step4: 'Step 4',
        subscription: 'Subscription',
        tapToDownload: 'Tap to Download',
        testCredentials: 'Test Credentials',
        toggleFailed: 'Failed to toggle QR code status',
        trackInfoTip: 'Enter your QR code ID and password',
        trackNow: 'Track Now',
        trackQR: 'Track QR',
        trackQRDesc: 'Track your QR code location',
        trackSubtitleForm: 'Track location of your QR code',
        trackTitle: 'Track Your Items',
        trackingStarted: 'Tracking started',
        unknown: 'Unknown',
        unlock: 'Unlock',
        updateFailed: 'Update failed',
        updateSuccess: 'Updated successfully',
        updating: 'Updating...',
        upgradePrompt: 'Upgrade your plan for more features',
        user: 'User',
        vehicle: 'Vehicle',
        viewTracking: 'View Tracking',
        // ── Category Keys ──
        category_pet: 'Pet',
        category_child: 'Child',
        category_vehicle: 'Vehicle',
        category_luggage: 'Luggage',
        category_electronic: 'Electronics',
        category_document: 'Document',
        category_other: 'Other',
        category_key: 'Key',
        // ── Organization & Attendance ──
        organizations: 'Organizations',
        manageOrgs: 'Manage your schools, offices & companies',
        createOrg: 'Create Organization',
        orgCreated: 'Organization created!',
        orgName: 'Organization Name',
        orgNamePlaceholder: 'e.g. Delhi Public School',
        orgType: 'Organization Type',
        orgDescription: 'Brief description...',
        sharedPassword: 'Shared Password',
        sharedPasswordHelp: 'Dashboard access password',
        sharedPasswordNote: 'This password will be shared with all members for dashboard access',
        noOrgs: 'No Organizations',
        noOrgsDesc: 'Create your first organization to manage groups and attendance',
        accessSharedDashboard: 'Access Shared Dashboard →',
        groups: 'Groups',
        members: 'Members',
        inviteCode: 'Invite Code',
        orgSettings: 'Organization Settings',
        owner: 'Owner',
        shareInviteCode: 'Share the invite code with members to access the shared dashboard',
        addGroup: 'Add Group',
        groupCreated: 'Group created!',
        groupName: 'Group Name',
        groupNamePlaceholder: 'e.g. Class 10-A, HR Department',
        groupType: 'Group Type',
        groupDescription: 'Group description',
        createGroup: 'Create Group',
        noGroups: 'No Groups Yet',
        noGroupsDesc: 'Add classrooms, departments or teams',
        attendance: 'Attendance',
        attendanceQR: 'Attendance QR Code',
        scanToMarkAttendance: 'Scan this QR to mark attendance',
        active: 'Active',
        memberAdded: 'Member added!',
        memberName: 'Member Name',
        memberNamePlaceholder: 'e.g. Rahul Sharma',
        rollNumber: 'Roll No.',
        role: 'Role',
        addMember: 'Add Member',
        bulkAdd: 'Bulk Add',
        bulkAddHelp: 'One member per line: Name, Roll No, Email, Phone',
        addAll: 'Add All Members',
        editMember: 'Edit Member',
        noMembers: 'No Members',
        noMembersDesc: 'Add students, staff or employees to this group',
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        excused: 'Excused',
        report: 'Report',
        markAllPresent: 'Mark All Present',
        allMarkedPresent: 'All marked present!',
        lock: 'Lock',
        unlock: 'Unlock',
        monthlyReport: 'Monthly Report',
        days: 'days',
        markAttendance: 'Mark Attendance',
        enterPassword: 'Enter password',
        enterOrgPassword: 'Enter organization password',
        marking: 'Marking',
        attendanceMarked: 'Attendance Marked!',
        membersMarked: 'members marked',
        scanPasswordNote: 'Enter the shared password provided by your organization admin',
        sharedDashboard: 'Shared Dashboard',
        sharedDashboardDesc: 'Access your organization dashboard with invite code',
        accessDashboard: 'Access Dashboard',
        todayAttendance: "Today's Attendance",
        noAttendanceToday: 'No attendance marked today',
        requiredFields: 'Please fill all required fields',
        error: 'Something went wrong'
    },
    // ══════════════════════════════════════════
    // HINDI
    // ══════════════════════════════════════════
    hi: {
        lang: 'हिन्दी',
        flag: '🇮🇳',
        // ── Common / Nav ──
        home: 'होम',
        login: 'लॉगिन',
        register: 'रजिस्टर',
        logout: 'लॉगआउट',
        dashboard: 'डैशबोर्ड',
        generate: 'QR बनाओ',
        track: 'लोकेशन ट्रैक',
        teams: 'टीम',
        profile: 'प्रोफ़ाइल',
        pricing: 'प्राइसिंग',
        scanner: 'स्कैनर',
        settings: 'सेटिंग्स',
        back: 'वापस',
        save: 'सेव करो',
        cancel: 'रद्द करो',
        delete: 'डिलीट करो',
        confirm: 'कन्फ़र्म',
        loading: 'लोड हो रहा है...',
        submit: 'सबमिट करो',
        download: 'डाउनलोड',
        print: 'प्रिंट',
        copy: 'कॉपी',
        share: 'शेयर',
        search: 'खोजो',
        noData: 'कोई डेटा नहीं मिला',
        error: 'एरर',
        success: 'सफल',
        warning: 'चेतावनी',
        // ── Auth ──
        email: 'ईमेल',
        password: 'पासवर्ड',
        confirmPassword: 'पासवर्ड दोबारा डालो',
        name: 'नाम',
        phone: 'फ़ोन नंबर',
        forgotPassword: 'पासवर्ड भूल गए?',
        dontHaveAccount: 'अकाउंट नहीं है?',
        alreadyHaveAccount: 'पहले से अकाउंट है?',
        loginBtn: 'लॉगिन करो',
        registerBtn: 'रजिस्टर करो',
        loginSuccess: 'लॉगिन हो गया! 🎉',
        registerSuccess: 'अकाउंट बन गया! 🎉',
        loginRequired: 'लॉगिन ज़रूरी है',
        loginToAccess: 'इस फ़ीचर के लिए लॉगिन करो',
        signInToAccount: 'अपने अकाउंट में साइन इन करो',
        createAccount: 'नया अकाउंट बनाओ',
        enterBothFields: 'ईमेल और पासवर्ड दोनों डालो',
        loginFailed: 'लॉगिन नहीं हो सका',
        // ── Home ──
        heroTitle: 'QR Code Tracking System',
        heroSubtitle: 'QR code से कुछ भी, कहीं भी ट्रैक करो',
        getStarted: 'शुरू करो',
        features: 'फ़ीचर्स',
        howItWorks: 'कैसे काम करता है',
        // ── Dashboard ──
        myQRCodes: 'मेरे QR Codes',
        adminPanel: 'एडमिन पैनल',
        totalQR: 'कुल QR',
        active: 'एक्टिव',
        inactive: 'इनएक्टिव',
        totalScans: 'कुल स्कैन',
        noQRCodes: 'अभी तक कोई QR Code नहीं बनाया',
        createFirstQR: 'पहला QR बनाओ',
        newQR: 'नया QR',
        currentPlan: 'मौजूदा प्लान',
        qrCodesUsed: 'QR Codes इस्तेमाल हुए',
        upgradeForMore: 'ज़्यादा QR codes और notifications के लिए अपग्रेड करो',
        deleteConfirm: 'क्या आप यह QR डिलीट करना चाहते हैं? यह वापस नहीं आएगा।',
        qrDeleted: 'QR Code डिलीट हो गया',
        // ── Generate ──
        generateQR: 'QR Code बनाओ',
        category: 'कैटेगरी',
        child: 'बच्चा',
        car: 'गाड़ी',
        bag: 'बैग',
        pet: 'पालतू',
        key: 'चाबी',
        luggage: 'सामान',
        other: 'अन्य',
        ownerMessage: 'मालिक का मैसेज (वैकल्पिक)',
        ownerMessageHint: 'ढूंढने वाले के लिए मैसेज (जैसे: कृपया वापस करें)',
        setPassword: 'पासवर्ड सेट करो',
        passwordHint: 'यह पासवर्ड याद रखना — इससे लोकेशन ट्रैक करोगे',
        qrGenerated: 'QR Code बन गया! 🎉',
        generateBtn: 'QR Code बनाओ',
        // ── Custom QR ──
        customQR: 'कस्टम QR डिज़ाइन',
        chooseColors: 'अपने कलर चुनो',
        colorPresets: 'कलर प्रीसेट',
        customColors: 'कस्टम कलर',
        darkColor: 'डार्क कलर',
        lightColor: 'लाइट/बैकग्राउंड कलर',
        size: 'साइज़',
        customQRReady: 'कस्टम QR तैयार है!',
        // ── Bulk Generate ──
        bulkGenerate: 'बल्क QR बनाओ',
        howManyQR: 'कितने QR Codes चाहिए?',
        defaultCategory: 'डिफ़ॉल्ट कैटेगरी',
        prefix: 'QR ID प्रीफ़िक्स (वैकल्पिक)',
        prefixHint: 'प्रीफ़िक्स नहीं दोगे तो डिफ़ॉल्ट: QR-XXXXXX',
        generateBulk: 'QR Codes बनाओ',
        downloadAll: 'सब डाउनलोड',
        printAll: 'सब प्रिंट करो',
        qrCodesReady: 'QR Codes तैयार',
        // ── Track ──
        trackLocation: 'लोकेशन ट्रैक करो',
        trackSubtitle: 'QR नंबर + पासवर्ड से लोकेशन देखो',
        qrCodeNumber: 'QR Code नंबर',
        viewLocation: 'लोकेशन देखो',
        searching: 'ढूंढ रहा है...',
        lastSeenLocation: 'आखिरी बार यहाँ दिखा',
        noGPSYet: 'अभी GPS लोकेशन नहीं मिली',
        noGPSDesc: 'QR code स्कैन हुआ है लेकिन GPS लोकेशन नहीं मिली। IP लोकेशन स्कैन हिस्ट्री में हो सकती है।',
        scanHistory: 'स्कैन हिस्ट्री',
        noScanHistory: 'कोई स्कैन हिस्ट्री नहीं',
        latest: 'नया',
        approximate: 'अनुमानित',
        cities: 'शहर',
        countries: 'देश',
        scans: 'स्कैन',
        fullMap: 'पूरा नक़्शा',
        justNow: 'अभी अभी',
        minAgo: 'मिनट पहले',
        hoursAgo: 'घंटे पहले',
        yesterday: 'कल',
        daysAgo: 'दिन पहले',
        locationHint: 'QR code कहीं भी स्कैन हो — आखिरी लोकेशन यहाँ दिखेगी',
        // ── Scan Page ──
        qrTracker: 'QR Tracker',
        qrCheckingInfo: 'QR Code चेक हो रहा है...',
        locationCaptureStarted: 'लोकेशन कैप्चर शुरू हो गई (IP-based)',
        locationCaptured: 'लोकेशन कैप्चर हो गई!',
        qrCodeOf: ' का QR code',
        ownerMessageLabel: 'मालिक का मैसेज:',
        ipLocationCaptured: 'IP लोकेशन कैप्चर ✅',
        scanLogSaved: 'स्कैन लॉग सेव हो गया',
        gpsLocationCaptured: 'GPS लोकेशन कैप्चर ✅ (सटीक)',
        gpsCapturing: 'GPS कैप्चर हो रही है...',
        gpsNotAvailable: 'GPS नहीं मिली — IP लोकेशन इस्तेमाल हो रही है',
        gpsDoneDesc: 'मालिक को सटीक GPS लोकेशन दिखेगी',
        gpsDeniedDesc: 'GPS deny हुई या timeout — IP लोकेशन काफ़ी है',
        gpsCapturingDesc: 'अगर permission माँगे तो Allow करो',
        locationCapturedEvenOnError: 'आपकी लोकेशन कैप्चर हो गई है!',
        ownerWillSeeIP: 'मालिक को IP-based लोकेशन दिखेगी',
        // ── Activation ──
        qrInactive: 'QR Code इनएक्टिव — रजिस्टर करो',
        qrNotRegistered: 'यह QR code अभी रजिस्टर नहीं है। नीचे फ़ॉर्म भरो और ट्रैकिंग एक्टिवेट करो।',
        yourName: 'आपका नाम',
        namePlaceholder: 'जैसे: राहुल शर्मा',
        phonePlaceholder: '+91 98765 43210',
        messageForFinder: 'ढूंढने वाले के लिए मैसेज',
        setPasswordLabel: 'पासवर्ड सेट करो',
        passwordForTracking: 'ट्रैकिंग देखने का पासवर्ड',
        confirmPasswordLabel: 'पासवर्ड कन्फ़र्म करो',
        reenterPassword: 'पासवर्ड दोबारा डालो',
        activateQR: 'QR Code एक्टिवेट करो',
        activating: 'एक्टिवेट हो रहा है...',
        activationConsent: 'एक्टिवेट करके, आप GPS लोकेशन ट्रैकिंग की सहमति दे रहे हो',
        qrActivated: 'QR एक्टिव हो गया!',
        qrActivatedDesc: 'QR Code एक्टिव हो गया! ट्रैकिंग शुरू हो गई। ✅',
        activatedInfo1: 'अब इस QR code को कोई भी स्कैन करे तो उनकी लोकेशन कैप्चर होगी',
        activatedInfo2: 'आपने जो पासवर्ड सेट किया उससे लोकेशन देख सकते हो',
        activatedInfo3: 'QR code प्रिंट करो और लगा दो — ट्रैकिंग एक्टिव रहेगी',
        nameRequired: 'नाम ज़रूरी है',
        phoneRequired: 'फ़ोन नंबर ज़रूरी है',
        passwordMinLength: 'पासवर्ड कम से कम 4 अक्षर का होना चाहिए',
        passwordsNoMatch: 'पासवर्ड मैच नहीं कर रहे',
        passwordMin4: 'पासवर्ड कम से कम 4 अक्षर का होना चाहिए',
        passwordMismatch: 'पासवर्ड मैच नहीं कर रहे',
        activationSuccess: 'QR Code एक्टिव हो गया! ट्रैकिंग शुरू हो गई।',
        activationFailed: 'एक्टिवेशन फ़ेल हो गया। फिर से कोशिश करो।',
        activationForm: 'एक्टिवेशन फ़ॉर्म',
        enterFullName: 'अपना पूरा नाम लिखो',
        setTrackingPassword: 'ट्रैकिंग का पासवर्ड सेट करो',
        passwordReminder: 'यह पासवर्ड याद रखो — लोकेशन देखने के लिए ज़रूरी है',
        reenterPassword: 'पासवर्ड दोबारा डालो',
        dataSecure: 'आपका डेटा एन्क्रिप्टेड और सुरक्षित है',
        pleaseWait: 'कृपया प्रतीक्षा करें...',
        ownerNotified: 'मालिक को सूचित कर दिया गया है',
        approximateLocation: 'अनुमानित लोकेशन कैप्चर हुई',
        exactLocation: 'सटीक GPS लोकेशन कैप्चर हुई',
        ipLocationUsed: 'IP-based लोकेशन इस्तेमाल हो रही है',
        waitingForGPS: 'GPS सिग्नल का इंतज़ार...',
        gpsNotAvailable: 'GPS उपलब्ध नहीं है',
        passwordSet: 'ट्रैकिंग के लिए पासवर्ड सेट हो गया',
        trackingActive: 'ट्रैकिंग अब एक्टिव है',
        locationSavedAnyway: 'IP से लोकेशन फिर भी कैप्चर हो गई',
        security: 'सुरक्षा',
        // ── QR Display ──
        qrCode: 'QR Code',
        activeTrackingOn: 'एक्टिव — ट्रैकिंग चालू',
        inactivePrintToActivate: 'इनएक्टिव — प्रिंट करो एक्टिवेट होगा',
        howToUse: 'कैसे इस्तेमाल करें:',
        howToUseStep1: 'नीचे से QR code डाउनलोड करो',
        howToUseStep2: 'प्रिंट करो और अपनी चीज़ पर लगा दो',
        howToUseStep3: 'कोई फ़ोन से स्कैन करे → फ़ॉर्म भर के एक्टिवेट करे',
        howToUseStep4: 'ट्रैकिंग शुरू! पासवर्ड से लोकेशन देखो',
        downloadPNG: 'PNG डाउनलोड',
        highQuality: 'हाई क्वालिटी 1024px',
        printReady: 'प्रिंट-रेडी फ़ॉर्मेट',
        mapView: 'नक़्शा देखो',
        viewScanLocations: 'स्कैन लोकेशन देखो',
        passwordTracking: 'पासवर्ड से ट्रैकिंग',
        // ── Map ──
        mapViewTitle: 'नक़्शा',
        qrPassword: 'QR पासवर्ड',
        enterPassword: 'पासवर्ड डालो',
        viewMap: 'नक़्शा देखो',
        goToTrack: 'ट्रैक पेज पर जाओ',
        scanLocations: 'स्कैन लोकेशन',
        live: 'लाइव',
        locations: 'लोकेशन',
        noGPSLocations: 'कोई GPS लोकेशन नहीं मिली',
        mapWillShowWhenScanned: 'जब QR GPS के साथ स्कैन होगा, नक़्शे पर दिखेगा',
        unknownCity: 'अनजान शहर',
        // ── Teams ──
        createTeam: 'टीम बनाओ',
        joinTeam: 'टीम जॉइन करो',
        teamName: 'टीम का नाम',
        teamNamePlaceholder: 'जैसे: Family Tracking, Office QR',
        teamDescription: 'विवरण (वैकल्पिक)',
        teamDescPlaceholder: 'टीम के बारे में कुछ लिखोगे?',
        createBtn: 'टीम बनाओ',
        creating: 'बन रही है...',
        teamCreated: 'टीम बन गई! 🎉',
        inviteCode: 'टीम इनवाइट कोड',
        shareInviteCode: 'यह कोड शेयर करो ताकि दूसरे लोग जॉइन कर सकें',
        members: 'सदस्य',
        leaveTeam: 'टीम छोड़ो',
        leaveConfirm: 'इस टीम को छोड़ना है?',
        teamLeft: 'टीम छोड़ दी',
        noTeams: 'कोई टीम नहीं है',
        createOrJoin: 'टीम बनाओ या इनवाइट कोड से जॉइन करो',
        joinBtn: 'टीम जॉइन करो',
        joining: 'जॉइन हो रहा है...',
        inviteCodePlaceholder: 'TEAM-XXXXXXXX',
        friendSharedCode: 'दोस्त ने शेयर किया इनवाइट कोड डालो',
        teamQRCodes: 'टीम QR Codes',
        noTeamQRCodes: 'टीम मेंबर्स का कोई QR code नहीं है',
        owner: 'मालिक',
        member: 'सदस्य',
        admin: 'एडमिन',
        viewer: 'दर्शक',
        // ── Profile ──
        editProfile: 'प्रोफ़ाइल एडिट करो',
        changePassword: 'पासवर्ड बदलो',
        currentPassword: 'मौजूदा पासवर्ड',
        newPassword: 'नया पासवर्ड',
        planInfo: 'प्लान की जानकारी',
        free: 'फ़्री',
        basic: 'बेसिक',
        pro: 'प्रो',
        enterprise: 'एंटरप्राइज़',
        // ── Pricing ──
        choosePlan: 'प्लान चुनो',
        monthly: 'मासिक',
        perMonth: '/महीना',
        currentPlanBadge: 'मौजूदा प्लान',
        selectPlan: 'प्लान चुनो',
        popular: 'लोकप्रिय',
        // ── Scanner ──
        scanQRCode: 'QR Code स्कैन करो',
        startCamera: 'कैमरा चालू करो',
        stopCamera: 'कैमरा बंद करो',
        orEnterManually: 'या QR code मैन्युअली डालो',
        enterQRId: 'QR ID डालो',
        goToScan: 'स्कैन करो',
        // ── Admin ──
        totalUsers: 'कुल यूज़र्स',
        activeQR: 'एक्टिव QR',
        revenue: 'रेवेन्यू',
        premiumUsers: 'प्रीमियम यूज़र्स',
        categoryDistribution: 'कैटेगरी डिस्ट्रीब्यूशन',
        recentUsers: 'हाल के यूज़र्स',
        recentScans: 'हाल के स्कैन (सब यूज़र्स)',
        // ── Export ──
        exportCSV: 'CSV एक्सपोर्ट',
        exportJSON: 'JSON एक्सपोर्ट',
        // ── Errors ──
        serverError: 'सर्वर से कनेक्ट नहीं हो सका। फिर से कोशिश करो।',
        qrNotFound: 'QR Code नहीं मिला',
        incorrectPassword: 'ग़लत पासवर्ड। फिर से कोशिश करो।',
        limitReached: 'QR code लिमिट पूरी हो गई। प्लान अपग्रेड करो।',
        networkError: 'नेटवर्क एरर',
        // ── Additional/Missing Keys ──
        accountCreated: 'अकाउंट बन गया',
        activateBtn: 'एक्टिवेट करो',
        activateDesc: 'QR Code एक्टिवेट करने की विवरण',
        activateTitle: 'अपने QR Code को एक्टिवेट करो',
        activated: 'QR Code एक्टिवेट हो गया!',
        backToHome: 'होम पर वापस जाओ',
        bulkGenerateDesc: 'एक बार में कई QR codes बनाओ',
        changing: 'बदल रहे हैं...',
        connectionError: 'कनेक्शन एरर',
        created: 'बनाया गया',
        current: 'मौजूदा',
        customColor: 'कस्टम कलर',
        customQRDesc: 'अपने कस्टम कलर के साथ QR code डिज़ाइन करो',
        customQRTitle: 'कस्टम QR Code डिज़ाइन',
        dashboardDesc: 'अपने सभी QR codes को मैनेज करो',
        deactivate: 'डीएक्टिवेट करो',
        deactivateSuccess: 'QR Code डीएक्टिवेट हो गया',
        deleteFailed: 'QR code डिलीट करना नाकाम रहा',
        deleteSuccess: 'QR code सफलतापूर्वक डिलीट हो गया',
        details: 'विवरण',
        device: 'डिवाइस',
        document: 'दस्तावेज़',
        downloadFailed: 'डाउनलोड नाकाम रहा',
        downloadQR: 'QR डाउनलोड करो',
        downloadSuccess: 'सफलतापूर्वक डाउनलोड हुआ',
        downloading: 'डाउनलोड हो रहा है...',
        edit: 'एडिट करो',
        electronic: 'इलेक्ट्रॉनिक्स',
        emailPlaceholder: 'आपका@ईमेल.कॉम',
        emptyFieldsError: 'कृपया सभी आवश्यक फील्ड भरो',
        enterInviteCode: 'टीम इनवाइट कोड डालो',
        enterName: 'अपना नाम डालो',
        enterpriseFeatures: 'एंटरप्राइज़ फ़ीचर्स',
        example: 'उदाहरण',
        feature1Desc: 'GPS के साथ रीयल-टाइम लोकेशन ट्रैकिंग',
        feature1Title: 'रीयल-टाइम ट्रैकिंग',
        feature2Desc: 'एक साथ कई आइटम ट्रैक करो',
        feature2Title: 'कई QR Codes',
        feature3Desc: 'टीम मेंबर्स के साथ सहयोग करो',
        feature3Title: 'टीम मैनेजमेंट',
        feature4Desc: 'विस्तृत विश्लेषण और इनसाइट',
        feature4Title: 'एनालिटिक्स डैशबोर्ड',
        freeFeatures: 'फ़्री फ़ीचर्स',
        fullName: 'पूरा नाम',
        generateAnother: 'एक और बनाओ',
        generateNew: 'नया बनाओ',
        generateQRDesc: 'अपनी चीज़ों को ट्रैक करने के लिए QR code बनाओ',
        generateSubtitle: 'अपना पहला QR code बनाओ',
        generateTitle: 'QR Code बनाओ',
        generating: 'QR code बन रहा है',
        generationFailed: 'QR code बनाना नाकाम रहा',
        getStartedDesc: 'QR codes के साथ अपनी चीज़ों को ट्रैक करना शुरू करो',
        googleMaps: 'गूगल मैप्स',
        gps: 'GPS',
        gpsAttempting: 'GPS लोकेशन कैप्चर करने की कोशिश हो रही है...',
        gpsCaptured: 'GPS लोकेशन कैप्चर हो गई',
        gpsUpdated: 'GPS लोकेशन अपडेट हो गई',
        haveAccount: 'पहले से अकाउंट है?',
        heroDesc: 'अपनी चीज़ों को कभी मत खोओ। QR codes से रीयल-टाइम में ट्रैक करो।',
        instructions: 'निर्देश',
        ip: 'IP लोकेशन',
        ipCaptured: 'IP लोकेशन कैप्चर हो गई',
        join_qr_tracking: 'QR ट्रैकिंग जॉइन करो',
        lastLocation: 'आखिरी लोकेशन',
        limit: 'लिमिट',
        liveAlerts: 'लाइव अलर्ट्स',
        liveMap: 'लाइव मैप',
        liveTracking: 'लाइव ट्रैकिंग',
        loadMore: 'और लोड करो',
        loadingError: 'डेटा लोड करने में एरर',
        locationDataReceived: 'लोकेशन डेटा मिल गया',
        loginHere: 'यहाँ लॉगिन करो',
        loginSubtitle: 'अपने अकाउंट में साइन इन करो',
        loginTitle: 'फिर से स्वागत है',
        loginToGenerate: 'QR codes बनाने के लिए आपको लॉगिन करना ज़रूरी है',
        maps: 'मैप्स',
        memberSince: 'सदस्य से',
        message: 'संदेश',
        messagePlaceholder: 'अपना संदेश डालो',
        min6Chars: 'कम से कम 6 अक्षर',
        minCharacters: 'न्यूनतम अक्षर आवश्यक',
        minutesAgo: 'मिनट पहले',
        more: 'अधिक',
        myTeams: 'मेरी टीमें',
        nameEmailPasswordRequired: 'नाम, ईमेल और पासवर्ड आवश्यक हैं',
        nameOfItem: 'चीज़ का नाम',
        newScan: 'नया स्कैन',
        noAccount: 'अकाउंट नहीं है?',
        noCoordinates: 'कोई निर्देशांक उपलब्ध नहीं',
        noGPSLocation: 'कोई GPS लोकेशन नहीं',
        noGPSLocationDesc: 'GPS लोकेशन उपलब्ध नहीं है',
        noScansYet: 'अभी कोई स्कैन नहीं',
        noTeamsDesc: 'आप किसी भी टीम का हिस्सा नहीं हैं',
        notRegistered: 'रजिस्टर नहीं किया गया',
        notSet: 'सेट नहीं किया',
        of: 'का',
        openStreetMap: 'ओपन स्ट्रीट मैप',
        optional: 'वैकल्पिक',
        passwordChangeFailed: 'पासवर्ड बदलना नाकाम रहा',
        passwordChangeSuccess: 'पासवर्ड सफलतापूर्वक बदल गया',
        passwordMin6Chars: 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए',
        passwordNeeded: 'पासवर्ड आवश्यक है',
        passwordPlaceholder: 'पासवर्ड डालो',
        placeholder: 'प्लेसहोल्डर',
        plan: 'प्लान',
        preview: 'प्रिव्यू',
        printQR: 'QR प्रिंट करो',
        proFeatures: 'प्रो फ़ीचर्स',
        profileInfo: 'प्रोफ़ाइल जानकारी',
        qrLimit: 'QR Code लिमिट',
        quantity: 'मात्रा',
        quantityRange: 'मात्रा की श्रेणी',
        reactivateInstructions: 'QR code को फिर से एक्टिवेट करने के लिए प्रिंट करके स्कैन करो',
        realtimeTracking: 'रीयल-टाइम ट्रैकिंग',
        records: 'रिकॉर्ड्स',
        registerHere: 'यहाँ रजिस्टर करो',
        registerSubtitle: 'एक नया अकाउंट बनाओ',
        registerTitle: 'अपना अकाउंट बनाओ',
        registeredName: 'पंजीकृत नाम',
        registrationFailed: 'पंजीकरण नाकाम रहा',
        registrationForm: 'पंजीकरण फ़ॉर्म',
        requiredFields: 'सभी फील्ड आवश्यक हैं',
        requiredToView: 'देखने के लिए आवश्यक',
        role: 'भूमिका',
        saveChanges: 'बदलाव सेव करो',
        saving: 'सेव हो रहा है...',
        scanError: 'स्कैन एरर',
        scanSuccess: 'स्कैन सफल',
        scanTitle: 'QR Code स्कैन करो',
        scanning: 'स्कैन हो रहा है...',
        showAll: 'सब दिखाओ',
        showLess: 'कम दिखाओ',
        specialInstructions: 'विशेष निर्देश',
        status: 'स्थिति',
        step: 'स्टेप',
        step1: 'स्टेप 1',
        step2: 'स्टेप 2',
        step3: 'स्टेप 3',
        step4: 'स्टेप 4',
        subscription: 'सदस्यता',
        tapToDownload: 'डाउनलोड करने के लिए टैप करो',
        testCredentials: 'टेस्ट क्रेडेंशियल्स',
        toggleFailed: 'QR code स्टेटस बदलना नाकाम रहा',
        trackInfoTip: 'अपने QR code ID और पासवर्ड डालो',
        trackNow: 'अभी ट्रैक करो',
        trackQR: 'QR ट्रैक करो',
        trackQRDesc: 'अपने QR code की लोकेशन ट्रैक करो',
        trackSubtitleForm: 'अपने QR code की लोकेशन ट्रैक करो',
        trackTitle: 'अपनी चीज़ों को ट्रैक करो',
        trackingStarted: 'ट्रैकिंग शुरू हो गई',
        unknown: 'अज्ञात',
        unlock: 'अनलॉक करो',
        updateFailed: 'अपडेट नाकाम रहा',
        updateSuccess: 'सफलतापूर्वक अपडेट हुआ',
        updating: 'अपडेट हो रहा है...',
        upgradePrompt: 'अधिक फ़ीचर्स के लिए अपने प्लान को अपग्रेड करो',
        user: 'यूज़र',
        vehicle: 'गाड़ी',
        viewTracking: 'ट्रैकिंग देखो',
        // ── Category Keys ──
        category_pet: 'पालतू',
        category_child: 'बच्चा',
        category_vehicle: 'गाड़ी',
        category_luggage: 'सामान',
        category_electronic: 'इलेक्ट्रॉनिक्स',
        category_document: 'दस्तावेज़',
        category_other: 'अन्य',
        category_key: 'चाबी',
        // ── Organization & Attendance ──
        organizations: 'संगठन',
        manageOrgs: 'अपने स्कूल, ऑफिस और कंपनी मैनेज करें',
        createOrg: 'संगठन बनाएं',
        orgCreated: 'संगठन बन गया!',
        orgName: 'संगठन का नाम',
        orgNamePlaceholder: 'जैसे दिल्ली पब्लिक स्कूल',
        orgType: 'संगठन का प्रकार',
        orgDescription: 'संक्षिप्त विवरण...',
        sharedPassword: 'साझा पासवर्ड',
        sharedPasswordHelp: 'डैशबोर्ड एक्सेस पासवर्ड',
        sharedPasswordNote: 'यह पासवर्ड सभी सदस्यों के साथ डैशबोर्ड एक्सेस के लिए साझा किया जाएगा',
        noOrgs: 'कोई संगठन नहीं',
        noOrgsDesc: 'ग्रुप और अटेंडेंस मैनेज करने के लिए पहला संगठन बनाएं',
        accessSharedDashboard: 'साझा डैशबोर्ड एक्सेस करें →',
        groups: 'ग्रुप',
        members: 'सदस्य',
        inviteCode: 'इनवाइट कोड',
        orgSettings: 'संगठन सेटिंग्स',
        owner: 'मालिक',
        shareInviteCode: 'सदस्यों के साथ इनवाइट कोड साझा करें',
        addGroup: 'ग्रुप जोड़ें',
        groupCreated: 'ग्रुप बन गया!',
        groupName: 'ग्रुप का नाम',
        groupNamePlaceholder: 'जैसे कक्षा 10-A, HR विभाग',
        groupType: 'ग्रुप प्रकार',
        groupDescription: 'ग्रुप विवरण',
        createGroup: 'ग्रुप बनाएं',
        noGroups: 'कोई ग्रुप नहीं',
        noGroupsDesc: 'कक्षा, विभाग या टीम जोड़ें',
        attendance: 'उपस्थिति',
        attendanceQR: 'उपस्थिति QR कोड',
        scanToMarkAttendance: 'उपस्थिति लगाने के लिए QR स्कैन करें',
        active: 'सक्रिय',
        memberAdded: 'सदस्य जोड़ा गया!',
        memberName: 'सदस्य का नाम',
        memberNamePlaceholder: 'जैसे राहुल शर्मा',
        rollNumber: 'रोल नं.',
        role: 'भूमिका',
        addMember: 'सदस्य जोड़ें',
        bulkAdd: 'एक साथ जोड़ें',
        bulkAddHelp: 'एक लाइन में एक सदस्य: नाम, रोल नं, ईमेल, फोन',
        addAll: 'सभी सदस्य जोड़ें',
        editMember: 'सदस्य संपादित करें',
        noMembers: 'कोई सदस्य नहीं',
        noMembersDesc: 'इस ग्रुप में छात्र, स्टाफ या कर्मचारी जोड़ें',
        present: 'उपस्थित',
        absent: 'अनुपस्थित',
        late: 'लेट',
        excused: 'छुट्टी',
        report: 'रिपोर्ट',
        markAllPresent: 'सभी उपस्थित करें',
        allMarkedPresent: 'सभी उपस्थित हो गए!',
        lock: 'लॉक करें',
        unlock: 'अनलॉक करें',
        monthlyReport: 'मासिक रिपोर्ट',
        days: 'दिन',
        markAttendance: 'उपस्थिति लगाएं',
        enterPassword: 'पासवर्ड डालें',
        enterOrgPassword: 'संगठन का पासवर्ड डालें',
        marking: 'लग रहा है',
        attendanceMarked: 'उपस्थिति लग गई!',
        membersMarked: 'सदस्यों की उपस्थिति',
        scanPasswordNote: 'अपने संगठन एडमिन से मिला पासवर्ड डालें',
        sharedDashboard: 'साझा डैशबोर्ड',
        sharedDashboardDesc: 'इनवाइट कोड से अपना संगठन डैशबोर्ड एक्सेस करें',
        accessDashboard: 'डैशबोर्ड एक्सेस करें',
        todayAttendance: 'आज की उपस्थिति',
        noAttendanceToday: 'आज कोई उपस्थिति नहीं लगी',
        requiredFields: 'सभी ज़रूरी फील्ड भरें',
        error: 'कुछ गलत हो गया'
    }
};
const LANGUAGES = [
    {
        code: 'en',
        label: 'English',
        flag: '🇬🇧'
    },
    {
        code: 'hi',
        label: 'हिन्दी',
        flag: '🇮🇳'
    }
];
function detectLanguage() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Check localStorage first
    const saved = localStorage.getItem('qr_lang');
    if (saved && translations[saved]) return saved;
    // Auto-detect from browser
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('hi')) return 'hi';
    return 'en'; // Default English
}
function getTranslation(lang, key) {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
}
const __TURBOPACK__default__export__ = translations;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/context/LanguageContext.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LanguageProvider",
    ()=>LanguageProvider,
    "default",
    ()=>__TURBOPACK__default__export__,
    "useLanguage",
    ()=>useLanguage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
// ============================================
// context/LanguageContext.js - Language Provider
// ============================================
// Auto-detects browser language, stores preference in localStorage
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$translations$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/translations.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
const LanguageContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"])();
function LanguageProvider({ children }) {
    _s();
    const [lang, setLang] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('en');
    const [isReady, setIsReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // On mount: detect language from localStorage or browser
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanguageProvider.useEffect": ()=>{
            const detected = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$translations$2e$js__$5b$client$5d$__$28$ecmascript$29$__["detectLanguage"])();
            setLang(detected);
            setIsReady(true);
        }
    }["LanguageProvider.useEffect"], []);
    // Switch language and persist
    const switchLanguage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LanguageProvider.useCallback[switchLanguage]": (newLang)=>{
            if (__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$translations$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"][newLang]) {
                setLang(newLang);
                if ("TURBOPACK compile-time truthy", 1) {
                    localStorage.setItem('qrtrack_lang', newLang);
                }
            }
        }
    }["LanguageProvider.useCallback[switchLanguage]"], []);
    // Translation helper - t('keyName')
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LanguageProvider.useCallback[t]": (key)=>{
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$translations$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getTranslation"])(lang, key);
        }
    }["LanguageProvider.useCallback[t]"], [
        lang
    ]);
    const value = {
        lang,
        switchLanguage,
        t,
        isReady,
        languages: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$translations$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LANGUAGES"]
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LanguageContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/src/context/LanguageContext.js",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
_s(LanguageProvider, "6zxkMZ+ATOfN/jreTqiDRHhQ43M=");
_c = LanguageProvider;
function useLanguage() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"])(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
_s1(useLanguage, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const __TURBOPACK__default__export__ = LanguageContext;
var _c;
__turbopack_context__.k.register(_c, "LanguageProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/components/LanguageSwitcher.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LanguageSwitcher
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
// ============================================
// components/LanguageSwitcher.js - Language Toggle
// ============================================
// Simple toggle button: EN ↔ हि
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/context/LanguageContext.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
function LanguageSwitcher({ className = '' }) {
    _s();
    const { lang, switchLanguage, languages } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const toggle = ()=>{
        const currentIdx = languages.findIndex((l)=>l.code === lang);
        const nextIdx = (currentIdx + 1) % languages.length;
        switchLanguage(languages[nextIdx].code);
    };
    const current = languages.find((l)=>l.code === lang);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: toggle,
        className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
        bg-white/10 hover:bg-white/20 text-white/90 hover:text-white
        border border-white/20 hover:border-white/40
        transition-all duration-200 backdrop-blur-sm ${className}`,
        title: "Switch Language",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-sm",
                children: current?.flag || '🌐'
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/LanguageSwitcher.js",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: current?.label || lang.toUpperCase()
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/LanguageSwitcher.js",
                lineNumber: 29,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/LanguageSwitcher.js",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
_s(LanguageSwitcher, "UKp8jZIkdvRonkna1WqT6RKczHo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useLanguage"]
    ];
});
_c = LanguageSwitcher;
var _c;
__turbopack_context__.k.register(_c, "LanguageSwitcher");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/pages/track.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Track
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
// ============================================
// pages/track.js - Track QR Location
// ============================================
// QR ID + Password → Last Seen Location PROMINENT DISPLAY
// Scanner error aaye ya na aaye → Last location hamesha dikhega
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/api.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/socket.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react-hot-toast/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/context/LanguageContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$LanguageSwitcher$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/components/LanguageSwitcher.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
function Track() {
    _s();
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const [qrId, setQrId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [result, setResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [liveUpdate, setLiveUpdate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Real-time socket updates
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Track.useEffect": ()=>{
            if (!result) return;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["joinQRTracking"])(result.qrInfo.qrId);
            const cleanup = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["onNewScan"])({
                "Track.useEffect.cleanup": (data)=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["default"])(`📍 ${t('newScan')}! ${data.location?.city || t('unknown')}`, {
                        icon: '🔔'
                    });
                    setLiveUpdate(true);
                    handleTrack(true);
                    setTimeout({
                        "Track.useEffect.cleanup": ()=>setLiveUpdate(false)
                    }["Track.useEffect.cleanup"], 3000);
                }
            }["Track.useEffect.cleanup"]);
            return ({
                "Track.useEffect": ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["leaveQRTracking"])(result.qrInfo.qrId);
                    cleanup();
                }
            })["Track.useEffect"];
        }
    }["Track.useEffect"], [
        result?.qrInfo?.qrId,
        t
    ]);
    const handleTrack = async (silent = false)=>{
        if (!qrId.trim()) {
            setError(t('enterQRId'));
            return;
        }
        if (!password.trim()) {
            setError(t('enterPassword'));
            return;
        }
        setError('');
        if (!silent) setLoading(true);
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__["trackAPI"].viewLocations({
                qrId: qrId.trim().toUpperCase(),
                password
            });
            setResult(res.data.data);
            if (!silent) __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["default"].success(`${t('locationDataReceived')} 🗺️`);
        } catch (err) {
            const msg = err.response?.data?.message || t('error');
            setError(msg);
            if (!silent) __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["default"].error(msg);
        } finally{
            setLoading(false);
        }
    };
    const goBack = ()=>{
        setResult(null);
        setQrId('');
        setPassword('');
        setError('');
    };
    // Format time (multi-language support)
    const formatTime = (dateStr)=>{
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        if (diffMin < 1) return t('justNow');
        if (diffMin < 60) return t('minutesAgo', {
            count: diffMin
        });
        if (diffHr < 24) return t('hoursAgo', {
            count: diffHr
        });
        if (diffDay === 1) return t('yesterday');
        if (diffDay < 7) return t('daysAgo', {
            count: diffDay
        });
        return d.toLocaleDateString('en-IN');
    };
    const getGoogleMapsUrl = (lat, lng)=>`https://maps.google.com/?q=${lat},${lng}`;
    const getOpenStreetMapUrl = (lat, lng)=>`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
                    children: [
                        t('track'),
                        " | QR Tracker"
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/src/pages/track.js",
                    lineNumber: 91,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/src/pages/track.js",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-h-screen pb-24",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-w-lg mx-auto flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/",
                                            className: "text-gray-400 hover:text-white text-sm",
                                            children: "←"
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 97,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-bold text-sm text-gray-200",
                                                    children: [
                                                        "📍 ",
                                                        t('trackLocation')
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 99,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[10px] text-gray-500",
                                                    children: t('trackSubtitle')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 100,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 98,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 96,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$LanguageSwitcher$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 104,
                                            columnNumber: 15
                                        }, this),
                                        result && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${liveUpdate ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `w-1.5 h-1.5 rounded-full ${liveUpdate ? 'bg-green-400 animate-ping' : 'bg-indigo-400'}`
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 111,
                                                    columnNumber: 19
                                                }, this),
                                                liveUpdate ? t('updating') : t('liveTracking')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 106,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 103,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/frontend/src/pages/track.js",
                            lineNumber: 95,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/pages/track.js",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "max-w-lg mx-auto px-5 pt-5",
                        children: !result ? /* ─── INPUT FORM ─── */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "animate-fadeIn",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-center mb-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/20 flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-4xl",
                                                children: "🗺️"
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/pages/track.js",
                                                lineNumber: 125,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 124,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-2xl font-black gradient-text mb-1",
                                            children: t('trackTitle')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 127,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-gray-500",
                                            children: t('trackSubtitleForm')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 128,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 123,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "card p-6 space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "label",
                                                    children: t('qrCodeNumber')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 133,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    className: "input-field font-mono font-black tracking-widest text-center text-lg",
                                                    placeholder: "QR-XXXXXXXX",
                                                    value: qrId,
                                                    onChange: (e)=>setQrId(e.target.value.toUpperCase()),
                                                    autoCapitalize: "characters"
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 134,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 132,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "label",
                                                    children: t('password')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 143,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "password",
                                                    className: "input-field text-center text-lg tracking-widest",
                                                    placeholder: "••••••••",
                                                    value: password,
                                                    onChange: (e)=>setPassword(e.target.value),
                                                    onKeyDown: (e)=>e.key === 'Enter' && handleTrack()
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 144,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 142,
                                            columnNumber: 17
                                        }, this),
                                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center",
                                            children: [
                                                "❌ ",
                                                error
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 155,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleTrack(),
                                            disabled: loading,
                                            className: "btn-primary w-full text-base py-4 flex items-center justify-center gap-2",
                                            children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "animate-spin text-xl",
                                                        children: "⏳"
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 166,
                                                        columnNumber: 23
                                                    }, this),
                                                    " ",
                                                    t('loading')
                                                ]
                                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    "👁️ ",
                                                    t('viewLocation')
                                                ]
                                            }, void 0, true)
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 160,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 131,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-5 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-gray-500",
                                        children: [
                                            "💡 ",
                                            t('trackInfoTip')
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/frontend/src/pages/track.js",
                                        lineNumber: 174,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 173,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/frontend/src/pages/track.js",
                            lineNumber: 122,
                            columnNumber: 13
                        }, this) : /* ─── RESULTS ─── */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4 animate-fadeIn",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: goBack,
                                    className: "text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1",
                                    children: [
                                        "← ",
                                        t('back')
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 183,
                                    columnNumber: 15
                                }, this),
                                result.qrInfo.lastKnownLocation?.latitude ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative overflow-hidden rounded-2xl border border-green-500/30",
                                    style: {
                                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,95,70,0.2))'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute top-4 right-4",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative w-8 h-8",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-0 rounded-full bg-green-500/30 animate-ping"
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 194,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-1 rounded-full bg-green-500/50 animate-ping",
                                                        style: {
                                                            animationDelay: '0.3s'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 195,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-0 flex items-center justify-center text-base",
                                                        children: "📍"
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 196,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/frontend/src/pages/track.js",
                                                lineNumber: 193,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 192,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[10px] text-green-400 font-black uppercase tracking-widest mb-2",
                                                    children: [
                                                        "🟢 ",
                                                        t('lastSeenLocation')
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 201,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-3xl font-black text-white mb-1",
                                                    children: result.qrInfo.lastKnownLocation.city || t('unknownCity')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 206,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-lg font-bold text-green-300 mb-3",
                                                    children: result.qrInfo.lastKnownLocation.country || ''
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 209,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-mono text-xs text-green-400/70 mb-4",
                                                    children: [
                                                        "📌 ",
                                                        result.qrInfo.lastKnownLocation.latitude?.toFixed(6),
                                                        ",",
                                                        result.qrInfo.lastKnownLocation.longitude?.toFixed(6)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 214,
                                                    columnNumber: 21
                                                }, this),
                                                result.qrInfo.lastKnownLocation.capturedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-[11px] text-green-300 font-bold mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "w-1.5 h-1.5 rounded-full bg-green-400"
                                                        }, void 0, false, {
                                                            fileName: "[project]/frontend/src/pages/track.js",
                                                            lineNumber: 222,
                                                            columnNumber: 25
                                                        }, this),
                                                        formatTime(result.qrInfo.lastKnownLocation.capturedAt),
                                                        " •",
                                                        ' ',
                                                        new Date(result.qrInfo.lastKnownLocation.capturedAt).toLocaleString('en-IN', {
                                                            dateStyle: 'short',
                                                            timeStyle: 'short'
                                                        })
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 221,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: getGoogleMapsUrl(result.qrInfo.lastKnownLocation.latitude, result.qrInfo.lastKnownLocation.longitude),
                                                            target: "_blank",
                                                            rel: "noopener noreferrer",
                                                            className: "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/15 transition-all",
                                                            children: [
                                                                "🗺️ ",
                                                                t('googleMaps')
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/frontend/src/pages/track.js",
                                                            lineNumber: 230,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: getOpenStreetMapUrl(result.qrInfo.lastKnownLocation.latitude, result.qrInfo.lastKnownLocation.longitude),
                                                            target: "_blank",
                                                            rel: "noopener noreferrer",
                                                            className: "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/15 transition-all",
                                                            children: [
                                                                "🌍 ",
                                                                t('openStreetMap')
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/frontend/src/pages/track.js",
                                                            lineNumber: 237,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                            href: `/map/${result.qrInfo.qrId}`,
                                                            className: "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-all",
                                                            children: [
                                                                "📊 ",
                                                                t('fullMap')
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/frontend/src/pages/track.js",
                                                            lineNumber: 244,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 229,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 200,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 189,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "card p-6 text-center border-yellow-500/20",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-4xl block mb-3",
                                            children: "⚠️"
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 255,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-yellow-400 mb-1",
                                            children: t('noGPSLocation')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 256,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-gray-500",
                                            children: t('noGPSLocationDesc')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 257,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 254,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "card p-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-mono font-black text-indigo-300 text-sm",
                                                        children: result.qrInfo.qrId
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 267,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[11px] text-gray-500 capitalize",
                                                        children: [
                                                            result.qrInfo.category,
                                                            " • ",
                                                            result.qrInfo.registeredName || t('notRegistered')
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 268,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/frontend/src/pages/track.js",
                                                lineNumber: 266,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-right",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-2xl font-black text-indigo-400",
                                                        children: result.qrInfo.totalScans
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 273,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] text-gray-500",
                                                        children: t('totalScans')
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 274,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/frontend/src/pages/track.js",
                                                lineNumber: 272,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/frontend/src/pages/track.js",
                                        lineNumber: 265,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 264,
                                    columnNumber: 15
                                }, this),
                                result.analytics && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-3 gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "stat-card bg-indigo-500/5 border-indigo-500/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-lg font-black text-indigo-400",
                                                    children: result.analytics.totalScans || 0
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 283,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[9px] text-gray-500",
                                                    children: t('scans')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 284,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 282,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "stat-card bg-pink-500/5 border-pink-500/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-lg font-black text-pink-400",
                                                    children: result.analytics.uniqueCities?.length || 0
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 287,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[9px] text-gray-500",
                                                    children: t('cities')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 288,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 286,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "stat-card bg-green-500/5 border-green-500/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-lg font-black text-green-400",
                                                    children: result.analytics.uniqueCountries?.length || 0
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 291,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[9px] text-gray-500",
                                                    children: t('countries')
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 292,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 290,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 281,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "card p-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs font-bold text-gray-400 mb-3",
                                            children: [
                                                "📋 ",
                                                t('scanHistory'),
                                                " (",
                                                result.locations.length,
                                                " ",
                                                t('records'),
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 299,
                                            columnNumber: 17
                                        }, this),
                                        result.locations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center py-6 text-xs text-gray-600",
                                            children: t('noScansYet')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 303,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2",
                                            children: result.locations.map((loc, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `p-3 rounded-xl border ${i === 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-white/2 border-white/5'}`,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-start gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: `w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`,
                                                                children: i === 0 ? '🔴' : '📍'
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/pages/track.js",
                                                                lineNumber: 313,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex-1 min-w-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-xs font-bold text-gray-200 truncate",
                                                                        children: [
                                                                            loc.address?.city || t('unknownCity'),
                                                                            ", ",
                                                                            loc.address?.state || '',
                                                                            " ",
                                                                            loc.address?.country || ''
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 319,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] text-gray-500 mt-0.5",
                                                                        children: [
                                                                            loc.latitude && loc.longitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : t('noCoordinates'),
                                                                            ' ',
                                                                            "• ",
                                                                            loc.device?.deviceType || t('device'),
                                                                            " • ",
                                                                            loc.device?.os || ''
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 322,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    loc.isApproximate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[9px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-1 inline-block",
                                                                        children: [
                                                                            "≈ ",
                                                                            t('approximate')
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 330,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/frontend/src/pages/track.js",
                                                                lineNumber: 318,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-right flex-shrink-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: `text-[10px] font-bold ${i === 0 ? 'text-red-400' : 'text-gray-500'}`,
                                                                        children: formatTime(loc.scannedAt)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 336,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[9px] text-gray-600",
                                                                        children: loc.locationSource === 'gps' ? `📡 ${t('gps')}` : loc.locationSource === 'ip' ? `🌐 ${t('ip')}` : '📌'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 339,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    loc.latitude && loc.longitude && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                        href: getGoogleMapsUrl(loc.latitude, loc.longitude),
                                                                        target: "_blank",
                                                                        rel: "noopener noreferrer",
                                                                        className: "text-[9px] text-indigo-400 hover:text-indigo-300 mt-0.5 block",
                                                                        children: [
                                                                            t('maps'),
                                                                            " →"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                                        lineNumber: 343,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/frontend/src/pages/track.js",
                                                                lineNumber: 335,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/pages/track.js",
                                                        lineNumber: 312,
                                                        columnNumber: 25
                                                    }, this)
                                                }, i, false, {
                                                    fileName: "[project]/frontend/src/pages/track.js",
                                                    lineNumber: 309,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 307,
                                            columnNumber: 19
                                        }, this),
                                        result.pagination?.hasMore && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-secondary w-full mt-3 text-xs py-2",
                                            children: t('loadMore')
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 359,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 298,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/frontend/src/pages/track.js",
                            lineNumber: 182,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/pages/track.js",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-w-lg mx-auto flex justify-around",
                            children: [
                                {
                                    icon: '🏠',
                                    label: t('home'),
                                    href: '/'
                                },
                                {
                                    icon: '➕',
                                    label: t('generate'),
                                    href: '/generate'
                                },
                                {
                                    icon: '📍',
                                    label: t('track'),
                                    href: '/track'
                                },
                                {
                                    icon: '📋',
                                    label: t('dashboard'),
                                    href: '/dashboard'
                                }
                            ].map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: item.href,
                                    className: `nav-item ${item.href === '/track' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-lg",
                                            children: item.icon
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 379,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-[10px] font-semibold",
                                            children: item.label
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/pages/track.js",
                                            lineNumber: 380,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, i, true, {
                                    fileName: "[project]/frontend/src/pages/track.js",
                                    lineNumber: 377,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/pages/track.js",
                            lineNumber: 370,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/pages/track.js",
                        lineNumber: 369,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/pages/track.js",
                lineNumber: 92,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Track, "oL8v6k0ozgIjfpVefWVnprax3uA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useLanguage"]
    ];
});
_c = Track;
var _c;
__turbopack_context__.k.register(_c, "Track");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/frontend/src/pages/track.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/track";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/frontend/src/pages/track.js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/frontend/src/pages/track\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/frontend/src/pages/track.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__493e6d55._.js.map