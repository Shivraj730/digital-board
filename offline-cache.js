// ============================================
// DIGITAL BOARD OFFLINE CACHE
// ============================================

const OFFLINE_DB_NAME = "digital-board-offline-db";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = "apiData";

const IMAGE_CACHE_NAME = "digital-board-v2-images";

const OFFLINE_WORKER_API =
    "https://digital-board-api.shivrajbadu04.workers.dev";

const API_LIST = {
    notices: `${OFFLINE_WORKER_API}?api=notices`,
    staff: `${OFFLINE_WORKER_API}?api=staff`,
    officials: `${OFFLINE_WORKER_API}?api=officials`,
    gallery: `${OFFLINE_WORKER_API}?api=gallery`
};

// ============================================
// OPEN INDEXED DB
// ============================================

function openOfflineDB() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            OFFLINE_DB_NAME,
            OFFLINE_DB_VERSION
        );

        request.onupgradeneeded = function (event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {

                db.createObjectStore(
                    OFFLINE_STORE_NAME,
                    { keyPath: "key" }
                );

            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });
}


// ============================================
// SAVE DATA TO INDEXED DB
// ============================================

async function saveOfflineData(key, data) {

    try {

        const db = await openOfflineDB();

        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    OFFLINE_STORE_NAME,
                    "readwrite"
                );

            const store =
                transaction.objectStore(
                    OFFLINE_STORE_NAME
                );

            store.put({
                key: key,
                data: data,
                updatedAt: Date.now()
            });

            transaction.oncomplete = function () {
                resolve(true);
            };

            transaction.onerror = function () {
                reject(transaction.error);
            };

        });

    } catch (error) {

        console.error(
            "Offline DB save error:",
            error
        );

        return false;
    }
}


// ============================================
// GET DATA FROM INDEXED DB
// ============================================

async function getOfflineData(key) {

    try {

        const db = await openOfflineDB();

        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    OFFLINE_STORE_NAME,
                    "readonly"
                );

            const store =
                transaction.objectStore(
                    OFFLINE_STORE_NAME
                );

            const request =
                store.get(key);

            request.onsuccess = function () {

                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }

            };

            request.onerror = function () {
                reject(request.error);
            };

        });

    } catch (error) {

        console.error(
            "Offline DB read error:",
            error
        );

        return null;
    }
}


// ============================================
// NORMALIZE API DATA
// ============================================

function normalizeData(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.data)) {
        return data.data;
    }

    if (data && Array.isArray(data.items)) {
        return data.items;
    }

    if (data && Array.isArray(data.results)) {
        return data.results;
    }

    return [];
}


// ============================================
// EXTRACT IMAGE URL
// ============================================

function getImageUrl(imageValue) {

    if (!imageValue) {
        return null;
    }

    if (typeof imageValue !== "string") {
        return null;
    }

    const value = imageValue.trim();

    // Direct image URL
    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    // HTML image src
    const match = value.match(
        /<img[^>]+src=["']([^"']+)["']/i
    );

    if (match && match[1]) {
        return match[1];
    }

    return null;
}


// ============================================
// FIND IMAGE URLs INSIDE DATA
// ============================================

function extractImageUrls(data) {

    const urls = new Set();

    function scan(value) {

        if (!value) {
            return;
        }

        if (typeof value === "string") {

            const url = getImageUrl(value);

            if (url) {
                urls.add(url);
            }

            return;
        }

        if (Array.isArray(value)) {

            value.forEach(item => {
                scan(item);
            });

            return;
        }

        if (typeof value === "object") {

            Object.values(value).forEach(item => {
                scan(item);
            });

        }
    }

    scan(data);

    return Array.from(urls);
}


// ============================================
// CACHE IMAGE
// ============================================

async function cacheImage(url) {

    if (!url) {
        return;
    }

    try {

        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );

        const existing =
            await cache.match(url);

        if (existing) {
            return;
        }

        const response = await fetch(
            url,
            {
                method: "GET",
                mode: "no-cors",
                cache: "no-cache"
            }
        );

        if (
            response.ok ||
            response.type === "opaque"
        ) {

            await cache.put(
                url,
                response
            );

        }

    } catch (error) {

        console.warn(
            "Image cache failed:",
            url,
            error
        );

    }
}


// ============================================
// CACHE ALL IMAGES
// ============================================

async function cacheImages(data) {

    const imageUrls =
        extractImageUrls(data);

    if (!imageUrls.length) {
        return;
    }

    console.log(
        "Caching images:",
        imageUrls.length
    );

    for (const url of imageUrls) {

        await cacheImage(url);

    }
}


// ============================================
// SYNC ONE API
// ============================================

async function syncApi(
    key,
    url
) {

    try {

        console.log(
            "Syncing:",
            key
        );

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const json =
            await response.json();

        const data =
            normalizeData(json);

        // Save JSON data
        await saveOfflineData(
            key,
            data
        );

        // Cache images
        await cacheImages(data);

        console.log(
            "Offline cache updated:",
            key
        );

        return data;

    } catch (error) {

        console.warn(
            "API sync failed:",
            key,
            error
        );

        // Return old cached data
        const oldData =
            await getOfflineData(key);

        return oldData || [];

    }
}


// ============================================
// SYNC ALL APIs
// ============================================

async function syncAll() {

    if (!navigator.onLine) {

        console.log(
            "Offline. Using saved data."
        );

        return;
    }

    console.log(
        "Starting offline data sync..."
    );

    for (
        const [key, url]
        of Object.entries(API_LIST)
    ) {

        await syncApi(
            key,
            url
        );

    }

    console.log(
        "Offline data sync complete."
    );

    // Tell app.js that new data is available
    window.dispatchEvent(
        new CustomEvent(
            "digitalBoardDataUpdated"
        )
    );
}


// ============================================
// INITIAL SYNC
// ============================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        setTimeout(
            () => {
                syncAll();
            },
            2000
        );

    }
);


// ============================================
// WHEN INTERNET RETURNS
// ============================================

window.addEventListener(
    "online",
    function () {

        console.log(
            "Internet connection restored."
        );

        setTimeout(
            () => {
                syncAll();
            },
            3000
        );

    }
);


// ============================================
// PERIODIC SYNC
// EVERY 5 MINUTES
// ============================================

setInterval(
    function () {

        if (navigator.onLine) {
            syncAll();
        }

    },
    5 * 60 * 1000
);


// ============================================
// PUBLIC API
// ============================================

window.OfflineCache = {

    save: saveOfflineData,

    get: getOfflineData,

    sync: syncApi,

    syncAll: syncAll,

    getImageUrl: getImageUrl,

    extractImageUrls: extractImageUrls

};
