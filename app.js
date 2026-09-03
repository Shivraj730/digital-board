/* =========================================================
   DIGITAL BOARD
   Drupal -> Cloudflare Worker -> GitHub Pages
   Target: 1920 x 1080 TV
   ========================================================= */


/* =========================================================
   1. API CONFIGURATION
   ========================================================= */

const WORKER_API =
    "https://digital-board-api.shivrajbadu04.workers.dev";

const NOTICE_API =
    `${WORKER_API}/?api=notices`;

const STAFF_API =
    `${WORKER_API}/?api=staff`;

const ELECTED_OFFICIALS_API =
    `${WORKER_API}/?api=officials`;

const GALLERY_API =
    `${WORKER_API}/?api=gallery`;


/* =========================================================
   2. COMMON API FUNCTION
   ========================================================= */

async function getApiData(url) {

    try {

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const data = await response.json();

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

    } catch (error) {

        console.error(
            "API Loading Error:",
            url,
            error
        );

        return [];
    }
}


/* =========================================================
   3. IMAGE URL EXTRACTOR
   Drupal Image field HTML बाट src निकाल्ने
   ========================================================= */

function getImageUrl(imageValue) {

    if (!imageValue) {
        return "";
    }

    if (
        typeof imageValue === "string" &&
        imageValue.startsWith("http")
    ) {
        return imageValue;
    }

    const match =
        String(imageValue).match(
            /src=["']([^"']+)["']/i
        );

    if (match && match[1]) {

        return match[1]
            .replace(/\\\//g, "/");
    }

    return "";
}


/* =========================================================
   4. NEWS TICKER
   Drupal Notice API बाट
   ========================================================= */

async function loadNewsTicker() {

    const container =
        document.getElementById("newsTicker");

    if (!container) {
        return;
    }

    const data =
        await getApiData(NOTICE_API);

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        container.innerHTML =
            '<span class="ticker-item">सूचना तथा समाचार उपलब्ध छैन।</span>';

        return;
    }

    container.innerHTML = "";

    /*
       Continuous movement को लागि
       data लाई दुई पटक राखिएको
    */

    const tickerItems =
        [...data, ...data];

    tickerItems.forEach(item => {

        const span =
            document.createElement("span");

        span.className =
            "ticker-item";

        span.textContent =
            item.title || "";

        container.appendChild(span);
    });
}


/* =========================================================
   5. NOTICE SLIDESHOW
   Image भएको notice मात्र
   ========================================================= */

async function loadNoticeSlideshow() {

    const container =
        document.getElementById("noticeSlider");

    if (!container) {
        return;
    }

    const data =
        await getApiData(NOTICE_API);

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        container.innerHTML =
            '<div class="loading">सूचना उपलब्ध छैन।</div>';

        return;
    }

    /*
       Image नभएका Article हटाउने
    */

    const notices =
        data.filter(item => {

            return getImageUrl(item.image) !== "";

        });

    if (notices.length === 0) {

        container.innerHTML =
            '<div class="loading">सूचनाको तस्वीर उपलब्ध छैन।</div>';

        return;
    }

    container.innerHTML = "";

    notices.forEach((item, index) => {

        const slide =
            document.createElement("div");

        slide.className =
            "notice-slide";

        if (index === 0) {
            slide.classList.add("active");
        }

        const image =
            document.createElement("img");

        image.src =
            getImageUrl(item.image);

        image.alt =
            item.title || "सूचना";

        const title =
            document.createElement("div");

        title.className =
            "notice-slide-title";

        title.textContent =
            item.title || "";

        slide.appendChild(image);
        slide.appendChild(title);

        container.appendChild(slide);
    });

    startNoticeSlideshow();
}


/* =========================================================
   6. NOTICE ROTATION
   ========================================================= */

function startNoticeSlideshow() {

    const slides =
        document.querySelectorAll(
            ".notice-slide"
        );

    if (slides.length <= 1) {
        return;
    }

    let current = 0;

    setInterval(() => {

        slides[current]
            .classList.remove("active");

        current =
            (current + 1) %
            slides.length;

        slides[current]
            .classList.add("active");

    }, 7000);
}

/* =========================================================
   7. ELECTED OFFICIALS
   ८ जना सबै एकैपटक
   Vertical Card:
   फोटो → नाम → पद → फोन नं.
   ========================================================= */

async function loadElectedOfficials() {

    const container =
        document.getElementById("electedOfficials");

    if (!container) {
        return;
    }

    try {

        const data =
            await getApiData(
                ELECTED_OFFICIALS_API
            );

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            container.innerHTML =
                '<div class="loading">जनप्रतिनिधि विवरण उपलब्ध छैन।</div>';

            return;
        }

        /*
           पहिलो ८ जना मात्र
           सबै एकैपटक देखाउने
        */

        const officials =
            data.slice(0, 8);

        container.innerHTML = "";

        officials.forEach(person => {

            /* =========================
               CARD
               ========================= */

            const card =
                document.createElement("div");

            card.className =
                "official-card";


            /* =========================
               PHOTO WRAPPER
               ========================= */

            const photoWrap =
                document.createElement("div");

            photoWrap.className =
                "official-photo-wrap";


            const imageUrl =
                getImageUrl(person.Photo);


            if (imageUrl) {

                const image =
                    document.createElement("img");

                image.src =
                    imageUrl;

                image.alt =
                    person.Title ||
                    "जनप्रतिनिधि";

                image.loading =
                    "lazy";

                photoWrap.appendChild(
                    image
                );

            } else {

                const emptyPhoto =
                    document.createElement("div");

                emptyPhoto.className =
                    "official-photo-empty";

                emptyPhoto.textContent =
                    "फोटो";

                photoWrap.appendChild(
                    emptyPhoto
                );
            }


            /* =========================
               INFORMATION WRAPPER
               ========================= */

            const info =
                document.createElement("div");

            info.className =
                "official-info";


            /* =========================
               NAME
               ========================= */

            const name =
                document.createElement("div");

            name.className =
                "official-name";

            name.textContent =
                person.Title || "";


            /* =========================
               DESIGNATION
               ========================= */

            const position =
                document.createElement("div");

            position.className =
                "official-position";

            position.textContent =
                person.Designation || "";


            /* =========================
               PHONE
               ========================= */

            const phone =
                document.createElement("div");

            phone.className =
                "official-phone";

            if (person.Phone) {

                phone.textContent =
                    "फोन: " + person.Phone;

            } else {

                phone.style.display =
                    "none";
            }


            /* =========================
               BUILD INFORMATION
               ========================= */

            info.appendChild(
                name
            );

            info.appendChild(
                position
            );

            info.appendChild(
                phone
            );


            /* =========================
               BUILD CARD
               ========================= */

            card.appendChild(
                photoWrap
            );

            card.appendChild(
                info
            );


            /* =========================
               ADD CARD TO CONTAINER
               ========================= */

            container.appendChild(
                card
            );
        });

    } catch (error) {

        console.error(
            "Elected Officials API Error:",
            error
        );

        container.innerHTML =
            '<div class="loading">जनप्रतिनिधि विवरण लोड गर्न सकिएन।</div>';
    }
}





/* =========================================================
   8. STAFF MARQUEE
   एक-एक कर्मचारी बाँयाबाट दायाँ
   ========================================================= */

async function loadStaff() {

    const container =
        document.getElementById(
            "staffSlider"
        );

    if (!container) {
        return;
    }

    const data =
        await getApiData(STAFF_API);

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        container.innerHTML =
            '<div class="loading">कर्मचारी विवरण उपलब्ध छैन।</div>';

        return;
    }

    container.innerHTML = "";

    const track =
        document.createElement("div");

    track.className =
        "staff-track";

    /*
       कर्मचारी data दुई पटक राख्दा
       continuous marquee राम्रो हुन्छ
    */

    const staffItems =
        [...data, ...data];

    staffItems.forEach(staff => {

        const card =
            document.createElement("div");

        card.className =
            "staff-card";

        const imageUrl =
            getImageUrl(staff.Photo);

        if (imageUrl) {

            const image =
                document.createElement("img");

            image.src =
                imageUrl;

            image.alt =
                staff.Title ||
                "कर्मचारी";

            card.appendChild(image);
        }

        const info =
            document.createElement("div");

        info.className =
            "staff-info";

        const name =
            document.createElement("div");

        name.className =
            "staff-name";

        name.textContent =
            staff.Title || "";

        const position =
            document.createElement("div");

        position.className =
            "staff-position";

        position.textContent =
            staff.Designation || "";

        info.appendChild(name);
        info.appendChild(position);

        if (staff.Phone) {

            const phone =
                document.createElement("div");

            phone.className =
                "staff-phone";

            phone.textContent =
                "फोन: " + staff.Phone;

            info.appendChild(phone);
        }

        card.appendChild(info);

        track.appendChild(card);
    });

    container.appendChild(track);
}


/* =========================================================
   9. PHOTO GALLERY
   एकपटकमा ३ फोटो
   ========================================================= */

async function loadGallery() {

    const container =
        document.getElementById(
            "photoGallery"
        );

    if (!container) {
        return;
    }

    const data =
        await getApiData(GALLERY_API);

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        container.innerHTML =
            '<div class="loading">फोटो ग्यालरी उपलब्ध छैन।</div>';

        return;
    }

    const galleryItems =
        data.filter(item => {

            return getImageUrl(item.Image) !== "";

        });

    if (galleryItems.length === 0) {

        container.innerHTML =
            '<div class="loading">फोटो उपलब्ध छैन।</div>';

        return;
    }

    container.innerHTML = "";

    /*
       प्रत्येक ३ फोटोको एउटा group
    */

    const groups = [];

    for (
        let i = 0;
        i < galleryItems.length;
        i += 3
    ) {

        groups.push(
            galleryItems.slice(i, i + 3)
        );
    }

    groups.forEach((group, groupIndex) => {

        const slide =
            document.createElement("div");

        slide.className =
            "gallery-group";

        if (groupIndex === 0) {
            slide.classList.add("active");
        }

        group.forEach(item => {

            const imageBox =
                document.createElement("div");

            imageBox.className =
                "gallery-item";

            const image =
                document.createElement("img");

            image.src =
                getImageUrl(item.Image);

            image.alt =
                item.Title ||
                "फोटो ग्यालरी";

            imageBox.appendChild(image);

            /*
               Gallery title भए तल देखाउने
            */

            if (item.Title) {

                const title =
                    document.createElement("div");

                title.className =
                    "gallery-title";

                title.textContent =
                    item.Title;

                imageBox.appendChild(title);
            }

            slide.appendChild(imageBox);
        });

        container.appendChild(slide);
    });

    startGalleryRotation();
}


/* =========================================================
   10. GALLERY ROTATION
   प्रत्येक ६ second मा अर्को ३ फोटो
   ========================================================= */

function startGalleryRotation() {

    const groups =
        document.querySelectorAll(
            ".gallery-group"
        );

    if (groups.length <= 1) {
        return;
    }

    let current = 0;

    setInterval(() => {

        groups[current]
            .classList.remove("active");

        current =
            (current + 1) %
            groups.length;

        groups[current]
            .classList.add("active");

    }, 6000);
}


/* =========================================================
   11. PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Digital Board loading..."
        );

        loadNewsTicker();

        loadNoticeSlideshow();

        loadElectedOfficials();

        loadStaff();

        loadGallery();

    }
);
