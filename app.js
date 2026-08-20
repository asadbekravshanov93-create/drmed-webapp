/* =========================================================
   DR.MED — PDF ENGINE
   pdf.js
   ========================================================= */

"use strict";

(function () {

    let isGenerating = false;


    /* =====================================================
       DR.MED QR RETSEPT TIZIMI
       ===================================================== */

    let recipeQrToken = null;
    let recipeQrUrl = null;
    let qrForRecipeId = null;


    /* =====================================================
       BACKEND MANZILI
       ===================================================== */

    const DRMED_BACKEND_URL =
        window.DRMED_BACKEND_URL ||
        "http://127.0.0.1:8080";


    /* =====================================================
       YORDAMCHI
       ===================================================== */

    function get(id) {

        return document.getElementById(
            id
        );
    }


    function patientName() {

        const el =
            get("p_name");


        if (
            !el ||
            !el.value.trim()
        ) {

            return "Bemor";
        }


        return el.value
            .trim()
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            );
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
       QR — RETSEPT RAQAMINI OLISH
       ===================================================== */

    function getRecipeId() {

        const rxEl =
            get("paper_rx_id");


        const recipeId =
            rxEl?.innerText?.trim() ||
            "";


        if (!recipeId) {

            throw new Error(
                "Retsept raqami topilmadi."
            );
        }


        return recipeId;
    }


    /* =====================================================
       QR RESET
       YANGI RETSEPT BOSHLANGANDA ISHLAYDI
       ===================================================== */

    function resetRecipeQr(
        newRecipeId
    ) {

        recipeQrToken =
            null;

        recipeQrUrl =
            null;

        qrForRecipeId =
            newRecipeId ||
            null;


        const qrElement =
            get(
                "paper_qr_code"
            );


        if (qrElement) {

            qrElement.innerHTML =
                "";
        }


        console.log(
            "♻️ QR reset:",
            newRecipeId
        );
    }


    /* =====================================================
       QR TOKEN OLISH
       ===================================================== */

    async function ensureRecipeQrToken() {

        const recipeId =
            getRecipeId();


        /*
         * Shu retsept uchun token allaqachon
         * olingan bo'lsa qayta olmaymiz.
         */

        if (
            recipeQrToken &&
            qrForRecipeId ===
                recipeId &&
            recipeQrUrl
        ) {

            return {

                token:
                    recipeQrToken,

                url:
                    recipeQrUrl,

                recipeId:
                    recipeId
            };
        }


        const response =
            await fetch(
                `${DRMED_BACKEND_URL}/api/create-recipe-token`,
                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            recipe_id:
                                recipeId

                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `QR server xatosi: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (
            !result.ok ||
            !result.token ||
            !result.url
        ) {

            throw new Error(
                result.error ||
                "QR token yaratilmadi."
            );
        }


        recipeQrToken =
            result.token;


        recipeQrUrl =
            result.url;


        qrForRecipeId =
            recipeId;


        console.log(
            "✅ DR.MED QR token yaratildi:",
            recipeQrUrl
        );


        return {

            token:
                recipeQrToken,

            url:
                recipeQrUrl,

            recipeId:
                recipeId
        };
    }


    /* =====================================================
       QR KODNI RETSEPTGA CHIZISH
       PDF UCHUN PNG IMGGA AYLANTIRILADI
       ===================================================== */

    async function renderRecipeQr(
        rootElement
    ) {

        if (!rootElement) {

            console.warn(
                "⚠️ paper_qr_code topilmadi."
            );

            return null;
        }


        const qrData =
            await ensureRecipeQrToken();


        if (
            typeof window.QRCode !==
            "function"
        ) {

            throw new Error(
                "QRCode kutubxonasi yuklanmagan."
            );
        }


        rootElement.innerHTML =
            "";


        /*
         * QRCode.js vaqtinchalik elementda
         * yaratiladi.
         */

        const temp =
            document.createElement(
                "div"
            );


        Object.assign(
            temp.style,
            {

                position:
                    "fixed",

                left:
                    "-10000px",

                top:
                    "0",

                width:
                    "120px",

                height:
                    "120px",

                background:
                    "#ffffff"
            }
        );


        document.body.appendChild(
            temp
        );


        new window.QRCode(
            temp,
            {

                text:
                    qrData.url,

                width:
                    120,

                height:
                    120,

                colorDark:
                    "#000000",

                colorLight:
                    "#ffffff",

                correctLevel:
                    window.QRCode.CorrectLevel
                        ? window.QRCode.CorrectLevel.H
                        : 2
            }
        );


        /*
         * QRCode.js yaratib bo'lishini kutamiz.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    200
                )
        );


        let qrImage =
            temp.querySelector(
                "img"
            );


        const qrCanvas =
            temp.querySelector(
                "canvas"
            );


        /*
         * Agar canvas yaratilgan bo'lsa,
         * PNGga aylantiramiz.
         */

        if (
            !qrImage &&
            qrCanvas
        ) {

            const dataUrl =
                qrCanvas.toDataURL(
                    "image/png"
                );


            qrImage =
                document.createElement(
                    "img"
                );


            qrImage.src =
                dataUrl;
        }


        if (!qrImage) {

            temp.remove();


            throw new Error(
                "QR rasmi yaratilmadi."
            );
        }


        /*
         * Yakuniy IMG.
         * Bu clone qilinayotganda ham
         * PDF ichiga tushadi.
         */

        const finalQrImage =
            document.createElement(
                "img"
            );


        finalQrImage.src =
            qrImage.src;


        finalQrImage.width =
            120;

        finalQrImage.height =
            120;


        Object.assign(
            finalQrImage.style,
            {

                width:
                    "120px",

                height:
                    "120px",

                display:
                    "block",

                background:
                    "#ffffff"
            }
        );


        rootElement.innerHTML =
            "";


        rootElement.appendChild(
            finalQrImage
        );


        temp.remove();


        /*
         * IMG yuklanishini kutamiz.
         */

        if (
            !finalQrImage.complete
        ) {

            await new Promise(
                resolve => {

                    finalQrImage.onload =
                        resolve;

                    finalQrImage.onerror =
                        resolve;
                }
            );
        }


        console.log(
            "✅ QR kod retseptga joylashtirildi:",
            qrData.url
        );


        return qrData;
    }


    /* =====================================================
       PDFNI QR SERVERGA SAQLASH
       ===================================================== */

    async function storePdfForQr(
        result
    ) {

        if (!result?.blob) {

            throw new Error(
                "PDF Blob topilmadi."
            );
        }


        const qrData =
            await ensureRecipeQrToken();


        const base64 =
            await blobToBase64(
                result.blob
            );


        const patientNameValue =
            document.getElementById(
                "p_name"
            )?.value?.trim() ||
            "";


        const diagnosis =
            document.getElementById(
                "p_diag"
            )?.value?.trim() ||
            "";


        const response =
            await fetch(
                `${DRMED_BACKEND_URL}/api/store-recipe-pdf`,
                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            token:
                                qrData.token,

                            recipe_id:
                                qrData.recipeId,

                            pdf:
                                base64,

                            filename:
                                result.fileName,

                            patient_name:
                                patientNameValue,

                            diagnosis:
                                diagnosis

                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `PDF server xatosi: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (!data.ok) {

            throw new Error(
                data.error ||
                "PDF serverga saqlanmadi."
            );
        }


        console.log(
            "✅ Retsept QR serverga saqlandi:",
            data.qr_url
        );


        return data;
    }


    /* =====================================================
       BLOB → BASE64
       ===================================================== */

    function blobToBase64(
        blob
    ) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onloadend =
                    () => {

                        const result =
                            reader.result;


                        if (
                            typeof result !==
                            "string"
                        ) {

                            reject(
                                new Error(
                                    "PDFni Base64ga aylantirib bo'lmadi."
                                )
                            );


                            return;
                        }


                        const comma =
                            result.indexOf(",");


                        resolve(
                            comma >= 0
                                ? result.slice(
                                    comma + 1
                                )
                                : result
                        );
                    };


                reader.onerror =
                    () => {

                        reject(
                            new Error(
                                "PDF faylini o'qib bo'lmadi."
                            )
                        );
                    };


                reader.readAsDataURL(
                    blob
                );
            }
        );
    }
        /* =====================================================
       LOADING
       ===================================================== */

    function showLoading(
        text
    ) {

        let loader =
            document.getElementById(
                "drmedPdfLoading"
            );


        if (!loader) {

            loader =
                document.createElement(
                    "div"
                );


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

                    position:
                        "fixed",

                    inset:
                        "0",

                    zIndex:
                        "999999",

                    background:
                        "rgba(15,23,42,.55)",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center"
                }
            );


            const box =
                loader.querySelector(
                    ".drmed-pdf-loading-box"
                );


            Object.assign(
                box.style,
                {

                    background:
                        "#ffffff",

                    padding:
                        "28px 35px",

                    borderRadius:
                        "18px",

                    textAlign:
                        "center",

                    minWidth:
                        "230px",

                    boxShadow:
                        "0 20px 70px rgba(0,0,0,.30)"
                }
            );


            const spinner =
                loader.querySelector(
                    ".drmed-pdf-spinner"
                );


            Object.assign(
                spinner.style,
                {

                    width:
                        "40px",

                    height:
                        "40px",

                    border:
                        "4px solid #e2e8f0",

                    borderTopColor:
                        "#0d9488",

                    borderRadius:
                        "50%",

                    margin:
                        "0 auto 15px",

                    animation:
                        "drmedPdfSpin .8s linear infinite"
                }
            );


            const style =
                document.createElement(
                    "style"
                );


            style.textContent = `
                @keyframes drmedPdfSpin {

                    from {
                        transform:
                            rotate(0deg);
                    }

                    to {
                        transform:
                            rotate(360deg);
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


        const textElement =
            document.getElementById(
                "drmedPdfLoadingText"
            );


        if (textElement) {

            textElement.innerText =
                text ||
                "PDF tayyorlanmoqda...";
        }


        loader.style.display =
            "flex";
    }


    function hideLoading() {

        const loader =
            document.getElementById(
                "drmedPdfLoading"
            );


        if (loader) {

            loader.style.display =
                "none";
        }
    }


    /* =====================================================
       PDF FORMAT MODAL
       ===================================================== */

    function openPdfFormatModal() {

        const modal =
            document.getElementById(
                "pdfFormatModal"
            );


        if (!modal) {

            console.warn(
                "pdfFormatModal topilmadi."
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
            document.getElementById(
                "pdfFormatModal"
            );


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
       WAIT FOR RENDER
       ===================================================== */

    function waitForRender(
        milliseconds
    ) {

        return new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    }


    /* =====================================================
       CREATE PRESCRIPTION CLONE
       ===================================================== */

    async function createPrescriptionClone() {

        const original =
            document.getElementById(
                "printablePaper"
            );


        if (!original) {

            throw new Error(
                "printablePaper topilmadi."
            );
        }


        /*
         * Avval ekrandagi retseptni
         * yangilaymiz.
         */

        if (
            typeof window.liveUpdate ===
            "function"
        ) {

            try {

                window.liveUpdate();

            } catch (error) {

                console.warn(
                    "liveUpdate xatosi:",
                    error
                );
            }
        }


        /*
         * QR token olamiz va QRni
         * ekrandagi retseptga joylaymiz.
         */

        await renderRecipeQr(
            document.getElementById(
                "paper_qr_code"
            )
        );


        /*
         * Browserga QR va retseptni
         * render qilish uchun vaqt beramiz.
         */

        await waitForRender(
            200
        );


        /*
         * Endi printablePaper clone qilinadi.
         */

        const clone =
            original.cloneNode(
                true
            );


        clone.id =
            "drmedPdfClone";


        /*
         * Clone ekranda ko‘rinmasin,
         * lekin html2canvas uni ko‘ra olsin.
         */

        Object.assign(
            clone.style,
            {

                position:
                    "fixed",

                left:
                    "-10000px",

                top:
                    "0",

                width:
                    "794px",

                minWidth:
                    "794px",

                maxWidth:
                    "794px",

                height:
                    "auto",

                margin:
                    "0",

                padding:
                    "0",

                background:
                    "#ffffff",

                color:
                    "#000000",

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


        document.body.appendChild(
            clone
        );


        /*
         * Clone ichidagi QR.
         *
         * Muhim:
         * renderRecipeQr() originaldagi QRni
         * emas, clone ichidagi QRni ham
         * qayta yaratadi.
         *
         * Shuning uchun QR PDFga tushadi.
         */

        const cloneQr =
            clone.querySelector(
                "#paper_qr_code"
            );


        if (cloneQr) {

            cloneQr.innerHTML =
                "";


            /*
             * Original QR URL allaqachon
             * token bilan yaratilgan.
             */

            if (
                recipeQrUrl &&
                typeof window.QRCode ===
                    "function"
            ) {

                const tempQr =
                    document.createElement(
                        "div"
                    );


                Object.assign(
                    tempQr.style,
                    {

                        position:
                            "absolute",

                        left:
                            "-10000px",

                        top:
                            "0",

                        width:
                            "120px",

                        height:
                            "120px",

                        background:
                            "#ffffff"
                    }
                );


                document.body.appendChild(
                    tempQr
                );


                new window.QRCode(
                    tempQr,
                    {

                        text:
                            recipeQrUrl,

                        width:
                            120,

                        height:
                            120,

                        colorDark:
                            "#000000",

                        colorLight:
                            "#ffffff",

                        correctLevel:
                            window.QRCode.CorrectLevel
                                ? window.QRCode.CorrectLevel.H
                                : 2
                    }
                );


                await waitForRender(
                    150
                );


                const qrCanvas =
                    tempQr.querySelector(
                        "canvas"
                    );


                const qrImg =
                    tempQr.querySelector(
                        "img"
                    );


                let qrDataUrl =
                    null;


                if (qrCanvas) {

                    qrDataUrl =
                        qrCanvas.toDataURL(
                            "image/png"
                        );

                } else if (qrImg) {

                    qrDataUrl =
                        qrImg.src;
                }


                if (qrDataUrl) {

                    const finalQr =
                        document.createElement(
                            "img"
                        );


                    finalQr.src =
                        qrDataUrl;


                    finalQr.width =
                        120;

                    finalQr.height =
                        120;


                    Object.assign(
                        finalQr.style,
                        {

                            width:
                                "120px",

                            height:
                                "120px",

                            display:
                                "block",

                            background:
                                "#ffffff"
                        }
                    );


                    cloneQr.appendChild(
                        finalQr
                    );


                    /*
                     * IMG yuklanishini kutamiz.
                     */

                    if (
                        !finalQr.complete
                    ) {

                        await new Promise(
                            resolve => {

                                finalQr.onload =
                                    resolve;

                                finalQr.onerror =
                                    resolve;
                            }
                        );
                    }
                }


                tempQr.remove();
            }
        }


        /*
         * Clone ichidagi rasmlarni kutamiz.
         */

        const images =
            Array.from(
                clone.querySelectorAll(
                    "img"
                )
            );


        await Promise.all(
            images.map(
                function (img) {

                    if (
                        img.complete
                    ) {

                        return Promise.resolve();
                    }


                    return new Promise(
                        function (
                            resolve
                        ) {

                            let finished =
                                false;


                            function done() {

                                if (
                                    finished
                                ) {

                                    return;
                                }


                                finished =
                                    true;


                                resolve();
                            }


                            img.onload =
                                done;


                            img.onerror =
                                done;


                            setTimeout(
                                done,
                                5000
                            );
                        }
                    );
                }
            )
        );


        /*
         * Browser paint.
         */

        await new Promise(
            resolve =>
                requestAnimationFrame(
                    () => {

                        requestAnimationFrame(
                            resolve
                        );

                    }
                )
        );


        await waitForRender(
            250
        );


        return clone;
    }


    /* =====================================================
       CREATE CANVAS
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


        /*
         * Clone haqiqatan DOMda ekanini
         * tekshiramiz.
         */

        if (
            !clone ||
            !document.body.contains(
                clone
            )
        ) {

            throw new Error(
                "PDF clone DOMga joylashtirilmadi."
            );
        }


        /*
         * PDF render vaqtida QR
         * va boshqa rasmlar ko‘rinadigan
         * bo‘lishi kerak.
         */

        clone.style.visibility =
            "visible";

        clone.style.opacity =
            "1";

        clone.style.display =
            "block";


        const canvas =
            await window.html2canvas(
                clone,
                {

                    scale:
                        2,

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    backgroundColor:
                        "#ffffff",

                    logging:
                        false,

                    imageTimeout:
                        15000,

                    scrollX:
                        0,

                    scrollY:
                        0,


                    onclone:
                        function (
                            clonedDocument
                        ) {

                            const paper =
                                clonedDocument.getElementById(
                                    "drmedPdfClone"
                                );


                            if (!paper) {

                                return;
                            }


                            /*
                             * PDF clone uchun
                             * aniq o‘lcham.
                             */

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

                            paper.style.margin =
                                "0";

                            paper.style.padding =
                                "0";

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


                            /*
                             * Clone ichidagi
                             * barcha IMGlarni
                             * ko‘rsatamiz.
                             */

                            const clonedImages =
                                paper.querySelectorAll(
                                    "img"
                                );


                            clonedImages.forEach(
                                function (
                                    img
                                ) {

                                    img.style.visibility =
                                        "visible";

                                    img.style.opacity =
                                        "1";

                                    img.style.display =
                                        "block";
                                }
                            );
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
         * Retsept A4 sahifadan
         * chiqib ketmasin.
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
       O‘NG TOMON BO‘SH
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
         * Retsept:
         * chap 105 mm
         *
         * O‘ng 105 mm:
         * BO‘SH
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
       UNIVERSAL PDF FILE ACTION
       iPhone / iPad / Android:
       native Share Sheet
       Desktop:
       normal file download
       ===================================================== */

    async function presentPdfFile(
        blob,
        name,
        shareText = "DR.MED elektron retsept"
    ) {

        if (!blob || blob.size <= 0) {
            throw new Error(
                "PDF fayli bo'sh."
            );
        }

        const file =
            new File(
                [blob],
                name,
                {
                    type:
                        "application/pdf",
                    lastModified:
                        Date.now()
                }
            );

        /*
         * iPhone / iPad / Android:
         * aynan tizimning Share Sheet oynasini ochamiz.
         *
         * Foydalanuvchi shu oynadan:
         * Telegram, Messages, Mail, AirDrop,
         * Files va boshqa ilovani tanlaydi.
         */
        if (
            typeof navigator.share ===
                "function"
        ) {

            let fileShareSupported =
                true;

            if (
                typeof navigator.canShare ===
                    "function"
            ) {

                try {

                    fileShareSupported =
                        navigator.canShare(
                            {
                                files:
                                    [file]
                            }
                        );

                } catch (shareCheckError) {

                    console.warn(
                        "Native file share tekshiruvi:",
                        shareCheckError
                    );

                    fileShareSupported =
                        false;
                }
            }

            if (fileShareSupported) {

                await navigator.share(
                    {
                        title:
                            "DR.MED Elektron Retsept",

                        text:
                            shareText,

                        files:
                            [file]
                    }
                );

                return {
                    mode:
                        "native-share",
                    file:
                        file
                };
            }
        }

        /*
         * Desktop / native Share mavjud bo'lmagan
         * brauzerlar uchun oddiy yuklash.
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

            link.rel =
                "noopener";

            link.style.display =
                "none";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

        } finally {

            setTimeout(
                function () {

                    URL.revokeObjectURL(
                        url
                    );

                },
                5000
            );
        }

        return {
            mode:
                "download",
            file:
                file
        };
    }


    /* =====================================================
       ASOSIY PDF EXPORT
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

            closePdfFormatModal();


            /*
             * QR tokenni oldindan olamiz.
             * Shunda PDF render qilinishidan oldin
             * QR tayyor bo'ladi.
             */

            await ensureRecipeQrToken();


            showLoading(
                format === "a5"
                    ? "A5 PDF tayyorlanmoqda..."
                    : "A4 PDF tayyorlanmoqda..."
            );


            /*
             * Retsept + QR clone.
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
             * A4 yoki A5.
             */

            let pdf;


            if (
                String(format).toLowerCase() ===
                "a5"
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


            if (!pdf) {

                throw new Error(
                    "PDF yaratilmadi."
                );
            }


            /*
             * PDF Blob.
             */

            const pdfBlob =
                pdf.output(
                    "blob"
                );


            if (
                !pdfBlob ||
                pdfBlob.size <= 0
            ) {

                throw new Error(
                    "PDF fayli bo'sh yaratildi."
                );
            }


            /*
             * PDF tayyor bo'ldi.
             *
             * MUHIM:
             * PDFni avval backendga yuborib kutmaymiz.
             * Shuning uchun backend/QR serverdagi xato
             * qurilmaga PDF chiqarishni bloklamaydi.
             *
             * QR serverga saqlash alohida fon vazifasi.
             */
            storePdfForQr(
                {
                    blob:
                        pdfBlob,

                    fileName:
                        fileName(
                            format
                        )
                }
            ).catch(
                function (saveError) {

                    console.warn(
                        "QR PDF serverga saqlanmadi, lekin PDF yuklash davom etadi:",
                        saveError
                    );
                }
            );


            /*
             * iPhone / iPad / Android:
             * aynan tizimning Share Sheet oynasi.
             *
             * Desktop:
             * oddiy PDF yuklash.
             */
            showLoading(
                "PDF tayyor..."
            );


            hideLoading();

            await presentPdfFile(
                pdfBlob,
                fileName(
                    format
                ),
                "DR.MED elektron retsept"
            );


        } catch (error) {

            console.error(
                "DR.MED PDF ERROR:",
                error
            );


            hideLoading();


            alert(
                "❌ PDF yuklanmadi.\n\n" +
                (
                    error?.message ||
                    "Noma'lum xatolik."
                )
            );


        } finally {

            /*
             * Clone'ni o'chiramiz.
             */

            if (clone) {

                try {

                    clone.remove();

                } catch (removeError) {

                    console.warn(
                        "Clone remove xatosi:",
                        removeError
                    );
                }
            }


            isGenerating =
                false;
        }
    }


    /* =====================================================
       TELEGRAM / SHARE
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


            /*
             * QR token.
             */

            await ensureRecipeQrToken();


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
             *
             * Sizdagi mavjud Telegram
             * funksiyasi saqlanadi.
             */

            const pdf =
                makeA4(
                    canvas
                );


            const blob =
                pdf.output(
                    "blob"
                );


            if (
                !blob ||
                blob.size <= 0
            ) {

                throw new Error(
                    "Telegram uchun PDF yaratilmadi."
                );
            }


            /*
             * QR serverga saqlash Share oynasini
             * BLOKLAMASIN.
             *
             * Native Share alohida ishlaydi.
             */
            storePdfForQr(
                {
                    blob:
                        blob,

                    fileName:
                        fileName(
                            "a4"
                        )
                }
            ).catch(
                function (saveError) {

                    console.warn(
                        "QR PDF serverga saqlanmadi, Share davom etadi:",
                        saveError
                    );
                }
            );


            /*
             * Telegram tugmasi Telegramni
             * to'g'ridan-to'g'ri ochmaydi.
             *
             * iPhone/iPad/Androidda aynan
             * tizim Share Sheet ochiladi.
             * Foydalanuvchi undan Telegramni tanlaydi.
             *
             * Desktopda esa PDF yuklanadi.
             */
            hideLoading();

            await presentPdfFile(
                blob,
                fileName(
                    "a4"
                ),
                "DR.MED elektron retsept"
            );


        } catch (error) {

            console.error(
                "DR.MED SHARE ERROR:",
                error
            );


            hideLoading();


            if (
                error?.name ===
                "AbortError"
            ) {

                return;
            }


            alert(
                "❌ Telegram/Share ishlamadi.\n\n" +
                (
                    error?.message ||
                    "Noma'lum xatolik."
                )
            );


        } finally {

            if (clone) {

                try {

                    clone.remove();

                } catch (removeError) {

                    console.warn(
                        "Share clone remove xatosi:",
                        removeError
                    );
                }
            }


            isGenerating =
                false;
        }
    }


    /* =====================================================
       WINDOW GLOBAL FUNCTIONS
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
       DR.MED PDF MODULE
       APP.JS UCHUN
       ===================================================== */

    window.DRMED_PDF = {

        /*
         * Yangi retsept boshlanganda
         * app.js shu funksiyani chaqiradi.
         */

        resetRecipe:
            resetRecipeQr,


        /*
         * PDF format oynasi.
         */

        openFormatModal:
            openPdfFormatModal,


        closeFormatModal:
            closePdfFormatModal,


        /*
         * A4.
         */

        downloadA4:
            function () {

                return exportToPDF(
                    "a4"
                );
            },


        /*
         * A5.
         */

        downloadA5:
            function () {

                return exportToPDF(
                    "a5"
                );
            },


        /*
         * Umumiy export.
         */

        export:
            exportToPDF,


        /*
         * Telegram / Share.
         */

        share:
            shareTelegram
    };


    /* =====================================================
       MODUL YUKLANGAN
       ===================================================== */

    console.log(
        "✅ DR.MED PDF MODULE LOADED"
    );


    console.log(
        "✅ DR.MED QR SYSTEM READY"
    );


})();
