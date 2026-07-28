import asyncio
import json
import random
from datetime import datetime
from io import BytesIO

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart
from aiogram.types import BufferedInputFile, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from PIL import Image, ImageDraw, ImageFont

# ==========================================
# BOT VA WEBAPP SOZLAMALARI
# ==========================================
BOT_TOKEN = "8530413309:AAFcRGXboIV8oWt3pnkVwUnYyRug1nr-5nA"  # BotFather'dan olingan aniq tokeningizni yozing
WEBAPP_URL = "https://asadbekravshanov93-create.github.io/drmed-webapp/"

# Lokal kompyuterda VPN'siz sinash uchun proksi kerak bo'lsa, quyidagi 2 qatorni faollashtiring:
# from aiogram.client.session.aiohttp import AiohttpSession
# session = AiohttpSession(proxy="http://188.166.219.225:3128")
# bot = Bot(token=BOT_TOKEN, session=session)

# Serverda (Render/PythonAnywhere) ishlatish uchun oddiy ko'rinishi:
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ==========================================
# /START BUYRUG'I
# ==========================================
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📝 Retsept Yozish", web_app=WebAppInfo(url=WEBAPP_URL))]
        ]
    )
    await message.answer(
        f"Assalomu alaykum, doktor <b>{message.from_user.first_name}</b>!\n\n"
        "Elektron retsept yaratish uchun quyidagi tugmani bosing:",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

# ==========================================
# RETSEPT RASMINI YARATISH FUNKSIYASI (PIL)
# ==========================================
def generate_recipe_image(data: dict) -> BytesIO:
    # A4 nisbatdagi oq sahifa yaratamiz
    width, height = 800, 1150
    img = Image.new("RGB", (width, height), color="#FFFFFF")
    draw = ImageDraw.Draw(img)

    # Shriftlarni yuklash
    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_header = ImageFont.truetype("arialbd.ttf", 16)
        font_body = ImageFont.truetype("arial.ttf", 15)
        font_bold = ImageFont.truetype("arialbd.ttf", 15)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except IOError:
        font_title = font_header = font_body = font_bold = font_small = ImageFont.load_default()

    # Ranglar
    teal_color = "#0d9488"
    dark_color = "#1e293b"
    gray_color = "#64748b"
    light_border = "#cbd5e1"

    # --- HEADER SECTION ---
    draw.rectangle([40, 40, 80, 80], outline=teal_color, width=4)
    draw.line([60, 48, 60, 72], fill=teal_color, width=4)
    draw.line([48, 60, 72, 60], fill=teal_color, width=4)

    draw.text((100, 35), "DR.MED", fill=teal_color, font=font_title)
    draw.text((100, 68), "ELEKTRON RETSEPT", fill=dark_color, font=font_header)

    # O'ng tomondagi ID va Sana
    recipe_id = f"RX-2026-{random.randint(10000, 99999)}"
    draw.text((580, 45), f"Retsept ID: {recipe_id}", fill=gray_color, font=font_small)

    # Shifoxona manzili
    draw.text((40, 100), "DR.MED Tibbiyot Markazi", fill=dark_color, font=font_bold)
    draw.text((40, 120), "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi, 12-uy", fill=gray_color, font=font_small)
    draw.text((40, 138), "Tel: +998 90 123 45 67", fill=gray_color, font=font_small)

    draw.line([40, 160, 760, 160], fill=teal_color, width=2)

    # --- BEMOR MA'LUMOTLARI ---
    y = 180
    draw.text((40, y), "BEMOR MA'LUMOTLARI", fill=teal_color, font=font_header)
    y += 25

    info_labels = [
        ("F.I.Sh.:", data.get("patient_name", "-")),
        ("Tug'ilgan sanasi:", data.get("birth_date", "-")),
        ("Yoshi:", f"{data.get('age', '-')} yosh"),
        ("Jinsi:", data.get("gender", "-")),
        ("Manzili:", data.get("address", "-")),
        ("Ambulator karta №:", data.get("card_num", "-"))
    ]

    for label, val in info_labels:
        draw.text((50, y), label, fill=gray_color, font=font_body)
        draw.text((220, y), str(val), fill=dark_color, font=font_bold)
        y += 22

    y += 10
    draw.line([40, y], [760, y], fill=light_border, width=1)
    y += 15

    # --- DIAGNOZ ---
    draw.text((40, y), "DIAGNOZ", fill=teal_color, font=font_header)
    y += 25
    draw.text((50, y), "Tashxis:", fill=gray_color, font=font_body)
    draw.text((220, y), data.get("diagnosis", "-"), fill=dark_color, font=font_bold)
    y += 35

    draw.line([40, y], [760, y], fill=light_border, width=1)
    y += 15

    # --- RETSEPT (Rp) QISMI ---
    draw.text((350, y), "R E T S E P T", fill=dark_color, font=font_title)
    y += 40

    box_start_y = y
    y += 15

    draw.text((60, y), "Rp.:", fill=dark_color, font=font_bold)

    medicines = data.get("medicines", [])
    for idx, med in enumerate(medicines, 1):
        med_name = med.get("name", "")
        med_dose = med.get("dose", "")
        
        draw.text((110, y), f"{idx}. {med_name}", fill=dark_color, font=font_bold)
        y += 22
        draw.text((130, y), f"S. {med_dose}", fill=gray_color, font=font_body)
        y += 28

    y += 10
    box_end_y = y
    draw.rectangle([50, box_start_y, 750, box_end_y], outline=light_border, width=1)

    y += 30
    # --- SHIFOKOR IMZOSI VA SANA ---
    current_date = datetime.now().strftime("%d.%m.%Y")
    draw.text((50, y), f"Sana: {current_date}", fill=dark_color, font=font_body)
    draw.text((300, y), "Shifokor imzosi: ___________", fill=dark_color, font=font_body)

    # Muhr doirasi simulyatsiyasi
    draw.ellipse([600, y - 20, 720, y + 100], outline=teal_color, width=2)
    draw.text((618, y + 25), "DR.MED", fill=teal_color, font=font_bold)
    draw.text((612, y + 45), "TOSHKENT", fill=teal_color, font=font_small)

    y += 120
    # --- PASTKI OGOHLANTIRUV ---
    draw.rectangle([40, y, 760, y + 35], outline=teal_color, width=1)
    draw.text((80, y + 10), "Ushbu retsept faqat malakali shifokor tomonidan tibbiy ko'rikdan so'ng rasmiylashtiriladi.", fill=teal_color, font=font_small)

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer

# ==========================================
# WEBAPP'DAN KELGAN MA'LUMOTNI QABUL QILISH
# ==========================================
@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    raw_data = message.web_app_data.data
    data = json.loads(raw_data)

    await message.answer("🔄 Retsept shakllantirilmoqda, iltimos kuting...")

    image_bytes = generate_recipe_image(data)
    photo_file = BufferedInputFile(image_bytes.getvalue(), filename="retsept.png")

    caption_text = (
        f"✅ <b>Tayyor retsept</b>\n\n"
        f"👤 <b>Bemor:</b> {data.get('patient_name')}\n"
        f"🩺 <b>Tashxis:</b> {data.get('diagnosis')}\n"
        f"📅 <b>Sana:</b> {datetime.now().strftime('%d.%m.%Y')}"
    )

    await message.answer_photo(
        photo=photo_file,
        caption=caption_text,
        parse_mode="HTML"
    )

# ==========================================
# BOTNI ISHGA TUSHIRISH
# ==========================================
async def main():
    print("Bot muvaffaqiyatli ishga tushdi...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
