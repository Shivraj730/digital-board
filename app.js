/* ============================================================
   DIGITAL BOARD JAVASCRIPT
   ब्याँस गाउँपालिका, सुन्सेरा, दार्चुला
   ============================================================ */


/* ============================================================
   1. DRUPAL API URL CONFIGURATION
   ============================================================

   IMPORTANT:

   यी URL हरू Drupal बाट आउने JSON API हुन्।

   तपाईंले पछि API URL परिवर्तन गर्नुपरेमा
   तलको भागमा मात्र परिवर्तन गर्नुहोस्।

   ============================================================ */


/*
   ------------------------------------------------------------
   NOTICE / NEWS API
   ------------------------------------------------------------

   Drupal View:
   Digital Notice Board

   Data export path:
   /digital-board-api
*/
const NOTICE_API =
    "https://vyansmun.gov.np/digital-board-api";


/*
   ------------------------------------------------------------
   STAFF API
   ------------------------------------------------------------

   तपाईंको Drupal मा भएको:
   Staff API for LG App

   API path:
   /staff-api

   NOTE:
   अहिले exact JSON structure verify गर्न बाँकी छ।
   त्यसैले यो URL placeholder/configuration का रूपमा राखिएको छ।
*/
const STAFF_API =
    "https://vyansmun.gov.np/staff-api";


/*
   ------------------------------------------------------------
   ELECTED OFFICIALS API
   ------------------------------------------------------------

   Drupal View:
   Officials API for LG App

   API path:
   /elected-officials-api
*/
const ELECTED_OFFICIALS_API =
    "https://vyansmun.gov.np/elected-officials-api";


/*
   ------------------------------------------------------------
   PHOTO GALLERY API
   ------------------------------------------------------------

   तपाईंको Drupal मा भएको:

   slider-api-features

   API path:
   /slider-api
*/
const GALLERY_API =
    "https://vyansmun.gov.np/slider-api";



/* ============================================================
   2. GENERAL API FUNCTION
   ============================================================ */

async function getApiData(url) {

    try {

        const response = await fetch(url, {
            method: "GET",

            headers: {
                "Accept": "application/json"
            },

            cache: "no-store"
        });


        if (!response.ok) {

            throw new Error(
                "API Error: " + response.status
            );
        }


        const data = await response.json();

        return data;

    } catch (error) {

        console.error(
            "API Loading Error:",
            url,
            error
        );

        return [];
    }
}



/* ============================================================
   3. IMAGE URL EXTRACTOR
   ============================================================

   अहिले Drupal को image field बाट यस्तो output आएको छ:

   <img typeof="foaf:Image"
        src="https://vyansmun.gov.np/sites/..."
        width="620"
        height="910"
        alt="" />

   यो function ले त्यसबाट केवल src URL निकाल्छ।

   ============================================================ */

function getImageUrl(imageValue) {

    if (!imageValue) {
        return "";
    }


    /*
       यदि Drupal ले सिधै URL दिएको छ भने
       त्यसलाई नै प्रयोग गर्ने।
    */

    if (
        typeof imageValue === "string" &&
        imageValue.startsWith("http")
    ) {
        return imageValue;
    }


    /*
       यदि <img> HTML आएको छ भने src निकाल्ने।
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



/* ============================================================
   4. NEWS TICKER
   ============================================================ */

async function loadNewsTicker() {

    const ticker =
        document.getElementById("newsTicker");


    const data =
        await getApiData(NOTICE_API);


    if (!Array.isArray(data) || data.length === 0) {

        ticker.textContent =
            "हाल कुनै सूचना उपलब्ध छैन।";

        return;
    }


    /*
       Notice API बाट title मात्र लिने।
    */

    const titles =
        data
            .map(item => item.title)
            .filter(title => title);


    if (titles.length === 0) {

        ticker.textContent =
            "हाल कुनै सूचना उपलब्ध छैन।";

        return;
    }


    /*
       सबै title लाई separator सहित जोड्ने।
    */

    ticker.textContent =
        titles.join("     •     ");
}



/* ============================================================
   5. NOTICE IMAGE SLIDESHOW
   ============================================================ */

async function loadNoticeSlideshow() {

    const container =
        document.getElementById("noticeSlider");


    const data =
        await getApiData(NOTICE_API);


    if (!Array.isArray(data)) {

        container.innerHTML =
            '<div class="loading">सूचना उपलब्ध छैन।</div>';

        return;
    }


    /*
       केवल image भएको notice मात्र slideshow मा राख्ने।

       Image खाली भएको:
       image: ""

       त्यस्ता item skip हुन्छन्।
    */

    const notices =
        data
            .map(item => {

                return {

                    title: item.title || "",

                    image:
                        getImageUrl(item.image)

                };

            })
            .filter(item => item.image);


    if (notices.length === 0) {

        container.innerHTML =
            '<div class="loading">सूचना image उपलब्ध छैन।</div>';

        return;
    }


    container.innerHTML = "";


    /*
       प्रत्येक notice को slide बनाउने।
    */

    notices.forEach((notice, index) => {

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
            notice.image;


        image.alt =
            notice.title;


        const title =
            document.createElement("div");


        title.className =
            "notice-title";


        title.textContent =
            notice.title;


        slide.appendChild(image);

        slide.appendChild(title);

        container.appendChild(slide);

    });


    startNoticeSlideshow();
}



/* ------------------------------------------------------------
   Notice slideshow timer
   ------------------------------------------------------------ */

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
            (current + 1) % slides.length;


        slides[current]
            .classList.add("active");


    }, 7000);
}



/* ============================================================
   6. ELECTED OFFICIALS
   ============================================================

   IMPORTANT:

   यहाँ exact Drupal JSON structure verify भएपछि
   field mapping मिलाइनेछ।

   सम्भावित field:
   name
   image
   designation
   phone

   अहिले flexible mapping राखिएको छ।

   ============================================================ */

async function loadElectedOfficials() {

    const container =
        document.getElementById(
            "electedOfficials"
        );


    const data =
        await getApiData(
            ELECTED_OFFICIALS_API
        );


    if (!Array.isArray(data) || data.length === 0) {

        container.innerHTML =
            '<div class="loading">जनप्रतिनिधि विवरण उपलब्ध छैन।</div>';

        return;
    }


    container.innerHTML = "";


    /*
       पहिलो 3 जनप्रतिनिधि देखाउने।

       पछि आवश्यक भए slider बनाउन सकिन्छ।
    */

    data.slice(0, 3).forEach(person => {

        const card =
            document.createElement("div");


        card.className =
            "official-card";


        const image =
            document.createElement("img");


        /*
           सम्भावित image fields
        */

        image.src =
            getImageUrl(
                person.image ||
                person.Image ||
                person.field_image ||
                ""
            );


        image.alt =
            person.name || "";


        const name =
            document.createElement("div");


        name.className =
            "official-name";


        name.textContent =
            person.name ||
            person.title ||
            "";


        const position =
            document.createElement("div");


        position.className =
            "official-position";


        position.textContent =
            person.designation ||
            person.position ||
            person.post ||
            "";


        card.appendChild(image);

        card.appendChild(name);

        card.appendChild(position);

        container.appendChild(card);

    });

}



/* ============================================================
   7. STAFF SLIDESHOW
   ============================================================ */

async function loadStaff() {

    const container =
        document.getElementById(
            "staffSlider"
        );


    const data =
        await getApiData(STAFF_API);


    if (!Array.isArray(data) || data.length === 0) {

        container.innerHTML =
            '<div class="loading">कर्मचारी विवरण उपलब्ध छैन।</div>';

        return;
    }


    container.innerHTML = "";


    data.forEach((staff, index) => {

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
            getImageUrl(
                staff.image ||
                staff.Image ||
                staff.field_image ||
                ""
            );


        image.alt =
            staff.name ||
            staff.title ||
            "";


        const info =
            document.createElement("div");


        info.className =
            "staff-info";


        const name =
            document.createElement("div");


        name.className =
            "staff-name";


        name.textContent =
            staff.name ||
            staff.title ||
            "";


        const position =
            document.createElement("div");


        position.className =
            "staff-position";


        position.textContent =
            staff.designation ||
            staff.position ||
            staff.post ||
            "";


        const phone =
            document.createElement("div");


        phone.className =
            "staff-phone";


        phone.textContent =
            staff.phone ||
            staff.mobile ||
            staff.telephone ||
            "";


        info.appendChild(name);

        info.appendChild(position);

        info.appendChild(phone);


        card.appendChild(image);

        card.appendChild(info);


        container.appendChild(card);

    });


    startStaffSlideshow();

}



/* ------------------------------------------------------------
   Staff slideshow timer
   ------------------------------------------------------------ */

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
            (current + 1) % slides.length;


        slides[current]
            .classList.add("active");


    }, 6000);

}



/* ============================================================
   8. PHOTO GALLERY
   ============================================================ */

async function loadGallery() {

    const container =
        document.getElementById(
            "photoGallery"
        );


    const data =
        await getApiData(
            GALLERY_API
        );


    if (!Array.isArray(data) || data.length === 0) {

        container.innerHTML =
            '<div class="loading">फोटो ग्यालरी उपलब्ध छैन।</div>';

        return;
    }


    container.innerHTML = "";


    data.forEach((item, index) => {

        const imageUrl =
            getImageUrl(
                item.image ||
                item.Image ||
                item.field_image ||
                ""
            );


        if (!imageUrl) {
            return;
        }


        const slide =
            document.createElement("div");


        slide.className =
            "gallery-slide";


        if (index === 0) {

            slide.classList.add("active");
        }


        const image =
            document.createElement("img");


        image.src =
            imageUrl;


        image.alt =
            item.title || "";


        slide.appendChild(image);


        container.appendChild(slide);

    });


    startGallerySlideshow();

}



/* ------------------------------------------------------------
   Gallery slideshow timer
   ------------------------------------------------------------ */

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
            (current + 1) % slides.length;


        slides[current]
            .classList.add("active");


    }, 5000);

}



/* ============================================================
   9. START DIGITAL BOARD
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Notice / News
        */
        loadNewsTicker();

        loadNoticeSlideshow();


        /*
           Elected Officials
        */
        loadElectedOfficials();


        /*
           Staff
        */
        loadStaff();


        /*
           Photo Gallery
        */
        loadGallery();

    }
);
