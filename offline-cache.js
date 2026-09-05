(function () {
    "use strict";

    if (!("serviceWorker" in navigator)) {
        console.warn("Service Worker supported छैन।");
        return;
    }

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

})();
