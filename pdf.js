/* =========================================================
   DR.MED — PDF ENGINE
   pdf.js
   ========================================================= */

(function () {

    "use strict";

    let pdfBusy = false;


    /* =====================================================
       YORDAMCHI FUNKSIYALAR
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    function getPatientName() {

        const el =
            getElement("p_name");

        if (!el) {
            return "Bemor";
        }

        return (
            el.value ||
            "Bemor"
        )
            .trim()
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            );
    }


    function getRxId() {

        const el =
            getElement("paper_rx_id");

        return (
            el?.innerText ||
            "RX-000000"
        ).trim();
    }


    function createFileName(
        format
    ) {

        const patient =
            getPatientName();

        const rxId =
            getRxId();

        return (
            `DRMED_Retsept_${format}_` +
            `${patient}_${rxId}.pdf`
        );
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showPdfLoading(
        text = "PDF tayyorlanmoqda..."
    ) {

        let loader =
            getElement(
                "drmedPdfLoader"
            );

        if (!loader) {

            loader =
                document.createElement(
                    "div"
                );

            loader.id =
                "drmedPdfLoader";

            loader.innerHTML = `
                <div class="drmed-pdf-loader-box">

                    <div class="drmed-pdf-spinner"></div>

                    <div
                        class="drmed-pdf-loader-text"
                        id="drmedPdfLoaderText"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                        "rgba(15,23,42,.45)",
                    backdropFilter:
                        "blur(4px)"
                }
            );

            const box =
                loader.querySelector(
                    ".drmed-pdf-loader-box"
                );

            Object.assign(
                box.style,
                {
                    background: "#ffffff",
                    borderRadius: "18px",
                    padding: "28px 35px",
                    minWidth: "240px",
                    textAlign: "center",
                    boxShadow:
                        "0 20px 60px rgba(0,0,0,.25)"
                }
            );

            const spinner =
                loader.querySelector(
                    ".drmed-pdf-spinner"
                );

            Object.assign(
                spinner.style,
                {
                    width: "38px",
                    height: "38px",
                    margin:
                        "0 auto 16px",
                    border:
                        "4px solid #e2e8f0",
                    borderTopColor:
                        "#0d9488",
                    borderRadius: "50%",
                    animation:
                        "drmedPdfSpin 0.8s linear infinite"
                }
            );

            const style =
                document.createElement(
                    "style"
                );

            style.textContent = `
                @keyframes drmedPdfSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .drmed-pdf-loader-text {
                    color: #0f172a;
                    font-size: 15px;
                    font-weight: 600;
                }
            `;

            document.head.appendChild(
                style
            );

            document.body.appendChild(
                loader
            );
        }

        const textEl =
            getElement(
                "drmedPdfLoaderText"
            );

        if (textEl) {
            textEl.innerText =
                text;
        }

        loader.style.display =
            "flex";
    }


    function hidePdfLoading() {

        const loader =
            getElement(
                "drmedPdfLoader"
            );

        if (loader) {
            loader.style.display =
                "none";
        }
    }


    /* =====================================================
       RETSEPTNI PDF UCHUN CLONE QILISH
       ===================================================== */

    async function preparePrescription() {

        /*
         * Sizning HTMLdagi asosiy retsept blankasi.
         */

        const original =
            getElement(
                "printablePaper"
            ) ||
            getElement(
                "prescriptionPaper"
            ) ||
            document.querySelector(
                ".rx-paper"
            );

        if (!original) {

            throw new Error(
                "Retsept blankasi topilmadi."
            );
        }


        /*
         * Ekrandagi original elementga
         * tegmaymiz.
         */

        const clone =
            original.cloneNode(
                true
            );

        clone.id =
            "drmedPdfClone";


        /*
         * PDF uchun aniq A4 kengligi.
         */

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

                background:
                    "#ffffff",

                color:
                    "#0f172a",

                display:
                    "block",

                visibility:
                    "visible",

                opacity:
                    "1",

                transform:
                    "none",

                overflow:
                    "visible",

                boxSizing:
                    "border-box"
            }
        );


        /*
         * Ichidagi barcha elementlarni
         * ko'rinadigan qilamiz.
         */

        clone
            .querySelectorAll("*")
            .forEach(
                element => {

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
                image => {

                    if (
                        image.complete
                    ) {
                        return Promise.resolve();
                    }

                    return new Promise(
                        resolve => {

                            image.onload =
                                resolve;

                            image.onerror =
                                resolve;

                            setTimeout(
                                resolve,
                                2000
                            );
                        }
                    );
                }
            )
        );


        /*
         * Browser layoutni
         * qayta hisoblasin.
         */

        await new Promise(
            resolve =>
                requestAnimationFrame(
                    resolve
                )
        );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    200
                )
        );


        return clone;
    }


    /* =====================================================
       HTML → CANVAS
       ===================================================== */

    async function renderCanvas(
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

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    backgroundColor:
                        "#ffffff",

                    logging:
                        false,

                    windowWidth:
                        794,

                    windowHeight:
                        Math.max(
                            1123,
                            clone.scrollHeight +
                                30
                        ),

                    scrollX:
                        0,

                    scrollY:
                        0,

                    imageTimeout:
                        15000,

                    onclone:
                        function (
                            clonedDocument
                        ) {

                            const paper =
                                clonedDocument
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
       CANVAS → A4 PDF
       ===================================================== */

    async function canvasToA4(
        canvas
    ) {

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            throw new Error(
                "jsPDF kutubxonasi yuklanmagan."
            );
        }


        const {
            jsPDF
        } =
            window.jspdf;


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


        const maxWidth =
            pageWidth -
            margin * 2;

        const maxHeight =
            pageHeight -
            margin * 2;


        let width =
            maxWidth;

        let height =
            canvas.height *
            width /
            canvas.width;


        if (
            height >
            maxHeight
        ) {

            const ratio =
                maxHeight /
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
                0.96
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
       CANVAS → A5 LANDSCAPE
       ===================================================== */

    async function canvasToA5(
        canvas
    ) {

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            throw new Error(
                "jsPDF kutubxonasi yuklanmagan."
            );
        }


        const {
            jsPDF
        } =
            window.jspdf;


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
         * Retsept:
         * chap 105 mm
         *
         * O'ng 105 mm:
         * BO'SH
         */

        const pageWidth =
            210;

        const pageHeight =
            148;

        const halfWidth =
            105;

        const margin =
            4;


        const maxWidth =
            halfWidth -
            margin * 2;

        const maxHeight =
            pageHeight -
            margin * 2;


        let width =
            maxWidth;

        let height =
            canvas.height *
            width /
            canvas.width;


        if (
            height >
            maxHeight
        ) {

            const ratio =
                maxHeight /
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
                0.96
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


        /*
         * O'ng tomonga hech narsa
         * qo'shilmaydi.
         *
         * Shu sababli u bo'sh qoladi.
         */


        return pdf;
    }


    /* =====================================================
       A4 YUKLASH
       ===================================================== */

    async function downloadA4() {

        if (pdfBusy) {
            return;
        }

        pdfBusy =
            true;


        let clone =
            null;


        try {

            showPdfLoading(
                "A4 PDF tayyorlanmoqda..."
            );


            /*
             * Agar mavjud bo'lsa
             * liveUpdate ishlatamiz.
             */

            if (
                typeof window.liveUpdate ===
                "function"
            ) {
                window.liveUpdate();
            }


            clone =
                await preparePrescription();


            const canvas =
                await renderCanvas(
                    clone
                );


            const pdf =
                await canvasToA4(
                    canvas
                );


            pdf.save(
                createFileName(
                    "A4"
                )
            );


        } catch (error) {

            console.error(
                "DR.MED A4 PDF ERROR:",
                error
            );


            alert(
                "❌ A4 PDF yaratilmadi.\n\n" +
                error.message
            );


        } finally {

            if (clone) {
                clone.remove();
            }

            hidePdfLoading();

            pdfBusy =
                false;
        }
    }


    /* =====================================================
       A5 YUKLASH
       ===================================================== */

    async function downloadA5() {

        if (pdfBusy) {
            return;
        }

        pdfBusy =
            true;


        let clone =
            null;


        try {

            showPdfLoading(
                "A5 PDF tayyorlanmoqda..."
            );


            if (
                typeof window.liveUpdate ===
                "function"
            ) {
                window.liveUpdate();
            }


            clone =
                await preparePrescription();


            const canvas =
                await renderCanvas(
                    clone
                );


            const pdf =
                await canvasToA5(
                    canvas
                );


            pdf.save(
                createFileName(
                    "A5"
                )
            );


        } catch (error) {

            console.error(
                "DR.MED A5 PDF ERROR:",
                error
            );


            alert(
                "❌ A5 PDF yaratilmadi.\n\n" +
                error.message
            );


        } finally {

            if (clone) {
                clone.remove();
            }

            hidePdfLoading();

            pdfBusy =
                false;
        }
    }


    /* =====================================================
       PDF FORMAT MODALI
       ===================================================== */

    function openPdfFormatModal() {

        const old =
            getElement(
                "drmedPdfFormatModal"
            );

        if (old) {
            old.remove();
        }


        const modal =
            document.createElement(
                "div"
            );

        modal.id =
            "drmedPdfFormatModal";


        Object.assign(
            modal.style,
            {
                position: "fixed",
                inset: "0",
                zIndex: "999998",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "rgba(15,23,42,.55)",
                padding: "20px"
            }
        );


        modal.innerHTML = `
            <div
                style="
                    width:min(430px,100%);
                    background:#fff;
                    border-radius:20px;
                    padding:24px;
                    box-shadow:
                        0 25px 80px
                        rgba(0,0,0,.25);
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:20px;
                    "
                >

                    <h3
                        style="
                            margin:0;
                            color:#0f172a;
                            font-size:20px;
                        "
                    >
                        📄 PDF formatini tanlang
                    </h3>

                    <button
                        type="button"
                        id="drmedPdfClose"
                        style="
                            border:0;
                            background:#f1f5f9;
                            width:36px;
                            height:36px;
                            border-radius:10px;
                            font-size:18px;
                            cursor:pointer;
                        "
                    >
                        ✕
                    </button>

                </div>


                <button
                    type="button"
                    id="drmedA4Button"
                    style="
                        width:100%;
                        border:1px solid #cbd5e1;
                        background:#fff;
                        padding:16px;
                        border-radius:14px;
                        margin-bottom:12px;
                        cursor:pointer;
                        text-align:left;
                        display:flex;
                        align-items:center;
                        gap:14px;
                    "
                >

                    <span
                        style="
                            font-size:30px;
                        "
                    >
                        📄
                    </span>

                    <span>
                        <strong
                            style="
                                display:block;
                                font-size:16px;
                                color:#0f172a;
                            "
                        >
                            A4 — Knijniy
                        </strong>

                        <small
                            style="
                                display:block;
                                margin-top:4px;
                                color:#64748b;
                            "
                        >
                            To'liq A4 sahifa
                        </small>
                    </span>

                </button>


                <button
                    type="button"
                    id="drmedA5Button"
                    style="
                        width:100%;
                        border:1px solid #cbd5e1;
                        background:#fff;
                        padding:16px;
                        border-radius:14px;
                        cursor:pointer;
                        text-align:left;
                        display:flex;
                        align-items:center;
                        gap:14px;
                    "
                >

                    <span
                        style="
                            font-size:30px;
                        "
                    >
                        📰
                    </span>

                    <span>
                        <strong
                            style="
                                display:block;
                                font-size:16px;
                                color:#0f172a;
                            "
                        >
                            A5 — Albom
                        </strong>

                        <small
                            style="
                                display:block;
                                margin-top:4px;
                                color:#64748b;
                            "
                        >
                            Chap yarmida retsept,
                            o'ng yarmi bo'sh
                        </small>
                    </span>

                </button>

            </div>
        `;


        document.body.appendChild(
            modal
        );


        getElement(
            "drmedPdfClose"
        ).onclick =
            function () {

                modal.remove();
            };


        getElement(
            "drmedA4Button"
        ).onclick =
            function () {

                modal.remove();

                downloadA4();
            };


        getElement(
            "drmedA5Button"
        ).onclick =
            function () {

                modal.remove();

                downloadA5();
            };


        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    modal.remove();
                }
            }
        );
    }


    /* =====================================================
       PDF → FILE
       TELEGRAM / SHARE UCHUN
       ===================================================== */

    async function createA4PdfFile() {

        let clone =
            null;


        try {

            if (
                typeof window.liveUpdate ===
                "function"
            ) {
                window.liveUpdate();
            }


            clone =
                await preparePrescription();


            const canvas =
                await renderCanvas(
                    clone
                );


            const pdf =
                await canvasToA4(
                    canvas
                );


            const blob =
                pdf.output(
                    "blob"
                );


            const filename =
                createFileName(
                    "A4"
                );


            return new File(
                [blob],
                filename,
                {
                    type:
                        "application/pdf"
                }
            );


        } finally {

            if (clone) {
                clone.remove();
            }
        }
    }


    /* =====================================================
       NATIVE SHARE
       TELEFON / PLANSHET
       ===================================================== */

    async function sharePrescription() {

        if (pdfBusy) {
            return;
        }

        pdfBusy =
            true;


        try {

            showPdfLoading(
                "PDF tayyorlanmoqda..."
            );


            const file =
                await createA4PdfFile();


            /*
             * Telefon / planshetda
             * native Share.
             */

            if (
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({
                    files: [file]
                })
            ) {

                hidePdfLoading();


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


                return;
            }


            /*
             * Desktop fallback:
             * PDFni yuklab beramiz.
             */

            const url =
                URL.createObjectURL(
                    file
                );


            const link =
                document.createElement(
                    "a"
                );

            link.href =
                url;

            link.download =
                file.name;

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();


            setTimeout(
                () => {

                    URL.revokeObjectURL(
                        url
                    );

                },
                5000
            );


            hidePdfLoading();


            alert(
                "📄 PDF yuklab olindi.\n\n" +
                "Telefon/planshetda esa " +
                "Share orqali Telegramga " +
                "yuborishingiz mumkin."
            );


        } catch (error) {

            console.error(
                "DR.MED SHARE ERROR:",
                error
            );


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return;
            }


            alert(
                "❌ PDFni ulashishda xatolik:\n\n" +
                error.message
            );


        } finally {

            hidePdfLoading();

            pdfBusy =
                false;
        }
    }


    /* =====================================================
       GLOBAL
       ===================================================== */

    window.DRMED_PDF = {

        downloadA4:
            downloadA4,

        downloadA5:
            downloadA5,

        openFormatModal:
            openPdfFormatModal,

        share:
            sharePrescription,

        createA4File:
            createA4PdfFile
    };


    /*
     * HTMLdagi eski onclicklar uchun
     * global funksiyalar.
     */

    window.openPdfFormatModal =
        openPdfFormatModal;

    window.downloadA4 =
        downloadA4;

    window.downloadA5 =
        downloadA5;

    window.shareTelegram =
        sharePrescription;


})();
