```javascript
/* =========================================================
   DIGITAL BOARD OFFLINE + AUTO UPDATE
   Drupal -> Cloudflare Worker -> GitHub Pages
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       SERVICE WORKER REGISTER
       ===================================================== */

    if ("serviceWorker" in navigator) {

        window.addEventListener("load", function () {

            navigator.serviceWorker
                .register("./service-worker.js")
                .then(function (registration) {

                    console.log(
                        "Offline Service Worker registered:",
                        registration.scope
                    );

                })
                .catch(function (error) {

                    console.error(
                        "Service Worker registration failed:",
                        error
                    );

                });

        });

    } else {

        console.warn(
            "यो browser ले Service Worker support गर्दैन।"
        );

    }


    /* =====================================================
       API CONFIGURATION
       ===================================================== */

    const WORKER_API =
        "https://digital-board-api.shivrajbadu04.workers.dev";

    const SYNC_APIS = [

        `${WORKER_API}/?api=notices`,

        `${WORKER_API}/?api=staff`,

        `${WORKER_API}/?api=officials`,

        `${WORKER_API}/?api=gallery`

    ];


    /* =====================================================
       SETTINGS
       ===================================================== */

    /*
       Internet फर्किएपछि तुरुन्त जाँच गर्ने
    */

    const ONLINE_CHECK_DELAY = 3000;


    /*
       प्रत्येक ५ मिनेटमा नयाँ data जाँच गर्ने

       TV लामो समयसम्म खुला रहँदा
       नयाँ Drupal data स्वतः update गर्न
    */

    const UPDATE_CHECK_INTERVAL =
        5 * 60 * 1000;


    /*
       API response को fingerprint
       browser localStorage मा राख्ने
    */

    const STORAGE_KEY =
        "digital-board-api-fingerprint";


    /* =====================================================
       NORMALIZE API DATA
       ===================================================== */

    function normalizeData(data) {

        if (Array.isArray(data)) {

            return data;

        }

        if (
            data &&
            Array.isArray(data.data)
        ) {

            return data.data;

        }

        if (
            data &&
            Array.isArray(data.items)
        ) {

            return data.items;

        }

        return [];

    }


    /* =====================================================
       CREATE FINGERPRINT
       ===================================================== */

    async function createFingerprint(data) {

        try {

            const text =
                JSON.stringify(data);

            /*
               Browser मा SHA-256 उपलब्ध भएमा
               त्यसबाट छोटो hash बनाउने
            */

            if (
                window.crypto &&
                window.crypto.subtle
            ) {

                const encoder =
                    new TextEncoder();

                const encoded =
                    encoder.encode(text);

                const hashBuffer =
                    await crypto.subtle.digest(
                        "SHA-256",
                        encoded
                    );

                const hashArray =
                    Array.from(
                        new Uint8Array(hashBuffer)
                    );

                return hashArray
                    .map(function (byte) {

                        return byte
                            .toString(16)
                            .padStart(2, "0");

                    })
                    .join("");

            }

            /*
               SHA-256 उपलब्ध नभए fallback
            */

            return text;

        } catch (error) {

            console.error(
                "Fingerprint creation error:",
                error
            );

            return "";

        }

    }


    /* =====================================================
       GET CURRENT API FINGERPRINT
       ===================================================== */

    async function getCurrentFingerprint() {

        const allData = [];


        for (
            let i = 0;
            i < SYNC_APIS.length;
            i++
        ) {

            const apiUrl =
                SYNC_APIS[i];


            try {

                /*
                   cache: no-store

                   Service Worker को पुरानो response
                   प्रयोग नगरी Internet बाट नयाँ data
                   जाँच गर्न अनुरोध
                */

                const response =
                    await fetch(
                        apiUrl,
                        {
                            method: "GET",
                            headers: {
                                "Accept":
                                    "application/json"
                            },
                            cache: "no-store"
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );

                }


                const data =
                    await response.json();


                allData.push(
                    normalizeData(data)
                );


            } catch (error) {

                /*
                   एउटा API पनि fail भयो भने
                   अहिले Internet reliable छैन।
                */

                console.warn(
                    "API sync check failed:",
                    apiUrl,
                    error
                );

                return null;

            }

        }


        return createFingerprint(
            allData
        );

    }


    /* =====================================================
       SAVE INITIAL FINGERPRINT
       ===================================================== */

    async function saveInitialFingerprint() {

        try {

            /*
               अहिलेको online data लिने
            */

            const fingerprint =
                await getCurrentFingerprint();


            if (!fingerprint) {

                return;

            }


            /*
               पहिलो पटक fingerprint नभएमा
               अहिलेको data save गर्ने
            */

            const oldFingerprint =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!oldFingerprint) {

                localStorage.setItem(
                    STORAGE_KEY,
                    fingerprint
                );

                console.log(
                    "Initial API fingerprint saved."
                );

            }

        } catch (error) {

            console.warn(
                "Initial fingerprint error:",
                error
            );

        }

    }


    /* =====================================================
       CHECK FOR NEW DATA
       ===================================================== */

    async function checkForUpdates() {

        /*
           Browser ले network छैन भनिरहेको छ भने
           API request नगर्ने
        */

        if (
            navigator.onLine === false
        ) {

            console.log(
                "Offline: update check skipped."
            );

            return;

        }


        console.log(
            "Internet available: checking for updates..."
        );


        const newFingerprint =
            await getCurrentFingerprint();


        /*
           API request fail भयो भने
           केही नगर्ने।
           Cached board चलिरहन्छ।
        */

        if (!newFingerprint) {

            console.log(
                "Internet/API unavailable. Existing board continues."
            );

            return;

        }


        const oldFingerprint =
            localStorage.getItem(
                STORAGE_KEY
            );


        /*
           पहिलो पटक fingerprint छैन भने
           अहिलेको data save गर्ने
        */

        if (!oldFingerprint) {

            localStorage.setItem(
                STORAGE_KEY,
                newFingerprint
            );

            console.log(
                "API fingerprint initialized."
            );

            return;

        }


        /*
           Data परिवर्तन भएको छैन
        */

        if (
            oldFingerprint === newFingerprint
        ) {

            console.log(
                "No new Drupal data."
            );

            return;

        }


        /*
           नयाँ data भेटियो
        */

        console.log(
            "New Drupal data detected. Reloading Digital Board..."
        );


        localStorage.setItem(
            STORAGE_KEY,
            newFingerprint
        );


        /*
           थोरै delay दिएर reload गर्ने

           यसले API/cache update पूरा हुन
           समय दिन्छ।
        */

        setTimeout(function () {

            window.location.reload();

        }, 1000);

    }


    /* =====================================================
       INTERNET RETURN DETECTION
       ===================================================== */

    window.addEventListener(
        "online",
        function () {

            console.log(
                "Internet connection restored."
            );


            /*
               Internet फर्किएपछि
               ३ second पछि update check
            */

            setTimeout(
                checkForUpdates,
                ONLINE_CHECK_DELAY
            );

        }
    );


    /* =====================================================
       INITIAL ONLINE CHECK
       ===================================================== */

    window.addEventListener(
        "load",
        function () {

            /*
               Page load भएको केही समयपछि
               initial fingerprint save गर्ने
            */

            setTimeout(
                saveInitialFingerprint,
                5000
            );

        }
    );


    /* =====================================================
       PERIODIC UPDATE CHECK
       ===================================================== */

    setInterval(
        checkForUpdates,
        UPDATE_CHECK_INTERVAL
    );


})();
```
