/* =========================================================
   DIGITAL BOARD - MAIN JAVASCRIPT
   Drupal -> Cloudflare Worker -> GitHub Pages
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
   2. COMMON API FETCH FUNCTION
   ========================================================= */

async function getApiData(url) {

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            return data;
        }

        /*
         * केही Drupal JSON output object भित्र
         * data/items हुन सक्ने सम्भावनाका लागि
         */
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
   Drupal बाट image field HTML को रूपमा आएमा
   src URL निकाल्ने
   ========================================================= */

function getImageUrl(imageValue) {

    if (!imageValue) {
        return "";
    }

    /*
     * यदि पहिले नै direct URL छ भने
     */
    if (
        typeof imageValue === "string" &&
        imageValue.startsWith("http")
    ) {
        return imageValue;
    }

    /*
     * Drupal ले यस्तो HTML पठाउँछ:
     *
     * <img src="https://example.com/image.jpg">
     *
     * त्यसबाट src निकाल्ने
     */
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
            '<div class="loading">सूचना तथा समाचार उपलब्ध छैन।</div>';

        return;
    }

    container.innerHTML = "";

    /*
     * Continuous ticker का लागि data दुईपटक राखिएको
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
   5. NOTICE IMAGE SLIDESHOW
   Image नभएका notices यहाँ देखाइँदैनन्
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
     * Image भएको notice मात्र slideshow मा राख्ने
     */
    const noticesWithImages =
        data.filter(item => {

            const imageUrl =
                getImageUrl(item.image);

            return imageUrl !== "";
        });

    if (noticesWithImages.length === 0) {

        container.innerHTML =
            '<div class="loading">सूचनाको तस्वीर उपलब्ध छैन।</div>';

        return;
    }

    container.innerHTML = "";

    noticesWithImages.forEach(
        (item, index) => {

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
        }
    );

    startNoticeSlideshow();
}


/* =========================================================
   6. NOTICE SLIDESHOW TIMER
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
   Drupal fields:
   Title
   Body
   Designation
   Email
   Phone
   Photo
   Post Box
   Section
   ========================================================= */

async function loadElectedOfficials() {

    const container =
        document.getElementById(
            "electedOfficials"
        );

    if (!container) {
        return;
    }

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

    container.innerHTML = "";

    data.forEach(
        (person, index) => {

            const card =
                document.createElement("div");

            card.className =
                "official-card";

            if (index === 0) {
                card.classList.add("active");
            }


            const image =
                document.createElement("img");

            image.src =
                getImageUrl(person.Photo);

            image.alt =
                person.Title || "जनप्रतिनिधि";


            /*
             * Image उपलब्ध नभए पनि broken image icon
             * नदेखाउन
             */
            if (!image.src) {
                image.style.display =
                    "none";
            }


            const name =
                document.createElement("div");

            name.className =
                "official-name";

            name.textContent =
                person.Title || "";


            const position =
                document.createElement("div");

            position.className =
                "official-position";

            position.textContent =
                person.Designation || "";


            card.appendChild(image);

            card.appendChild(name);

            card.appendChild(position);

            container.appendChild(card);
        }
    );

    startOfficialsSlideshow();
}


/* =========================================================
   8. ELECTED OFFICIALS SLIDESHOW
   ========================================================= */

function startOfficialsSlideshow() {

    const slides =
        document.querySelectorAll(
            ".official-card"
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

    }, 6000);
}


/* =========================================================
   9. STAFF
   Drupal fields:
   Title
   Body
   Designation
   Email
   Phone
   Photo
   Post Box
   Section
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

    data.forEach(
        (staff, index) => {

            const card =
                document.createElement("div");

            card.className =
                "staff-card";

            if (index === 0) {
                card.classList.add("active");
            }


            const image =
                document.createElement("img");

            image.src =
                getImageUrl(staff.Photo);

            image.alt =
                staff.Title || "कर्मचारी";


            if (!image.src) {
                image.style.display =
                    "none";
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


            const phone =
                document.createElement("div");

            phone.className =
                "staff-phone";

            phone.textContent =
                staff.Phone || "";


            info.appendChild(name);

            info.appendChild(position);

            if (staff.Phone) {
                info.appendChild(phone);
            }


            card.appendChild(image);

            card.appendChild(info);

            container.appendChild(card);
        }
    );

    startStaffSlideshow();
}


/* =========================================================
   10. STAFF SLIDESHOW
   ========================================================= */

function startStaffSlideshow() {

    const slides =
        document.querySelectorAll(
            ".staff-card"
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

    }, 6000);
}


/* =========================================================
   11. PHOTO GALLERY
   Drupal fields:
   Title
   Image
   ========================================================= */

async function loadGallery() {

    const container =
        document.getElementById("photoGallery");
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

    container.innerHTML = "";

    /*
     * पहिले valid image भएका items मात्र तयार गर्ने
     */
    const galleryItems = data.filter(item => {
        return getImageUrl(item.Image) !== "";
    });

    if (galleryItems.length === 0) {
        container.innerHTML =
            '<div class="loading">फोटो उपलब्ध छैन।</div>';
        return;
    }

    /*
     * Gallery slides बनाउने
     */
    galleryItems.forEach((item, index) => {

        const imageUrl =
            getImageUrl(item.Image);

        const slide =
            document.createElement("div");

        slide.className =
            "gallery-slide";

        /*
         * वास्तविक पहिलो image लाई active गर्ने
         */
        if (index === 0) {
            slide.classList.add("active");
        }

        const image =
            document.createElement("img");

        image.src =
            imageUrl;

        image.alt =
            item.Title || "फोटो ग्यालरी";

        /*
         * Image load error भए console मा देखाउने
         */
        image.onerror = function () {
            console.error(
                "Gallery image failed to load:",
                imageUrl
            );
        };

        slide.appendChild(image);

        container.appendChild(slide);
    });

    startGallerySlideshow();
}
/* =========================================================
   12. GALLERY SLIDESHOW
   ========================================================= */

function startGallerySlideshow() {

    const slides =
        document.querySelectorAll(
            ".gallery-slide"
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

    }, 6000);
}


/* =========================================================
   13. PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Digital Board loading..."
        );

        /*
         * सबै API एकसाथ load गर्ने
         */
        loadNewsTicker();

        loadNoticeSlideshow();

        loadElectedOfficials();

        loadStaff();

        loadGallery();

    }
);
