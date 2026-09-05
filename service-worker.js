/* =========================================================
   DIGITAL BOARD OFFLINE SERVICE WORKER
   ========================================================= */

const CACHE_VERSION = "digital-board-v1";

const STATIC_CACHE = CACHE_VERSION + "-static";
const API_CACHE = CACHE_VERSION + "-api";
const IMAGE_CACHE = CACHE_VERSION + "-images";


/* =========================================================
   API URL PATTERN
   ========================================================= */

const API_PATHS = [
    "api=notices",
    "api=staff",
    "api=officials",
    "api=gallery"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", function (event) {

    event.waitUntil(

        caches.open(STATIC_CACHE)
            .then(function (cache) {

                return cache.addAll([
                    "./",
                    "./index.html",
                    "./style.css",
                    "./app.js",
                    "./offline-cache.js"
                ]);

            })

    );

    self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", function (event) {

    event.waitUntil(

        caches.keys()
            .then(function (cacheNames) {

                return Promise.all(

                    cacheNames
                        .filter(function (cacheName) {

                            return (
                                cacheName !== STATIC_CACHE &&
                                cacheName !== API_CACHE &&
                                cacheName !== IMAGE_CACHE
                            );

                        })
                        .map(function (cacheName) {

                            return caches.delete(cacheName);

                        })

                );

            })

    );

    self.clients.claim();

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", function (event) {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);


    /* =====================================================
       API REQUEST
       ===================================================== */

    const isApiRequest =
        API_PATHS.some(function (apiPath) {

            return url.search.includes(apiPath);

        });


    if (isApiRequest) {

        event.respondWith(
            networkFirstAPI(request)
        );

        return;
    }


    /* =====================================================
       IMAGE REQUEST
       ===================================================== */

    if (request.destination === "image") {

        event.respondWith(
            cacheFirstImage(request)
        );

        return;
    }


    /* =====================================================
       WEBSITE FILES
       ===================================================== */

    if (
        url.origin === self.location.origin
    ) {

        event.respondWith(
            networkFirstStatic(request)
        );

    }

});


/* =========================================================
   API NETWORK FIRST
   Internet छ भने नयाँ data
   Internet छैन भने पुरानो data
   ========================================================= */

async function networkFirstAPI(request) {

    const cache =
        await caches.open(API_CACHE);

    try {

        const response =
            await fetch(request);

        if (response && response.ok) {

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        console.warn(
            "Internet छैन। Cached API data प्रयोग हुँदैछ।"
        );

        const cachedResponse =
            await cache.match(request);

        if (cachedResponse) {

            return cachedResponse;

        }

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


/* =========================================================
   IMAGE CACHE FIRST
   पहिले cache मा image खोज्ने
   नभए Internet बाट ल्याउने
   ========================================================= */

async function cacheFirstImage(request) {

    const cache =
        await caches.open(IMAGE_CACHE);

    const cached =
        await cache.match(request);

    if (cached) {

        return cached;

    }

    try {

        const response =
            await fetch(request);

        if (response && response.ok) {

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        console.warn(
            "Image offline मा उपलब्ध छैन:",
            request.url
        );

        return new Response(
            "",
            {
                status: 404
            }
        );

    }

}


/* =========================================================
   STATIC FILES
   ========================================================= */

async function networkFirstStatic(request) {

    const cache =
        await caches.open(STATIC_CACHE);

    try {

        const response =
            await fetch(request);

        if (response && response.ok) {

            await cache.put(
                request,
                response.clone()
            );

        }

        return response;

    } catch (error) {

        const cached =
            await cache.match(request);

        if (cached) {

            return cached;

        }

        return Response.error();

    }

}
