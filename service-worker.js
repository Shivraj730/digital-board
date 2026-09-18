// ============================================
// DIGITAL BOARD SERVICE WORKER
// ============================================

const CACHE_VERSION = "digital-board-v2";

const STATIC_CACHE =
    CACHE_VERSION + "-static";

const API_CACHE =
    CACHE_VERSION + "-api";

const IMAGE_CACHE =
    CACHE_VERSION + "-images";


// ============================================
// API TYPES
// ============================================

const API_TYPES = new Set([
    "notices",
    "staff",
    "officials",
    "gallery"
]);


// ============================================
// INSTALL
// ============================================

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(STATIC_CACHE)
                .then(cache => {

                    return Promise.all(
                        [
                            "./",
                            "./index.html",
                            "./style.css",
                            "./app.js",
                            "./offline-cache.js",
                            "./service-worker.js"
                        ].map(file => {

                            return cache.add(file)
                                .catch(error => {

                                    console.warn(
                                        "Static cache failed:",
                                        file,
                                        error
                                    );

                                });

                        })
                    );

                })

        );

        self.skipWaiting();

    }
);


// ============================================
// ACTIVATE
// ============================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(cacheNames => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                cacheName =>
                                    cacheName !== STATIC_CACHE &&
                                    cacheName !== API_CACHE &&
                                    cacheName !== IMAGE_CACHE
                            )
                            .map(
                                cacheName =>
                                    caches.delete(cacheName)
                            )

                    );

                })
                .then(() => {

                    return self.clients.claim();

                })

        );

    }
);


// ============================================
// FETCH
// ============================================

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;

        const url =
            new URL(request.url);


        // ------------------------------------
        // API REQUEST
        // ------------------------------------

        const apiType =
            url.searchParams.get("api");

        if (
            API_TYPES.has(apiType)
        ) {

            event.respondWith(
                networkFirstAPI(request)
            );

            return;
        }


        // ------------------------------------
        // IMAGE REQUEST
        // ------------------------------------

        if (
            request.destination === "image"
        ) {

            event.respondWith(
                cacheFirstImage(request)
            );

            return;
        }


        // ------------------------------------
        // PAGE NAVIGATION
        // ------------------------------------

        if (
            request.mode === "navigate"
        ) {

            event.respondWith(
                networkFirstPage(request)
            );

            return;
        }


        // ------------------------------------
        // SAME ORIGIN STATIC FILE
        // ------------------------------------

        if (
            url.origin === self.location.origin
        ) {

            event.respondWith(
                networkFirstStatic(request)
            );

        }

    }
);


// ============================================
// API: NETWORK FIRST
// ============================================

async function networkFirstAPI(
    request
) {

    try {

        const response =
            await fetch(request);

        if (
            response.ok ||
            response.type === "opaque"
        ) {

            const cache =
                await caches.open(
                    API_CACHE
                );

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        console.warn(
            "API offline:",
            request.url
        );

        const cache =
            await caches.open(
                API_CACHE
            );

        const cached =
            await cache.match(request);

        if (cached) {
            return cached;
        }


        // Empty fallback
        return new Response(
            JSON.stringify([]),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    }

}


// ============================================
// IMAGE: CACHE FIRST
// ============================================

async function cacheFirstImage(
    request
) {

    const cache =
        await caches.open(
            IMAGE_CACHE
        );


    // First try cache
    const cached =
        await cache.match(request);

    if (cached) {

        return cached;

    }


    // Then Internet
    try {

        const response =
            await fetch(request);

        if (
            response.ok ||
            response.type === "opaque"
        ) {

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        console.warn(
            "Image unavailable offline:",
            request.url
        );


        // No image available
        return new Response(
            "",
            {
                status: 404
            }
        );

    }

}


// ============================================
// PAGE: NETWORK FIRST
// ============================================

async function networkFirstPage(
    request
) {

    try {

        const response =
            await fetch(request);

        if (response.ok) {

            const cache =
                await caches.open(
                    STATIC_CACHE
                );

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        console.warn(
            "Page offline."
        );


        // Try exact page
        const cache =
            await caches.open(
                STATIC_CACHE
            );

        const cached =
            await cache.match(request);

        if (cached) {
            return cached;
        }


        // Finally use index.html
        const indexPage =
            await cache.match(
                "./index.html"
            );

        if (indexPage) {
            return indexPage;
        }


        return new Response(
            "Digital Board is offline.",
            {
                status: 503,
                headers: {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                }
            }
        );

    }

}


// ============================================
// STATIC FILE: NETWORK FIRST
// ============================================

async function networkFirstStatic(
    request
) {

    try {

        const response =
            await fetch(request);

        if (response.ok) {

            const cache =
                await caches.open(
                    STATIC_CACHE
                );

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        const cache =
            await caches.open(
                STATIC_CACHE
            );

        const cached =
            await cache.match(request);

        if (cached) {
            return cached;
        }

        return Response.error();

    }

}
