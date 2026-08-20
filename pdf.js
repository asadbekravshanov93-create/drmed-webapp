/* =========================================================
   DR.MED — UNIVERSAL PDF ENGINE
   pdf.js

   A4 / A5
   Desktop Download
   Android Share
   iPhone / iPad Share
   Telegram WebApp Share
   ========================================================= */

"use strict";

(function () {

    let isGenerating = false;


    /* =====================================================
       YORDAMCHI FUNKSIYALAR
       ===================================================== */

    function get(id) {
        return document.getElementById(id);
    }


    function getPatientName() {

        const input = get("p_name");

        if (!input || !input.value) {
            return "Bemor";
        }

        return input.value
            .trim()
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            ) || "Bemor";
    }


    function getFileName(format) {

        return (
            "DRMED_Retsept_" +
            String(format).toUpperCase() +
            "_" +
            getPatientName() +
            ".pdf"
        );
    }


    /* =====================================================
       QURILMA ANIQLASH
       ===================================================== */

    function isIOS() {

        return (
            /iPad|iPhone|iPod/i.test(
                navigator.userAgent
            ) ||
            (
                navigator.platform === "MacIntel" &&
                navigator.maxTouchPoints > 1
            )
        );
    }


    function isAndroid() {

        return /Android/i.test(
            navigator.userAgent
        );
    }


    function isMobile() {

        return (
            isIOS() ||
            isAndroid() ||
            /Mobile/i.test(
                navigator.userAgent
            )
        );
    }


    function isTelegramWebApp() {

        try {

            return !!(
                window.Telegram &&
                window.Telegram.WebApp &&
                window.Telegram.WebApp.initData
            );

        } catch (e) {

            return false;
        }
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading(message) {

        let loader =
            get("drmedPdfLoading");


        if (!loader) {

            loader =
                document.createElement("div");

            loader.id =
                "drmedPdfLoading";


            loader.innerHTML = `
                <div
                    class="drmed-pdf-loading-box"
                    style="
                        background:#fff;
                        padding:28px 34px;
                        border-radius:18px;
                        text-align:center;
                        min-width:240px;
                        box-shadow:
                            0 20px 70px
                            rgba(0,0,0,.3);
                    "
                >

                    <div
                        class="drmed-pdf-spinner"
                        style="
                            width:42px;
                            height:42px;
                            border:4px solid #e2e8f0;
                            border-top-color:#0d9488;
                            border-radius:50%;
                            margin:0 auto 16px;
                            animation:
                                drmedPdfSpin
                                .8s linear infinite;
                        "
                    ></div>

                    <div
                        id="drmedPdfLoadingText"
                        style="
                            color:#0f172a;
                            font-size:15px;
                            font-weight:600;
                        "
                    >
                        PDF tayyorlanmoqda...
                    </div>

                </div>
            `;


            Object.assign(
                loader.style,
                {
                    position: "fixed",
                    inset: "0",
                    zIndex: "999999",
                    background:
                        "rgba(15,23,42,.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }
            );


            const style =
                document.createElement("style");


            style.textContent = `
                @keyframes drmedPdfSpin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `;


            document.head.appendChild(
                style
            );


            document.body.appendChild(
                loader
            );
        }


        const text =
            get("drmedPdfLoadingText");


        if (text) {
            text.textContent =
                message ||
                "PDF tayyorlanmoqda...";
        }


        loader.style.display =
            "flex";
    }


    function hideLoading() {

        const loader =
            get("drmedPdfLoading");


        if (loader) {
            loader.style.display =
                "none";
        }
    }


    /* =====================================================
       FORMAT MODAL
       ===================================================== */

    function openPdfFormatModal() {

        const modal =
            get("pdfFormatModal");


        if (!modal) {

            alert(
                "PDF format oynasi topilmadi."
            );

            return;
        }


        modal.classList.add(
            "active"
        );


        modal.style.display =
            "flex";
    }


    function closePdfFormatModal() {

        const modal =
            get("pdfFormatModal");


        if (!modal) {
            return;
        }


        modal.classList.remove(
            "active"
        );


        modal.style.display =
            "none";
    }


    /* =====================================================
       RETSEPTNI PDF UCHUN TAYYORLASH
       ===================================================== */

    async function createPrescriptionClone() {

        const original =
            get("printablePaper");


        if (!original) {

            throw new Error(
                "printablePaper topilmadi."
            );
        }


        /*
         * Ekrandagi ma'lumotlarni yangilash.
         */

        if (
            typeof window.liveUpdate ===
            "function"
        ) {

            try {
                window.liveUpdate();
            } catch (e) {
                console.warn(
                    "liveUpdate xatosi:",
                    e
                );
            }
        }


        /*
         * Original retseptga tegmaymiz.
         */

        const clone =
            original.cloneNode(
                true
            );


        clone.id =
            "drmedPdfClone";


        Object.assign(
            clone.style,
            {
                position: "fixed",

                left: "-10000px",

                top: "0",

                width: "794px",

                minWidth: "794px",

                maxWidth: "794px",

                height: "auto",

                minHeight: "1123px",

                margin: "0",

                padding: "0",

                background: "#ffffff",

                color: "#000000",

                display: "block",

                visibility: "visible",

                opacity: "1",

                transform: "none",

                overflow: "visible",

                boxSizing: "border-box"
            }
        );


        /*
         * Ichidagi elementlarni ko'rinadigan qilamiz.
         */

        clone
            .querySelectorAll("*")
            .forEach(
                function (element) {

                    element.style.visibility =
                        "visible";

                    element.style.opacity =
                        "1";

                }
            );


        document.body.appendChild(
            clone
        );


        /*
         * Rasmlarni kutamiz.
         */

        const images =
            Array.from(
                clone.querySelectorAll(
                    "img"
                )
            );


        await Promise.all(

            images.map(
                function (image) {

                    if (
                        image.complete
                    ) {

                        return Promise.resolve();

                    }


                    return new Promise(
                        function (resolve) {

                            image.onload =
                                resolve;

                            image.onerror =
                                resolve;


                            setTimeout(
                                resolve,
                                5000
                            );

                        }
                    );

                }
            )

        );


        /*
         * Browser render.
         */

        await new Promise(
            function (resolve) {

                requestAnimationFrame(
                    resolve
                );

            }
        );


        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    250
                );

            }
        );


        return clone;
    }


    /* =====================================================
       HTML → CANVAS
       ===================================================== */

    async function createCanvas(
        clone
    ) {

        if (
            typeof window.html2canvas !==
            "function"
        ) {

            throw new Error(
                "html2canvas yuklanmagan."
            );
        }


        const canvas =
            await window.html2canvas(
                clone,
                {

                    scale: 2,

                    useCORS: true,

                    allowTaint: false,

                    backgroundColor:
                        "#ffffff",

                    logging: false,

                    imageTimeout:
                        15000,

                    scrollX: 0,

                    scrollY: 0,


                    onclone:
                        function (
                            documentClone
                        ) {

                            const paper =
                                documentClone
                                    .getElementById(
                                        "drmedPdfClone"
                                    );


                            if (!paper) {
                                return;
                            }


                            paper.style.position =
                                "absolute";

                            paper.style.left =
                                "0";

                            paper.style.top =
                                "0";

                            paper.style.width =
                                "794px";

                            paper.style.minWidth =
                                "794px";

                            paper.style.maxWidth =
                                "794px";

                            paper.style.height =
                                "auto";

                            paper.style.minHeight =
                                "1123px";

                            paper.style.display =
                                "block";

                            paper.style.visibility =
                                "visible";

                            paper.style.opacity =
                                "1";

                            paper.style.background =
                                "#ffffff";

                            paper.style.transform =
                                "none";

                        }

                }
            );


        if (
            !canvas ||
            canvas.width <= 0 ||
            canvas.height <= 0
        ) {

            throw new Error(
                "Retsept canvasga aylantirilmadi."
            );
        }


        return canvas;
    }


    /* =====================================================
       A4 PDF
       ===================================================== */

    function makeA4(
        canvas
    ) {

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            throw new Error(
                "jsPDF yuklanmagan."
            );
        }


        const jsPDF =
            window.jspdf.jsPDF;


        const pdf =
            new jsPDF(
                {
                    orientation:
                        "portrait",

                    unit:
                        "mm",

                    format:
                        "a4",

                    compress:
                        true
                }
            );


        const pageWidth =
            210;

        const pageHeight =
            297;

        const margin =
            5;


        const availableWidth =
            pageWidth -
            margin * 2;


        const availableHeight =
            pageHeight -
            margin * 2;


        let width =
            availableWidth;


        let height =
            canvas.height *
            width /
            canvas.width;


        /*
         * A4 sahifadan oshirmaymiz.
         */

        if (
            height >
            availableHeight
        ) {

            const ratio =
                availableHeight /
                height;


            width *=
                ratio;

            height *=
                ratio;
        }


        const x =
            (
                pageWidth -
                width
            ) / 2;


        const y =
            margin;


        const image =
            canvas.toDataURL(
                "image/jpeg",
                0.95
            );


        pdf.addImage(
            image,
            "JPEG",
            x,
            y,
            width,
            height,
            undefined,
            "FAST"
        );


        return pdf;
    }


    /* =====================================================
       A5 LANDSCAPE
       CHAP YARMI = RETSEPT
       O'NG YARMI = BO'SH
       ===================================================== */

    function makeA5(
        canvas
    ) {

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            throw new Error(
                "jsPDF yuklanmagan."
            );
        }


        const jsPDF =
            window.jspdf.jsPDF;


        const pdf =
            new jsPDF(
                {
                    orientation:
                        "landscape",

                    unit:
                        "mm",

                    format:
                        "a5",

                    compress:
                        true
                }
            );


        /*
         * A5 landscape:
         *
         * 210 × 148 mm
         *
         * Chap:
         * 105 mm
         *
         * O'ng:
         * 105 mm bo'sh
         */

        const pageWidth =
            210;

        const pageHeight =
            148;

        const halfWidth =
            105;

        const margin =
            4;


        const availableWidth =
            halfWidth -
            margin * 2;


        const availableHeight =
            pageHeight -
            margin * 2;


        let width =
            availableWidth;


        let height =
            canvas.height *
            width /
            canvas.width;


        if (
            height >
            availableHeight
        ) {

            const ratio =
                availableHeight /
                height;


            width *=
                ratio;

            height *=
                ratio;
        }


        const x =
            margin;


        const y =
            (
                pageHeight -
                height
            ) / 2;


        const image =
            canvas.toDataURL(
                "image/jpeg",
                0.95
            );


        pdf.addImage(
            image,
            "JPEG",
            x,
            y,
            width,
            height,
            undefined,
            "FAST"
        );


        return pdf;
    }


    /* =====================================================
       PDF → BLOB
       ===================================================== */

    function pdfToBlob(
        pdf
    ) {

        if (!pdf) {

            throw new Error(
                "PDF obyektini yaratib bo'lmadi."
            );
        }


        const blob =
            pdf.output(
                "blob"
            );


        if (!blob) {

            throw new Error(
                "PDF Blob yaratilmadi."
            );
        }


        if (
            blob.size <= 0
        ) {

            throw new Error(
                "PDF fayli bo'sh."
            );
        }


        return blob;
    }


    /* =====================================================
       FILE YARATISH
       ===================================================== */

    function blobToFile(
        blob,
        format
    ) {

        return new File(
            [
                blob
            ],

            getFileName(
                format
            ),

            {
                type:
                    "application/pdf",

                lastModified:
                    Date.now()
            }
        );
    }


    /* =====================================================
       DESKTOP DOWNLOAD
       ===================================================== */

    async function desktopDownload(
        blob,
        name
    ) {

        /*
         * 1. Oddiy Blob URL.
         */

        const url =
            URL.createObjectURL(
                blob
            );


        try {

            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                name;


            link.setAttribute(
                "download",
                name
            );


            link.style.position =
                "fixed";

            link.style.left =
                "-10000px";

            link.style.top =
                "-10000px";

            link.style.width =
                "1px";

            link.style.height =
                "1px";

            link.style.opacity =
                "0";


            document.body.appendChild(
                link
            );


            /*
             * Eng muhim click.
             */

            link.click();


            /*
             * Ba'zi browserlar uchun fallback.
             */

            setTimeout(
                function () {

                    try {

                        link.dispatchEvent(
                            new MouseEvent(
                                "click",
                                {
                                    bubbles:
                                        true,

                                    cancelable:
                                        true,

                                    view:
                                        window
                                }
                            )
                        );

                    } catch (e) {

                        console.warn(
                            "Download fallback:",
                            e
                        );

                    }

                },
                150
            );


            setTimeout(
                function () {

                    try {
                        link.remove();
                    } catch (e) {}


                    try {
                        URL.revokeObjectURL(
                            url
                        );
                    } catch (e) {}

                },
                15000
            );


            return true;

        } catch (error) {

            try {
                URL.revokeObjectURL(
                    url
                );
            } catch (e) {}


            throw error;
        }
    }


    /* =====================================================
       UNIVERSAL PDF ACTION
       ===================================================== */

    async function universalPdfAction(
        blob,
        format,
        mode
    ) {

        const name =
            getFileName(
                format
            );


        const file =
            blobToFile(
                blob,
                format
            );


        /*
         * =================================================
         * TELEGRAM / SHARE MODE
         * =================================================
         */

        if (
            mode === "share"
        ) {

            /*
             * navigator.share mavjud bo'lsa,
             * PDFning o'zini yuboramiz.
             */

            if (
                typeof navigator.share ===
                "function"
            ) {

                /*
                 * canShare mavjud bo'lsa tekshiramiz.
                 */

                if (
                    typeof navigator.canShare ===
                    "function"
                ) {

                    let canShareFile =
                        false;


                    try {

                        canShareFile =
                            navigator.canShare(
                                {
                                    files:
                                        [file]
                                }
                            );

                    } catch (e) {

                        canShareFile =
                            false;
                    }


                    if (
                        canShareFile
                    ) {

                        await navigator.share(
                            {
                                title:
                                    "DR.MED Elektron Retsept",

                                text:
                                    "DR.MED elektron retsept",

                                files:
                                    [file]
                            }
                        );


                        return true;
                    }

                } else {

                    /*
                     * Ba'zi eski browserlar
                     * canShare bermaydi,
                     * lekin share mavjud.
                     */

                    try {

                        await navigator.share(
                            {
                                title:
                                    "DR.MED Elektron Retsept",

                                text:
                                    "DR.MED elektron retsept",

                                files:
                                    [file]
                            }
                        );


                        return true;

                    } catch (error) {

                        if (
                            error &&
                            error.name ===
                            "AbortError"
                        ) {

                            return false;
                        }

                    }

                }
            }


            /*
             * Share mavjud bo'lmasa
             * downloadga o'tamiz.
             */

            return await desktopDownload(
                blob,
                name
            );
        }


        /*
         * =================================================
         * DOWNLOAD MODE
         * =================================================
         */

        /*
         * iPhone / iPad:
         *
         * iOS avtomatik Downloads papkasiga
         * yozishga ruxsat bermaydi.
         *
         * PDF faylni Share orqali
         * Save to Files qilish kerak.
         */

        if (
            isIOS() &&
            typeof navigator.share ===
            "function"
        ) {

            try {

                if (
                    typeof navigator.canShare ===
                    "function"
                ) {

                    const canShare =
                        navigator.canShare(
                            {
                                files:
                                    [file]
                            }
                        );


                    if (
                        canShare
                    ) {

                        await navigator.share(
                            {
                                title:
                                    "DR.MED PDF",

                                text:
                                    "PDF retseptni saqlash",

                                files:
                                    [file]
                            }
                        );


                        return true;
                    }

                } else {

                    await navigator.share(
                        {
                            title:
                                "DR.MED PDF",

                            text:
                                "PDF retseptni saqlash",

                            files:
                                [file]
                        }
                    );


                    return true;
                }

            } catch (error) {

                /*
                 * User Share oynasini yopsa.
                 */

                if (
                    error &&
                    error.name ===
                    "AbortError"
                ) {

                    return false;
                }


                console.warn(
                    "iOS Share xatosi:",
                    error
                );
            }
        }


        /*
         * Android:
         *
         * Avval downloadga urinadi.
         * Download ishlamasa Share.
         */

        if (
            isAndroid()
        ) {

            try {

                const result =
                    await desktopDownload(
                        blob,
                        name
                    );


                if (result) {
                    return true;
                }

            } catch (error) {

                console.warn(
                    "Android download fallback:",
                    error
                );
            }


            /*
             * Share fallback.
             */

            if (
                typeof navigator.share ===
                "function"
            ) {

                try {

                    await navigator.share(
                        {
                            title:
                                "DR.MED Elektron Retsept",

                            text:
                                "DR.MED elektron retsept",

                            files:
                                [file]
                        }
                    );


                    return true;

                } catch (error) {

                    if (
                        error &&
                        error.name ===
                        "AbortError"
                    ) {

                        return false;
                    }
                }
            }
        }


        /*
         * Desktop:
         *
         * Windows / Mac / Linux
         */

        return await desktopDownload(
            blob,
            name
        );
    }


    /* =====================================================
       ASOSIY EXPORT
       ===================================================== */

    async function exportToPDF(
        format
    ) {

        if (
            isGenerating
        ) {

            return;
        }


        isGenerating =
            true;


        let clone =
            null;


        try {

            closePdfFormatModal();


            format =
                String(
                    format ||
                    "a4"
                ).toLowerCase();


            if (
                format !== "a4" &&
                format !== "a5"
            ) {

                format =
                    "a4";
            }


            showLoading(

                format === "a5"

                    ? "A5 PDF tayyorlanmoqda..."

                    : "A4 PDF tayyorlanmoqda..."

            );


            /*
             * Retsept clone.
             */

            clone =
                await createPrescriptionClone();


            /*
             * Canvas.
             */

            const canvas =
                await createCanvas(
                    clone
                );


            /*
             * PDF yaratish.
             */

            let pdf;


            if (
                format === "a5"
            ) {

                pdf =
                    makeA5(
                        canvas
                    );

            } else {

                pdf =
                    makeA4(
                        canvas
                    );
            }


            /*
             * Blob.
             */

            const blob =
                pdfToBlob(
                    pdf
                );


            console.log(
                "DR.MED PDF:",
                format,
                blob.size,
                "bytes"
            );


            /*
             * DOWNLOAD.
             */

            await universalPdfAction(
                blob,
                format,
                "download"
            );


            hideLoading();


        } catch (error) {

            console.error(
                "DR.MED PDF DOWNLOAD ERROR:",
                error
            );


            hideLoading();


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return;
            }


            alert(
                "❌ PDF yuklanmadi.\n\n" +
                (
                    error &&
                    error.message
                        ? error.message
                        : "Noma'lum xatolik"
                )
            );


        } finally {

            if (clone) {

                try {
                    clone.remove();
                } catch (e) {}

            }


            isGenerating =
                false;
        }
    }


    /* =====================================================
       TELEGRAM / NATIVE SHARE
       ===================================================== */

    async function shareTelegram() {

        if (
            isGenerating
        ) {

            return;
        }


        isGenerating =
            true;


        let clone =
            null;


        try {

            showLoading(
                "PDF tayyorlanmoqda..."
            );


            /*
             * Retsept clone.
             */

            clone =
                await createPrescriptionClone();


            /*
             * Canvas.
             */

            const canvas =
                await createCanvas(
                    clone
                );


            /*
             * Telegram uchun A4.
             */

            const pdf =
                makeA4(
                    canvas
                );


            /*
             * Blob.
             */

            const blob =
                pdfToBlob(
                    pdf
                );


            /*
             * PDFni Share qilamiz.
             */

            hideLoading();


            await universalPdfAction(
                blob,
                "a4",
                "share"
            );


        } catch (error) {

            console.error(
                "DR.MED TELEGRAM SHARE ERROR:",
                error
            );


            hideLoading();


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return;
            }


            /*
             * Agar Share ishlamasa,
             * PDFni baribir yuklab beramiz.
             */

            try {

                if (clone) {

                    try {
                        clone.remove();
                    } catch (e) {}

                    clone = null;
                }


                showLoading(
                    "PDF yuklanmoqda..."
                );


                /*
                 * Qayta yaratamiz.
                 */

                clone =
                    await createPrescriptionClone();


                const canvas =
                    await createCanvas(
                        clone
                    );


                const pdf =
                    makeA4(
                        canvas
                    );


                const blob =
                    pdfToBlob(
                        pdf
                    );


                await desktopDownload(
                    blob,
                    getFileName("a4")
                );


                hideLoading();


            } catch (fallbackError) {

                hideLoading();


                console.error(
                    "Share fallback ERROR:",
                    fallbackError
                );


                alert(
                    "❌ PDFni yuborish/yuklashda xatolik.\n\n" +
                    (
                        fallbackError &&
                        fallbackError.message
                            ? fallbackError.message
                            : "Noma'lum xatolik"
                    )
                );
            }


        } finally {

            if (clone) {

                try {
                    clone.remove();
                } catch (e) {}

            }


            isGenerating =
                false;
        }
    }


    /* =====================================================
       GLOBAL FUNKSIYALAR
       INDEX.HTML UCHUN
       ===================================================== */

    window.openPdfFormatModal =
        openPdfFormatModal;


    window.closePdfFormatModal =
        closePdfFormatModal;


    window.exportToPDF =
        exportToPDF;


    window.shareTelegram =
        shareTelegram;


    /* =====================================================
       APP.JS UCHUN
       ===================================================== */

    window.DRMED_PDF = {

        openFormatModal:
            openPdfFormatModal,


        closeFormatModal:
            closePdfFormatModal,


        downloadA4:
            function () {

                return exportToPDF(
                    "a4"
                );

            },


        downloadA5:
            function () {

                return exportToPDF(
                    "a5"
                );

            },


        export:
            exportToPDF,


        share:
            shareTelegram

    };


    /* =====================================================
       MODULE YUKLANGANINI KO'RSATISH
       ===================================================== */

    console.log(
        "✅ DR.MED UNIVERSAL PDF MODULE LOADED"
    );


})();
