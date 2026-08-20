/* =========================================================
   DR.MED — QR CODE MODULE
   qr.js

   Vazifalari:
   1. Joriy RX raqamini olish
   2. Har bir RX uchun QR token olish
   3. Eski QRni tozalash
   4. Yangi QR yaratish
   5. Yangi retseptda QRni reset qilish
   6. QR URLni boshqa modullarga berish

   MUHIM:
   pdf.js O'ZGARTIRILMAYDI.
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       CONFIG
       ===================================================== */

    const BACKEND_URL =
        window.DRMED_BACKEND_URL ||
        "http://127.0.0.1:8080";


    /* =====================================================
       QR STATE
       ===================================================== */

    let qrToken = null;

    let qrUrl = null;

    let qrRecipeId = null;

    let qrRequestPromise = null;


    /* =====================================================
       HELPER
       ===================================================== */

    function getElement(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       CURRENT RX ID
       ===================================================== */

    function getRecipeId() {

        const rxElement =
            getElement("paper_rx_id");


        if (!rxElement) {

            throw new Error(
                "paper_rx_id elementi topilmadi."
            );

        }


        const recipeId =
            (
                rxElement.innerText ||
                rxElement.textContent ||
                ""
            )
                .trim();


        if (!recipeId) {

            throw new Error(
                "Retsept raqami topilmadi."
            );

        }


        return recipeId;

    }


    /* =====================================================
       RESET QR
       ===================================================== */

    function resetQR(newRecipeId) {

        /*
         * Eski tokenni butunlay bekor qilamiz.
         */

        qrToken = null;

        qrUrl = null;

        qrRecipeId =
            newRecipeId ||
            null;


        /*
         * Agar yangi RX berilgan bo'lsa,
         * DOMdagi RX raqamini ham yangilaymiz.
         */

        if (newRecipeId) {

            const rxElement =
                getElement(
                    "paper_rx_id"
                );


            if (rxElement) {

                rxElement.innerText =
                    newRecipeId;

            }

        }


        /*
         * Eski QRni o'chiramiz.
         */

        const qrElement =
            getElement(
                "paper_qr_code"
            );


        if (qrElement) {

            qrElement.innerHTML =
                "";

        }


        /*
         * Parallel eski request bo'lsa,
         * uni yangi QR uchun ishlatmaymiz.
         */

        qrRequestPromise =
            null;


        console.log(
            "♻️ QR reset:",
            newRecipeId
        );

    }


    /* =====================================================
       QR TOKEN OLISH
       ===================================================== */

    async function createQRToken() {

        const recipeId =
            getRecipeId();


        /*
         * Shu RX uchun token allaqachon
         * mavjud bo'lsa qaytaramiz.
         */

        if (

            qrToken &&

            qrUrl &&

            qrRecipeId === recipeId

        ) {

            return {

                token:
                    qrToken,

                url:
                    qrUrl,

                recipeId:
                    recipeId

            };

        }


        /*
         * Bir xil vaqtda ikki marta
         * request yuborilishining oldini olamiz.
         */

        if (
            qrRequestPromise
        ) {

            return qrRequestPromise;

        }


        qrRequestPromise =
            (async function () {

                const response =
                    await fetch(

                        `${BACKEND_URL}/api/create-recipe-token`,

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

                    !result ||

                    !result.ok ||

                    !result.token ||

                    !result.url

                ) {

                    throw new Error(

                        result?.error ||

                        "QR token yaratilmadi."

                    );

                }


                /*
                 * Muhim:
                 * request qaysi RX uchun yuborilgan
                 * bo'lsa, faqat o'sha RXga saqlaymiz.
                 */

                const currentRecipeId =
                    getRecipeId();


                if (
                    currentRecipeId !==
                    recipeId
                ) {

                    /*
                     * Foydalanuvchi request vaqtida
                     * yangi retsept boshlagan bo'lsa,
                     * eski requestni joriy QRga
                     * qo'ymaymiz.
                     */

                    return {

                        token:
                            result.token,

                        url:
                            result.url,

                        recipeId:
                            recipeId

                    };

                }


                qrToken =
                    result.token;

                qrUrl =
                    result.url;

                qrRecipeId =
                    recipeId;


                console.log(
                    "✅ QR token:",
                    recipeId,
                    qrUrl
                );


                return {

                    token:
                        qrToken,

                    url:
                        qrUrl,

                    recipeId:
                        qrRecipeId

                };

            })();


        try {

            return await qrRequestPromise;

        }

        finally {

            qrRequestPromise =
                null;

        }

    }


    /* =====================================================
       QR CODE DRAW
       ===================================================== */

    async function renderQR() {

        const qrElement =
            getElement(
                "paper_qr_code"
            );


        if (!qrElement) {

            console.warn(
                "⚠️ paper_qr_code topilmadi."
            );

            return null;

        }


        /*
         * QRCode.js yuklanganmi?
         */

        if (
            typeof window.QRCode !==
            "function"
        ) {

            throw new Error(
                "QRCode kutubxonasi yuklanmagan."
            );

        }


        /*
         * Backenddan token olamiz.
         */

        const data =
            await createQRToken();


        /*
         * Agar bu vaqt ichida yangi RX
         * boshlangan bo'lsa, eski QRni
         * ko'rsatmaymiz.
         */

        let currentRecipeId;

        try {

            currentRecipeId =
                getRecipeId();

        }

        catch (error) {

            return null;

        }


        if (
            data.recipeId !==
            currentRecipeId
        ) {

            return null;

        }


        /*
         * Eski QRni tozalaymiz.
         */

        qrElement.innerHTML =
            "";


        /*
         * Yangi QR.
         */

        new window.QRCode(

            qrElement,

            {

                text:
                    data.url,

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

                        ? window.QRCode
                            .CorrectLevel
                            .H

                        : 2

            }

        );


        /*
         * QRCode.js DOMga canvas/img
         * joylashtirib bo'lishini kutamiz.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    100
                )
        );


        console.log(
            "✅ QR yaratildi:",
            data.url
        );


        return data;

    }


    /* =====================================================
       GET CURRENT QR DATA
       ===================================================== */

    function getQRData() {

        if (

            !qrToken ||

            !qrUrl ||

            !qrRecipeId

        ) {

            return null;

        }


        return {

            token:
                qrToken,

            url:
                qrUrl,

            recipeId:
                qrRecipeId

        };

    }


    /* =====================================================
       GET QR URL
       ===================================================== */

    function getQRUrl() {

        return qrUrl || null;

    }


    /* =====================================================
       GET QR TOKEN
       ===================================================== */

    function getQRToken() {

        return qrToken || null;

    }


    /* =====================================================
       CHECK CURRENT RX
       ===================================================== */

    function isCurrentRecipe(
        recipeId
    ) {

        return (
            qrRecipeId ===
            recipeId
        );

    }


    /* =====================================================
       CLEAR ONLY VISUAL QR
       ===================================================== */

    function clearQR() {

        const qrElement =
            getElement(
                "paper_qr_code"
            );


        if (qrElement) {

            qrElement.innerHTML =
                "";

        }

    }


    /* =====================================================
       AUTO QR
       ===================================================== */

    async function refreshQR() {

        try {

            return await renderQR();

        }

        catch (error) {

            console.error(
                "❌ QR yaratishda xatolik:",
                error
            );


            clearQR();


            return null;

        }

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DRMED_QR = {

        /*
         * Yangi retsept
         */
        reset:
            resetQR,


        /*
         * QR yaratish
         */
        render:
            renderQR,


        /*
         * QRni yangilash
         */
        refresh:
            refreshQR,


        /*
         * Token olish
         */
        createToken:
            createQRToken,


        /*
         * Joriy QR ma'lumoti
         */
        getData:
            getQRData,


        /*
         * URL
         */
        getUrl:
            getQRUrl,


        /*
         * Token
         */
        getToken:
            getQRToken,


        /*
         * RX tekshirish
         */
        isCurrentRecipe:
            isCurrentRecipe,


        /*
         * Faqat QRni tozalash
         */
        clear:
            clearQR

    };


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    window.addEventListener(
        "DOMContentLoaded",
        function () {

            /*
             * RX raqami app.js tomonidan
             * yaratilishini kutamiz.
             */

            setTimeout(
                function () {

                    try {

                        if (
                            getRecipeId()
                        ) {

                            refreshQR();

                        }

                    }

                    catch (error) {

                        /*
                         * Birinchi yuklanishda
                         * RX hali yaratilmagan bo'lishi mumkin.
                         */

                        console.log(
                            "QR: RX hali tayyor emas."
                        );

                    }

                },
                300
            );

        }
    );


})();
