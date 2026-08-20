import asyncio
import base64
import hashlib
import hmac
import html
import io
import json
import os
import secrets
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qsl

from aiohttp import web
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import (
    BufferedInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from PIL import Image, ImageDraw, ImageFont


# ============================================================
# SOZLAMALAR
# ============================================================

BOT_TOKEN = os.getenv("BOT_TOKEN", "8530413309:AAFcRGXboIV8oWt3pnkVwUnYyRug1nr-5nA")

WEBAPP_URL = os.getenv(
    "WEBAPP_URL",
    "https://asadbekravshanov93-create.github.io/drmed-webapp/"
)

BOT_USERNAME = os.getenv(
    "BOT_USERNAME",
    "drmeduz1bot"
)

HOST = os.getenv(
    "HOST",
    "0.0.0.0"
)

PORT = int(
    os.getenv(
        "PORT",
        "8080"
    )
)

# MUHIM:
# Production serverga joylashtirganda shu qiymatni backendning
# HTTPS manziliga o'rnating.
#
# Masalan:
# PUBLIC_BASE_URL=https://api.drmed.uz
#
# Lokal test uchun:
# PUBLIC_BASE_URL=http://127.0.0.1:8080
PUBLIC_BASE_URL = os.getenv(
    "PUBLIC_BASE_URL",
    f"http://127.0.0.1:{PORT}"
).rstrip("/")


# ============================================================
# FAYL VA DATABASE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "recipes"

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)

PDF_DIR.mkdir(
    parents=True,
    exist_ok=True
)

DB_PATH = DATA_DIR / "recipes.db"


# ============================================================
# BOT
# ============================================================

if not BOT_TOKEN:
    raise RuntimeError(
        "BOT_TOKEN topilmadi. "
        "Environment variable orqali BOT_TOKEN ni bering."
    )

bot = Bot(
    token=BOT_TOKEN
)

dp = Dispatcher()


# ============================================================
# DATABASE
# ============================================================

def get_db():
    conn = sqlite3.connect(
        DB_PATH,
        timeout=30
    )

    conn.row_factory = sqlite3.Row

    return conn


def init_database():
    conn = get_db()

    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                recipe_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                patient_name TEXT,
                diagnosis TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT
            )
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_recipes_token
            ON recipes(token)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_recipes_recipe_id
            ON recipes(recipe_id)
            """
        )

        conn.commit()

    finally:
        conn.close()


# ============================================================
# RETSEPT ID
# ============================================================

def generate_recipe_id():
    """
    Masalan:
    RX-2026-00891
    """

    year = datetime.now().year

    conn = get_db()

    try:
        while True:

            number = secrets.randbelow(
                90000
            ) + 10000

            recipe_id = (
                f"RX-{year}-{number}"
            )

            exists = conn.execute(
                """
                SELECT 1
                FROM recipes
                WHERE recipe_id = ?
                LIMIT 1
                """,
                (recipe_id,)
            ).fetchone()

            if not exists:
                return recipe_id

    finally:
        conn.close()


# ============================================================
# QR TOKEN
# ============================================================

def generate_recipe_token():
    """
    QR uchun uzun va tasodifiy maxfiy token.
    """

    return secrets.token_urlsafe(32)


def build_recipe_url(token):
    """
    QR ichiga yoziladigan URL.
    """

    return (
        f"{PUBLIC_BASE_URL}"
        f"/r/{token}"
    )


# ============================================================
# XAVFSIZ MATN
# ============================================================

def safe_text(
    value,
    default="-"
):
    if value is None:
        return default

    text = str(value).strip()

    if not text:
        return default

    return html.escape(text)


# ============================================================
# TELEGRAM WEBAPP INIT DATA
# ============================================================

def validate_telegram_init_data(
    init_data: str
):
    """
    Telegram Mini App initData tekshirish.
    """

    if not init_data:
        return None

    try:

        parsed = dict(
            parse_qsl(
                init_data,
                keep_blank_values=True
            )
        )

        received_hash = parsed.pop(
            "hash",
            None
        )

        if not received_hash:
            return None

        data_check_string = "\n".join(
            f"{key}={parsed[key]}"
            for key in sorted(parsed)
        )

        secret_key = hmac.new(
            b"WebAppData",
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()

        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(
            calculated_hash,
            received_hash
        ):
            return None

        auth_date = parsed.get(
            "auth_date"
        )

        if auth_date:

            try:

                auth_timestamp = int(
                    auth_date
                )

                if (
                    time.time()
                    - auth_timestamp
                    > 86400
                ):
                    return None

            except ValueError:
                return None

        user_data = {}

        if "user" in parsed:

            try:

                user_data = json.loads(
                    parsed["user"]
                )

            except json.JSONDecodeError:
                return None

        return {
            "data": parsed,
            "user": user_data
        }

    except Exception as error:

        print(
            "initData validation error:",
            repr(error)
        )

        return None


# ============================================================
# /START
# ============================================================

@dp.message(
    CommandStart()
)
async def cmd_start(message):

    first_name = (
        message.from_user.first_name
        or "Doktor"
    )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📝 Retsept Yozish",
                    web_app=WebAppInfo(
                        url=WEBAPP_URL
                    )
                )
            ]
        ]
    )

    await message.answer(
        (
            f"Assalomu alaykum, doktor "
            f"<b>{safe_text(first_name)}</b>!\n\n"
            "Elektron retsept yaratish uchun "
            "quyidagi tugmani bosing:"
        ),
        reply_markup=keyboard,
        parse_mode="HTML"
    )


# ============================================================
# FONT
# ============================================================

def get_font(
    size,
    bold=False
):

    if bold:

        font_candidates = [
            "arialbd.ttf",
            "Arial Bold.ttf",
            "DejaVuSans-Bold.ttf",
        ]

    else:

        font_candidates = [
            "arial.ttf",
            "Arial.ttf",
            "DejaVuSans.ttf",
        ]

    for font_name in font_candidates:

        try:

            return ImageFont.truetype(
                font_name,
                size
            )

        except IOError:
            continue

    return ImageFont.load_default()


# ============================================================
# RETSEPT RASMI
# ============================================================

def generate_recipe_image(
    data: dict
):

    width = 800
    height = 1150

    img = Image.new(
        "RGB",
        (width, height),
        "#FFFFFF"
    )

    draw = ImageDraw.Draw(img)

    font_title = get_font(
        26
    )

    font_header = get_font(
        16,
        bold=True
    )

    font_body = get_font(
        15
    )

    font_bold = get_font(
        15,
        bold=True
    )

    font_small = get_font(
        12
    )

    teal_color = "#0d9488"
    dark_color = "#1e293b"
    gray_color = "#64748b"
    light_border = "#cbd5e1"

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    draw.rectangle(
        [40, 40, 80, 80],
        outline=teal_color,
        width=4
    )

    draw.line(
        [60, 48, 60, 72],
        fill=teal_color,
        width=4
    )

    draw.line(
        [48, 60, 72, 60],
        fill=teal_color,
        width=4
    )

    draw.text(
        (100, 35),
        "DR.MED",
        fill=teal_color,
        font=font_title
    )

    draw.text(
        (100, 68),
        "ELEKTRON RETSEPT",
        fill=dark_color,
        font=font_header
    )

    recipe_id = (
        data.get("recipe_id")
        or generate_recipe_id()
    )

    draw.text(
        (580, 45),
        f"Retsept ID: {recipe_id}",
        fill=gray_color,
        font=font_small
    )

    clinic_name = data.get(
        "clinic_name",
        "DR.MED Tibbiyot Markazi"
    )

    clinic_address = data.get(
        "clinic_address",
        "Toshkent sh., Chilonzor tumani"
    )

    clinic_phone = data.get(
        "clinic_phone",
        "+998 90 123 45 67"
    )

    draw.text(
        (40, 100),
        str(clinic_name),
        fill=dark_color,
        font=font_bold
    )

    draw.text(
        (40, 120),
        str(clinic_address),
        fill=gray_color,
        font=font_small
    )

    draw.text(
        (40, 138),
        str(clinic_phone),
        fill=gray_color,
        font=font_small
    )

    draw.line(
        [40, 160, 760, 160],
        fill=teal_color,
        width=2
    )

    # --------------------------------------------------------
    # BEMOR
    # --------------------------------------------------------

    y = 180

    draw.text(
        (40, y),
        "BEMOR MA'LUMOTLARI",
        fill=teal_color,
        font=font_header
    )

    y += 25

    info_labels = [

        (
            "F.I.Sh.:",
            data.get(
                "patient_name",
                "-"
            )
        ),

        (
            "Tug'ilgan sanasi:",
            data.get(
                "birth_date",
                "-"
            )
        ),

        (
            "Yoshi:",
            f"{data.get('age', '-')} yosh"
        ),

        (
            "Jinsi:",
            data.get(
                "gender",
                "-"
            )
        ),

        (
            "Manzili:",
            data.get(
                "address",
                "-"
            )
        ),

        (
            "Ambulator karta №:",
            data.get(
                "card_num",
                "-"
            )
        ),
    ]

    for label, value in info_labels:

        draw.text(
            (50, y),
            label,
            fill=gray_color,
            font=font_body
        )

        draw.text(
            (220, y),
            str(value),
            fill=dark_color,
            font=font_bold
        )

        y += 22

    y += 10

    draw.line(
        [40, y, 760, y],
        fill=light_border,
        width=1
    )

    y += 15

    # --------------------------------------------------------
    # DIAGNOZ
    # --------------------------------------------------------

    draw.text(
        (40, y),
        "DIAGNOZ",
        fill=teal_color,
        font=font_header
    )

    y += 25

    draw.text(
        (50, y),
        "Tashxis:",
        fill=gray_color,
        font=font_body
    )

    draw.text(
        (220, y),
        str(
            data.get(
                "diagnosis",
                "-"
            )
        ),
        fill=dark_color,
        font=font_bold
    )

    y += 35

    draw.line(
        [40, y, 760, y],
        fill=light_border,
        width=1
    )

    y += 15

    # --------------------------------------------------------
    # RETSEPT
    # --------------------------------------------------------

    draw.text(
        (350, y),
        "R E T S E P T",
        fill=dark_color,
        font=font_title
    )

    y += 40

    box_start_y = y

    y += 15

    draw.text(
        (60, y),
        "Rp.:",
        fill=dark_color,
        font=font_bold
    )

    medicines = data.get(
        "medicines",
        []
    )

    if not isinstance(
        medicines,
        list
    ):
        medicines = []

    for index, medicine in enumerate(
        medicines,
        start=1
    ):

        if not isinstance(
            medicine,
            dict
        ):
            continue

        med_name = medicine.get(
            "name",
            ""
        )

        med_dose = medicine.get(
            "dose",
            ""
        )

        draw.text(
            (110, y),
            f"{index}. {med_name}",
            fill=dark_color,
            font=font_bold
        )

        y += 22

        draw.text(
            (130, y),
            f"S. {med_dose}",
            fill=gray_color,
            font=font_body
        )

        y += 28

    y += 10

    box_end_y = y

    draw.rectangle(
        [
            50,
            box_start_y,
            750,
            box_end_y
        ],
        outline=light_border,
        width=1
    )

    y += 30

    # --------------------------------------------------------
    # SANA / IMZO
    # --------------------------------------------------------

    current_date = datetime.now().strftime(
        "%d.%m.%Y"
    )

    draw.text(
        (50, y),
        f"Sana: {current_date}",
        fill=dark_color,
        font=font_body
    )

    draw.text(
        (300, y),
        "Shifokor imzosi: ___________",
        fill=dark_color,
        font=font_body
    )

    draw.ellipse(
        [
            600,
            y - 20,
            720,
            y + 100
        ],
        outline=teal_color,
        width=2
    )

    draw.text(
        (618, y + 25),
        "DR.MED",
        fill=teal_color,
        font=font_bold
    )

    draw.text(
        (612, y + 45),
        "TOSHKENT",
        fill=teal_color,
        font=font_small
    )

    y += 120

    # --------------------------------------------------------
    # OGOHLANTIRISH
    # --------------------------------------------------------

    draw.rectangle(
        [
            40,
            y,
            760,
            y + 35
        ],
        outline=teal_color,
        width=1
    )

    draw.text(
        (80, y + 10),
        (
            "Ushbu retsept faqat malakali shifokor "
            "tomonidan tibbiy ko'rikdan so'ng "
            "rasmiylashtiriladi."
        ),
        fill=teal_color,
        font=font_small
    )

    buffer = io.BytesIO()

    img.save(
        buffer,
        format="PNG"
    )

    buffer.seek(0)

    return buffer


# ============================================================
# WEBAPP DATA
# ============================================================

@dp.message(
    F.web_app_data
)
async def handle_webapp_data(
    message
):

    try:

        raw_data = (
            message.web_app_data.data
        )

        data = json.loads(
            raw_data
        )

    except Exception as error:

        print(
            "WebApp data error:",
            repr(error)
        )

        await message.answer(
            "❌ Retsept ma'lumotlarini "
            "o'qishda xatolik yuz berdi."
        )

        return

    await message.answer(
        "🔄 Retsept shakllantirilmoqda..."
    )

    try:

        image_bytes = generate_recipe_image(
            data
        )

    except Exception as error:

        print(
            "Recipe image error:",
            repr(error)
        )

        await message.answer(
            "❌ Retsept rasmini yaratishda "
            "xatolik yuz berdi."
        )

        return

    photo_file = BufferedInputFile(
        image_bytes.getvalue(),
        filename="retsept.png"
    )

    caption_text = (
        "✅ <b>Tayyor retsept</b>\n\n"
        f"👤 <b>Bemor:</b> "
        f"{safe_text(data.get('patient_name'))}\n"
        f"🩺 <b>Tashxis:</b> "
        f"{safe_text(data.get('diagnosis'))}\n"
        f"📅 <b>Sana:</b> "
        f"{datetime.now().strftime('%d.%m.%Y')}"
    )

    await message.answer_photo(
        photo=photo_file,
        caption=caption_text,
        parse_mode="HTML"
    )


# ============================================================
# CORS
# ============================================================

def add_cors_headers(
    response
):

    response.headers[
        "Access-Control-Allow-Origin"
    ] = "*"

    response.headers[
        "Access-Control-Allow-Methods"
    ] = "GET, POST, OPTIONS"

    response.headers[
        "Access-Control-Allow-Headers"
    ] = (
        "Content-Type, Authorization"
    )

    return response


# ============================================================
# OPTIONS
# ============================================================

async def options_handler(
    request
):

    response = web.Response(
        status=204
    )

    return add_cors_headers(
        response
    )


# ============================================================
# HEALTH
# ============================================================

async def health_handler(
    request
):

    response = web.json_response(
        {
            "ok": True,
            "service": "DR.MED Telegram Backend",
            "bot": BOT_USERNAME,
            "qr_system": True,
            "time": datetime.now().isoformat()
        }
    )

    return add_cors_headers(
        response
    )


# ============================================================
# CREATE QR TOKEN
# ============================================================

async def create_recipe_token_handler(
    request
):
    """
    Frontend PDF yaratishdan oldin token oladi.

    POST /api/create-recipe-token

    JSON:
    {
        "recipe_id": "RX-2026-00891"
    }

    Natija:
    {
        "ok": true,
        "token": "...",
        "url": "https://.../r/..."
    }
    """

    try:

        body = await request.json()

    except Exception:

        response = web.json_response(
            {
                "ok": False,
                "error": "JSON ma'lumotlari noto'g'ri."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    recipe_id = str(
        body.get(
            "recipe_id",
            ""
        )
    ).strip()

    if not recipe_id:

        recipe_id = generate_recipe_id()

    token = generate_recipe_token()

    # Tokenni hali PDF bilan bog'lamaymiz.
    # PDF keyingi endpoint orqali shu token bilan saqlanadi.

    response = web.json_response(
        {
            "ok": True,
            "recipe_id": recipe_id,
            "token": token,
            "url": build_recipe_url(token)
        }
    )

    return add_cors_headers(
        response
    )


# ============================================================
# STORE PDF FOR QR
# ============================================================

async def store_recipe_pdf_handler(
    request
):
    """
    Frontend yaratgan PDFni serverda saqlaydi.

    POST /api/store-recipe-pdf

    JSON:
    {
        "token": "...",
        "recipe_id": "RX-2026-00891",
        "pdf": "base64...",
        "filename": "DRMED_Retsept_RX-2026-00891.pdf",
        "patient_name": "...",
        "diagnosis": "..."
    }
    """

    try:

        body = await request.json()

    except Exception:

        response = web.json_response(
            {
                "ok": False,
                "error": "JSON ma'lumotlari noto'g'ri."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    token = str(
        body.get(
            "token",
            ""
        )
    ).strip()

    recipe_id = str(
        body.get(
            "recipe_id",
            ""
        )
    ).strip()

    pdf_base64 = body.get(
        "pdf",
        ""
    )

    filename = body.get(
        "filename",
        "DRMED_Retsept.pdf"
    )

    patient_name = str(
        body.get(
            "patient_name",
            ""
        )
    )

    diagnosis = str(
        body.get(
            "diagnosis",
            ""
        )
    )

    if not token:

        response = web.json_response(
            {
                "ok": False,
                "error": "QR token yuborilmagan."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    if not recipe_id:

        response = web.json_response(
            {
                "ok": False,
                "error": "Retsept ID yuborilmagan."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    if not pdf_base64:

        response = web.json_response(
            {
                "ok": False,
                "error": "PDF fayli yuborilmagan."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # BASE64
    # --------------------------------------------------------

    try:

        if "," in pdf_base64:

            pdf_base64 = pdf_base64.split(
                ",",
                1
            )[1]

        pdf_bytes = base64.b64decode(
            pdf_base64,
            validate=True
        )

    except Exception:

        response = web.json_response(
            {
                "ok": False,
                "error": "PDF Base64 ma'lumotlari noto'g'ri."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # SIZE
    # --------------------------------------------------------

    max_pdf_size = (
        20 * 1024 * 1024
    )

    if len(pdf_bytes) > max_pdf_size:

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "PDF hajmi juda katta. "
                    "Maksimal 20 MB."
                )
            },
            status=413
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # PDF FORMAT
    # --------------------------------------------------------

    if not pdf_bytes.startswith(
        b"%PDF"
    ):

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "Yuborilgan fayl haqiqiy PDF emas."
                )
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # FILENAME
    # --------------------------------------------------------

    filename = Path(
        str(filename)
    ).name

    if not filename.lower().endswith(
        ".pdf"
    ):

        filename += ".pdf"

    # --------------------------------------------------------
    # FILE PATH
    # --------------------------------------------------------

    # Tokenni filename sifatida ishlatamiz.
    # Bu collisionni oldini oladi.

    safe_filename = (
        f"{token}.pdf"
    )

    file_path = (
        PDF_DIR / safe_filename
    )

    try:

        file_path.write_bytes(
            pdf_bytes
        )

    except Exception as error:

        print(
            "PDF save error:",
            repr(error)
        )

        response = web.json_response(
            {
                "ok": False,
                "error": "PDFni serverga saqlab bo'lmadi."
            },
            status=500
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    now = datetime.now().isoformat()

    conn = get_db()

    try:

        # Shu token oldin bo'lsa yangilaymiz.

        conn.execute(
            """
            INSERT INTO recipes (
                token,
                recipe_id,
                filename,
                file_path,
                patient_name,
                diagnosis,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(token)
            DO UPDATE SET
                recipe_id = excluded.recipe_id,
                filename = excluded.filename,
                file_path = excluded.file_path,
                patient_name = excluded.patient_name,
                diagnosis = excluded.diagnosis,
                created_at = excluded.created_at
            """,
            (
                token,
                recipe_id,
                filename,
                str(file_path),
                patient_name,
                diagnosis,
                now
            )
        )

        conn.commit()

    except Exception as error:

        print(
            "Database save error:",
            repr(error)
        )

        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass

        response = web.json_response(
            {
                "ok": False,
                "error": "Retsept ma'lumotlarini saqlab bo'lmadi."
            },
            status=500
        )

        return add_cors_headers(
            response
        )

    finally:

        conn.close()

    response = web.json_response(
        {
            "ok": True,
            "recipe_id": recipe_id,
            "filename": filename,
            "url": build_recipe_url(token),
            "message": "Retsept QR tizimiga saqlandi."
        }
    )

    return add_cors_headers(
        response
    )


# ============================================================
# QR → PDF
# ============================================================

async def recipe_by_qr_handler(
    request
):
    """
    QR kod skaner qilinganda shu endpoint ishlaydi.

    GET /r/<token>

    Natijada PDF fayl yuklanadi.
    """

    token = str(
        request.match_info.get(
            "token",
            ""
        )
    ).strip()

    if not token:

        return web.Response(
            status=400,
            text="QR token mavjud emas."
        )

    conn = get_db()

    try:

        row = conn.execute(
            """
            SELECT
                token,
                recipe_id,
                filename,
                file_path,
                created_at
            FROM recipes
            WHERE token = ?
            LIMIT 1
            """,
            (token,)
        ).fetchone()

    finally:

        conn.close()

    if not row:

        return web.Response(
            status=404,
            text=(
                "❌ Retsept topilmadi.\n\n"
                "QR kod noto'g'ri yoki retsept "
                "serverda mavjud emas."
            ),
            content_type="text/plain",
            charset="utf-8"
        )

    file_path = Path(
        row["file_path"]
    )

    if not file_path.exists():

        return web.Response(
            status=404,
            text=(
                "❌ Retsept PDF fayli topilmadi."
            ),
            content_type="text/plain",
            charset="utf-8"
        )

    try:

        pdf_bytes = file_path.read_bytes()

    except Exception as error:

        print(
            "QR PDF read error:",
            repr(error)
        )

        return web.Response(
            status=500,
            text="PDFni o'qishda xatolik yuz berdi."
        )

    filename = Path(
        row["filename"]
    ).name

    # Telefon brauzerlarida PDF ochilib qolmasligi uchun
    # attachment qilib yuboramiz.
    headers = {
        "Content-Disposition": (
            f'attachment; filename="{filename}"'
        ),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
    }

    response = web.Response(
        body=pdf_bytes,
        content_type="application/pdf",
        headers=headers
    )

    return add_cors_headers(
        response
    )


# ============================================================
# PDF → TELEGRAM
# ============================================================

async def send_pdf_handler(
    request
):

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    try:

        body = await request.json()

    except Exception:

        response = web.json_response(
            {
                "ok": False,
                "error": "JSON ma'lumotlari noto'g'ri."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    init_data = body.get(
        "initData",
        ""
    )

    pdf_base64 = body.get(
        "pdf",
        ""
    )

    filename = body.get(
        "filename",
        "DRMED_Retsept.pdf"
    )

    caption = body.get(
        "caption",
        "DR.MED elektron retsept"
    )

    # QR uchun ma'lumotlar
    recipe_id = str(
        body.get(
            "recipe_id",
            ""
        )
    ).strip()

    qr_token = str(
        body.get(
            "qr_token",
            ""
        )
    ).strip()

    # --------------------------------------------------------
    # TELEGRAM USER
    # --------------------------------------------------------

    validated = validate_telegram_init_data(
        init_data
    )

    if not validated:

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "Telegram WebApp ma'lumotlari "
                    "tasdiqlanmadi."
                )
            },
            status=401
        )

        return add_cors_headers(
            response
        )

    user = validated.get(
        "user",
        {}
    )

    chat_id = user.get(
        "id"
    )

    if not chat_id:

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "Telegram foydalanuvchi "
                    "ID topilmadi."
                )
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    if not pdf_base64:

        response = web.json_response(
            {
                "ok": False,
                "error": "PDF fayli yuborilmagan."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    try:

        if "," in pdf_base64:

            pdf_base64 = pdf_base64.split(
                ",",
                1
            )[1]

        pdf_bytes = base64.b64decode(
            pdf_base64,
            validate=True
        )

    except Exception:

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "PDF Base64 ma'lumotlari "
                    "noto'g'ri."
                )
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # SIZE
    # --------------------------------------------------------

    max_pdf_size = (
        20 * 1024 * 1024
    )

    if len(pdf_bytes) > max_pdf_size:

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "PDF hajmi juda katta. "
                    "Maksimal 20 MB."
                )
            },
            status=413
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # FORMAT
    # --------------------------------------------------------

    if not pdf_bytes.startswith(
        b"%PDF"
    ):

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "Yuborilgan fayl haqiqiy "
                    "PDF emas."
                )
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # FILENAME
    # --------------------------------------------------------

    filename = Path(
        str(filename)
    ).name

    if not filename.lower().endswith(
        ".pdf"
    ):

        filename += ".pdf"

    caption = str(
        caption
    )[:1000]

    # --------------------------------------------------------
    # QR PDFNI SAQLASH
    # --------------------------------------------------------

    stored_url = None

    if qr_token:

        if not recipe_id:

            recipe_id = generate_recipe_id()

        safe_filename = (
            f"{qr_token}.pdf"
        )

        file_path = (
            PDF_DIR / safe_filename
        )

        try:

            file_path.write_bytes(
                pdf_bytes
            )

            conn = get_db()

            try:

                conn.execute(
                    """
                    INSERT INTO recipes (
                        token,
                        recipe_id,
                        filename,
                        file_path,
                        patient_name,
                        diagnosis,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(token)
                    DO UPDATE SET
                        recipe_id = excluded.recipe_id,
                        filename = excluded.filename,
                        file_path = excluded.file_path,
                        created_at = excluded.created_at
                    """,
                    (
                        qr_token,
                        recipe_id,
                        filename,
                        str(file_path),
                        str(
                            body.get(
                                "patient_name",
                                ""
                            )
                        ),
                        str(
                            body.get(
                                "diagnosis",
                                ""
                            )
                        ),
                        datetime.now().isoformat()
                    )
                )

                conn.commit()

            finally:

                conn.close()

            stored_url = build_recipe_url(
                qr_token
            )

        except Exception as error:

            print(
                "QR PDF storage error:",
                repr(error)
            )

    # --------------------------------------------------------
    # TELEGRAMGA YUBORISH
    # --------------------------------------------------------

    try:

        document = BufferedInputFile(
            pdf_bytes,
            filename=filename
        )

        await bot.send_document(
            chat_id=chat_id,
            document=document,
            caption=caption
        )

    except Exception as error:

        print(
            "Telegram send_document error:",
            repr(error)
        )

        response = web.json_response(
            {
                "ok": False,
                "error": (
                    "Telegramga PDF yuborib "
                    "bo'lmadi."
                ),
                "details": str(error)
            },
            status=500
        )

        return add_cors_headers(
            response
        )

    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    response_data = {
        "ok": True,
        "message": (
            "PDF Telegramga "
            "muvaffaqiyatli yuborildi."
        ),
        "filename": filename
    }

    if stored_url:

        response_data[
            "qr_url"
        ] = stored_url

    response = web.json_response(
        response_data
    )

    return add_cors_headers(
        response
    )


# ============================================================
# TEST MESSAGE
# ============================================================

async def test_send_handler(
    request
):

    init_data = request.query.get(
        "initData",
        ""
    )

    validated = validate_telegram_init_data(
        init_data
    )

    if not validated:

        response = web.json_response(
            {
                "ok": False,
                "error": "initData noto'g'ri."
            },
            status=401
        )

        return add_cors_headers(
            response
        )

    user = validated.get(
        "user",
        {}
    )

    chat_id = user.get(
        "id"
    )

    if not chat_id:

        response = web.json_response(
            {
                "ok": False,
                "error": "User ID topilmadi."
            },
            status=400
        )

        return add_cors_headers(
            response
        )

    try:

        await bot.send_message(
            chat_id=chat_id,
            text=(
                "✅ <b>DR.MED backend ishlayapti!</b>\n\n"
                "Telegram WebApp foydalanuvchisi "
                "muvaffaqiyatli aniqlandi."
            ),
            parse_mode="HTML"
        )

    except Exception as error:

        response = web.json_response(
            {
                "ok": False,
                "error": str(error)
            },
            status=500
        )

        return add_cors_headers(
            response
        )

    response = web.json_response(
        {
            "ok": True,
            "message": "Test xabari yuborildi."
        }
    )

    return add_cors_headers(
        response
    )


# ============================================================
# QR TEST
# ============================================================

async def qr_test_handler(
    request
):
    """
    Backend QR tizimini tekshirish.
    """

    response = web.json_response(
        {
            "ok": True,
            "qr_system": True,
            "message": "QR backend tayyor.",
            "public_base_url": PUBLIC_BASE_URL
        }
    )

    return add_cors_headers(
        response
    )


# ============================================================
# WEB SERVER
# ============================================================

def create_web_app():

    app = web.Application(
        client_max_size=25 * 1024 * 1024
    )

    # --------------------------------------------------------
    # HEALTH
    # --------------------------------------------------------

    app.router.add_get(
        "/",
        health_handler
    )

    app.router.add_get(
        "/health",
        health_handler
    )

    # --------------------------------------------------------
    # QR
    # --------------------------------------------------------

    app.router.add_post(
        "/api/create-recipe-token",
        create_recipe_token_handler
    )

    app.router.add_post(
        "/api/store-recipe-pdf",
        store_recipe_pdf_handler
    )

    app.router.add_get(
        "/r/{token}",
        recipe_by_qr_handler
    )

    app.router.add_get(
        "/api/qr-test",
        qr_test_handler
    )

    # --------------------------------------------------------
    # PDF → TELEGRAM
    # --------------------------------------------------------

    app.router.add_post(
        "/api/send-pdf",
        send_pdf_handler
    )

    # --------------------------------------------------------
    # TEST
    # --------------------------------------------------------

    app.router.add_get(
        "/api/test-send",
        test_send_handler
    )

    # --------------------------------------------------------
    # CORS
    # --------------------------------------------------------

    app.router.add_route(
        "OPTIONS",
        "/api/send-pdf",
        options_handler
    )

    app.router.add_route(
        "OPTIONS",
        "/api/create-recipe-token",
        options_handler
    )

    app.router.add_route(
        "OPTIONS",
        "/api/store-recipe-pdf",
        options_handler
    )

    return app


# ============================================================
# WEB SERVERNI ISHGA TUSHIRISH
# ============================================================

async def start_web_server():

    app = create_web_app()

    runner = web.AppRunner(
        app
    )

    await runner.setup()

    site = web.TCPSite(
        runner,
        HOST,
        PORT
    )

    await site.start()

    print()
    print("=" * 65)
    print("🌐 DR.MED BACKEND ISHGA TUSHDI")
    print("=" * 65)

    print(
        f"Local: http://127.0.0.1:{PORT}"
    )

    print(
        f"Health: http://127.0.0.1:{PORT}/health"
    )

    print(
        f"QR base URL: {PUBLIC_BASE_URL}"
    )

    print("=" * 65)

    return runner


# ============================================================
# BOTNI ISHGA TUSHIRISH
# ============================================================

async def start_bot():

    print()
    print(
        "🤖 Telegram bot ishga tushmoqda..."
    )

    print(
        f"   @{BOT_USERNAME}"
    )

    await dp.start_polling(
        bot
    )


# ============================================================
# MAIN
# ============================================================

async def main():

    init_database()

    print()
    print("=" * 65)
    print("🚀 DR.MED BOT + BACKEND + QR")
    print("=" * 65)

    print(
        f"WebApp: {WEBAPP_URL}"
    )

    print(
        f"Backend: http://{HOST}:{PORT}"
    )

    print(
        f"Public QR URL: {PUBLIC_BASE_URL}"
    )

    print(
        f"Bot: @{BOT_USERNAME}"
    )

    print(
        f"Database: {DB_PATH}"
    )

    print(
        f"PDF folder: {PDF_DIR}"
    )

    print("=" * 65)

    web_runner = await start_web_server()

    try:

        await start_bot()

    finally:

        await web_runner.cleanup()

        await bot.session.close()


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(
            main()
        )

    except KeyboardInterrupt:

        print()

        print(
            "🛑 DR.MED bot to'xtatildi."
        )

    except Exception as error:

        print()

        print(
            "❌ CRITICAL ERROR:"
        )

        print(
            repr(error)
        )
