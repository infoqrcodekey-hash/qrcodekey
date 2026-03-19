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
"[project]/frontend/src/context/AuthContext.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "default",
    ()=>__TURBOPACK__default__export__,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
// ============================================
// context/AuthContext.js - Authentication State
// ============================================
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/api.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/socket.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"])();
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // ====== Check on page load: Is user logged in? ======
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const savedToken = localStorage.getItem('qr_token');
            if (savedToken) {
                setToken(savedToken);
                fetchUser(savedToken);
            } else {
                setLoading(false);
            }
        }
    }["AuthProvider.useEffect"], []);
    // ====== Fetch user data ======
    const fetchUser = async (authToken)=>{
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__["authAPI"].getMe();
            const userData = res.data.data;
            setUser(userData);
            localStorage.setItem('qr_user', JSON.stringify(userData));
            // Connect socket and join user room
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["connectSocket"])();
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["joinUserRoom"])(userData.id);
        } catch (err) {
            console.error('Auth check failed:', err);
            localStorage.removeItem('qr_token');
            localStorage.removeItem('qr_user');
            setToken(null);
            setUser(null);
        } finally{
            setLoading(false);
        }
    };
    // ====== Register ======
    const register = async (data)=>{
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__["authAPI"].register(data);
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('qr_token', newToken);
        setToken(newToken);
        await fetchUser(newToken);
        return res.data;
    };
    // ====== Login ======
    const login = async (data)=>{
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$api$2e$js__$5b$client$5d$__$28$ecmascript$29$__["authAPI"].login(data);
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('qr_token', newToken);
        setToken(newToken);
        await fetchUser(newToken);
        return res.data;
    };
    // ====== Logout ======
    const logout = ()=>{
        localStorage.removeItem('qr_token');
        localStorage.removeItem('qr_user');
        setToken(null);
        setUser(null);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$socket$2e$js__$5b$client$5d$__$28$ecmascript$29$__["disconnectSocket"])();
    };
    // ====== Update User (after profile changes) ======
    const refreshUser = async ()=>{
        if (token) await fetchUser(token);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            token,
            loading,
            isLoggedIn: !!user,
            isAdmin: user?.role === 'admin',
            isPremium: user?.isPremium,
            register,
            login,
            logout,
            refreshUser
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/src/context/AuthContext.js",
        lineNumber: 84,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "s3+shCSR/t4KywrfJXNOwwFNgWM=");
_c = AuthProvider;
const useAuth = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const __TURBOPACK__default__export__ = AuthContext;
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
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
"[project]/frontend/src/pages/_app.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ============================================
// pages/_app.js - App Root
// ============================================
__turbopack_context__.s([
    "default",
    ()=>App
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/context/AuthContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/context/LanguageContext.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/react-hot-toast/dist/index.mjs [client] (ecmascript)");
;
;
;
;
;
function App({ Component, pageProps }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$LanguageContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LanguageProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$context$2f$AuthContext$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AuthProvider"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Component, {
                    ...pageProps
                }, void 0, false, {
                    fileName: "[project]/frontend/src/pages/_app.js",
                    lineNumber: 14,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Toaster"], {
                    position: "top-center",
                    toastOptions: {
                        duration: 3000,
                        style: {
                            background: 'rgba(15,15,45,0.95)',
                            color: '#e0e0f0',
                            border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600'
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: 'white'
                            }
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: 'white'
                            }
                        }
                    }
                }, void 0, false, {
                    fileName: "[project]/frontend/src/pages/_app.js",
                    lineNumber: 15,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/pages/_app.js",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/frontend/src/pages/_app.js",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = App;
var _c;
__turbopack_context__.k.register(_c, "App");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/frontend/src/pages/_app.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/_app";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/frontend/src/pages/_app.js [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/frontend/src/pages/_app\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/frontend/src/pages/_app.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__8068e761._.js.map