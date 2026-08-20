/* =========================================================
   DR.MED — PDF ENGINE
   pdf.js
   ========================================================= */

"use strict";

(function () {

    let isGenerating = false;


    /* =====================================================
       YORDAMCHI
       ===================================================== */

    function get(id) {
        return document.getElementById(id);
    }


    function patientName() {

        const el = get("p_name");

        if (!el || !el.value.trim()) {
            return "Bemor";
        }

        return el.value
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    }


    function fileName(format) {

        return (
            "DRMED_Retsept_" +
            format.toUpperCase() +
            "_" +
            patientName() +
            ".pdf"
        );
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading(text) {

        let loader =
            get("drmedPdfLoading");

        if (!loader) {

            loader =
                document.createElement("div");

            loader.id =
                "drmedPdfLoading";

            loader.innerHTML = `
                <div class="drmed-pdf-loading-box">

                    <div class="drmed-pdf-spinner"></div>

                    <div id="drmedPdfLoadingText">
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
                    background: "rgba(15,23,42,.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }
            );

            const box =
                loader.querySelector(
                    ".drmed-pdf-loading-box"
                );

            Object.assign(
                box.style,
                {
                    background: "#fff",
                    padding: "28px 35px",
                    borderRadius: "18px",
                    textAlign: "center",
                    minWidth: "230px",
                    boxShadow:
                        "0 20px 70px rgba(0,0,0,.3)"
                }
            );

            const spinner =
                loader.querySelector(
                    ".drmed-pdf-spinner"
                );

            Object.assign(
                spinner.style,
                {
                    width: "40px",
                    height: "40px",
                    border:
                        "4px solid #e2e8f0",
                    borderTopColor:
                        "#0d9488",
                    borderRadius: "50%",
                    margin:
                        "0 auto 15px",
                    animation:
                        "drmedPdfSpin .8s linear infinite"
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

            document.head.appendChild(style);

            document.body.appendChild(loader);
        }

        const text =
            get("drmedPdfLoadingText");

        if (text) {
            text.innerText = text;
        }

        loader.style.display = "flex";
    }


    function hideLoading() {

        const loader =
            get("drmedPdfLoading");

        if (loader) {
            loader.style.display = "none";
        }
    }


    /* =====================================================
       PDF FORMAT MODAL
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

        modal.classList.add("active");

        modal.style.display = "flex";
    }


    function closePdfFormatModal() {

        const modal =
            get("pdfFormatModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("active");

        modal.style.display = "none";
    }


    /* =====================================================
       RETSEPTNI CLONE QILISH
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
         * Retseptni yangilaymiz.
         */

        if (
            typeof window.liveUpdate ===
            "function"
        ) {

            window.liveUpdate();

        }


        /*
         * Original retseptga tegmaymiz.
         */

        const clone =
            original.cloneNode(true);

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
         * Ichki elementlarni ko'rinadigan qilamiz.
         */

        clone
            .querySelectorAll("*")
            .forEach(function (el) {

                el.style.visibility =
                    "visible";

                el.style.opacity =
                    "1";

            });


        document.body.appendChild(
            clone
        );


        /*
         * Rasmlarni kutamiz.
         */

        const images =
            Array.from(
                clone.querySelectorAll("img")
            );


        await Promise.all(

            images.map(
                function (img) {

                    if (img.complete) {
                        return Promise.resolve();
                    }


                    return new Promise(
                        function (resolve) {

                            img.onload =
                                resolve;

                            img.onerror =
                                resolve;


                            setTimeout(
                                resolve,
                                3000
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
                    300
                );

            }
        );


        return clone;
    }


    /* =====================================================
       HTML → CANVAS
       ===================================================== */

    async function createCanvas(clone) {

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
                        function (doc) {

                            const paper =
                                doc.getElementById(
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

                            paper.style.visibility =
                                "visible";

                            paper.style.opacity =
                                "1";

                            paper.style.display =
                                "block";

                            paper.style.background =
                                "#ffffff";

                            paper.style.transform =
                                "none";

                        }
                }
            );


        if (
            !canvas ||
            canvas.width === 0 ||
            canvas.height === 0
        ) {

            throw new Error(
                "Retsept rasmi yaratilmadi."
            );
        }


        return canvas;
    }


    /* =====================================================
       A4 PDF
       ===================================================== */

    function makeA4(canvas) {

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
            new jsPDF({

                orientation:
                    "portrait",

                unit:
                    "mm",

                format:
                    "a4",

                compress:
                    true

            });


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
         * A4dan oshirmaymiz.
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
       RETSEPT CHAP YARMIDA
       O'NG YARMI BO'SH
       ===================================================== */

    function makeA5(canvas) {

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
            new jsPDF({

                orientation:
                    "landscape",

                unit:
                    "mm",

                format:
                    "a5",

                compress:
                    true

            });


        /*
         * A5 landscape:
         *
         * 210 × 148 mm
         *
         * Retsept:
         * chap 105 mm
         *
         * O'ng 105 mm:
         * bo'sh
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
       HAQIQI PDF DOWNLOAD
       ===================================================== */

    async function forceDownloadPdf(
        pdf,
        format
    ) {

        if (!pdf) {

            throw new Error(
                "PDF obyektini yaratib bo'lmadi."
            );
        }


        /*
         * jsPDF → Blob
         */

        const blob =
            pdf.output("blob");


        if (!blob) {

            throw new Error(
                "PDF Blob yaratilmadi."
            );
        }


        if (
            blob.size === 0
        ) {

            throw new Error(
                "PDF fayli bo'sh."
            );
        }


        const name =
            fileName(format);


        /*
         * Object URL
         */

        const url =
            URL.createObjectURL(
                blob
            );


        try {

            /*
             * Download link.
             */

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


            link.target =
                "_self";


            link.rel =
                "noopener";


            /*
             * Ekranda ko'rinmasin.
             */

            link.style.position =
                "fixed";

            link.style.left =
                "-99999px";

            link.style.top =
                "-99999px";

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
             * Browserga real click.
             */

            link.click();


            /*
             * Ba'zi browserlar uchun
             * MouseEvent fallback.
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
                100
            );


            /*
             * Tozalash.
             */

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
                10000
            );


            console.log(
                "✅ PDF download boshlandi:",
                name,
                blob.size,
                "bytes"
            );


            return true;

        } catch (error) {

            URL.revokeObjectURL(
                url
            );

            throw error;
        }
    }


    /* =====================================================
       ASOSIY PDF EXPORT
       INDEX.HTML:
       exportToPDF('a4')
       exportToPDF('a5')
       ===================================================== */

    async function exportToPDF(
        format
    ) {

        if (isGenerating) {
            return;
        }


        isGenerating =
            true;


        let clone =
            null;


        try {

            /*
             * Modalni yopish.
             */

            closePdfFormatModal();


            /*
             * Formatni tekshirish.
             */

            format =
                String(format)
                    .toLowerCase();


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
             * PDF.
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
             * PDF yuklash.
             */

            await forceDownloadPdf(
                pdf,
                format
            );


            hideLoading();


        } catch (error) {

            console.error(
                "❌ DR.MED PDF ERROR:",
                error
            );


            hideLoading();


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
       TELEGRAM / SHARE
       BU QISMGA TEGMAYMIZ
       ===================================================== */

    async function shareTelegram() {

        if (isGenerating) {
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
                pdf.output(
                    "blob"
                );


            const file =
                new File(

                    [
                        blob
                    ],

                    fileName("a4"),

                    {
                        type:
                            "application/pdf"
                    }

                );


            /*
             * Telefon / planshet:
             * Native Share.
             */

            if (

                navigator.share &&

                navigator.canShare &&

                navigator.canShare(
                    {
                        files:
                            [file]
                    }
                )

            ) {

                hideLoading();


                await navigator.share({

                    title:
                        "DR.MED Elektron Retsept",

                    text:
                        "DR.MED elektron retsept",

                    files:
                        [file]

                });


                return;
            }


            /*
             * Kompyuter fallback.
             */

            await forceDownloadPdf(
                pdf,
                "a4"
            );


            hideLoading();


            alert(
                "PDF yuklandi. " +
                "Telegramga yuborish uchun " +
                "yuklangan PDF faylni Telegramga yuboring."
            );


        } catch (error) {

            console.error(
                "❌ DR.MED SHARE ERROR:",
                error
            );


            hideLoading();


            /*
             * Share oynasi yopilgan bo'lsa,
             * xatolik ko'rsatmaymiz.
             */

            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return;
            }


            alert(

                "❌ Telegram/Share ishlamadi.\n\n" +

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
       GLOBAL
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
       APP.JS INTEGRATION
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
       READY
       ===================================================== */

    console.log(
        "✅ DR.MED PDF MODULE LOADED"
    );


})();
