# 🚀 คู่มือ Deploy Backend ไปยัง Render

คู่มือนี้จะแนะนำวิธีการ deploy Express backend (โฟลเดอร์ `server/`) ไปยัง [Render.com](https://render.com) ซึ่งเป็น Platform-as-a-Service ที่รองรับ Node.js และมี free tier

---

## 📋 สิ่งที่ต้องเตรียม

- ✅ GitHub account และ repository ที่ push โค้ดแล้ว
- ✅ Render account (สมัครฟรีได้ที่ [render.com](https://render.com))
- ✅ Supabase DATABASE_URL สำหรับ production

---

## 🔧 Step 1: เตรียม Repository

ไฟล์ที่จำเป็นได้ถูกสร้างไว้แล้ว:
- ✅ [`render.yaml`](file:///d:/varee-cm/alarm-light-kittens/render.yaml) - Configuration file สำหรับ Render
- ✅ `server/package.json` - เพิ่ม build script แล้ว

**Commit และ Push ไปยัง GitHub:**
```bash
git add render.yaml server/package.json
git commit -m "Add Render deployment configuration"
git push origin main
```

---

## 🌐 Step 2: สร้าง Web Service ใน Render

### 2.1 เข้าสู่ Render Dashboard
1. ไปที่ [https://dashboard.render.com](https://dashboard.render.com)
2. คลิก **"New +"** → เลือก **"Web Service"**

### 2.2 เชื่อมต่อ GitHub Repository
1. คลิก **"Connect a repository"**
2. Authorize Render เข้าถึง GitHub
3. เลือก repository: **`alarm-light-kittens`**

### 2.3 ตั้งค่า Web Service

กรอกข้อมูลดังนี้:

| Field | Value |
|-------|-------|
| **Name** | `alarm-light-kittens-backend` (หรือชื่อที่คุณต้องการ) |
| **Region** | `Singapore` (ใกล้ที่สุด) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

---

## 🔐 Step 3: ตั้งค่า Environment Variables

ใน Render Dashboard → คลิกที่ service → **"Environment"** tab:

### เพิ่ม Environment Variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.lijxz...` (จาก Supabase) |
| `NODE_ENV` | `production` |

> [!IMPORTANT]
> คัดลอก `DATABASE_URL` จาก [`server/.env`](file:///d:/varee-cm/alarm-light-kittens/server/.env) หรือ Supabase Dashboard
>
> **ใช้ Connection Pooler URL (port 6543)** สำหรับ production:
> ```
> postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0
> ```

---

## 🚀 Step 4: Deploy

1. คลิก **"Create Web Service"**
2. Render จะเริ่ม build และ deploy อัตโนมัติ
3. รอประมาณ 2-5 นาที
4. ตรวจสอบ logs ว่าไม่มี error

### ✅ ตรวจสอบว่า Deploy สำเร็จ

เมื่อ deploy เสร็จ คุณจะได้ URL เช่น:
```
https://alarm-light-kittens-backend.onrender.com
```

ทดสอบ API:
```bash
curl https://alarm-light-kittens-backend.onrender.com/api/markers
```

ควรได้ JSON response กลับมา

---

## 🔗 Step 5: อัพเดท Frontend ให้เชื่อมต่อกับ Backend URL

### 5.1 เพิ่ม Environment Variable

สร้างไฟล์ `.env` ที่ root ของโปรเจค:

```bash
# .env
VITE_API_BASE_URL=https://alarm-light-kittens-backend.onrender.com
```

### 5.2 อัพเดท axios.js

แก้ไขไฟล์ [`src/boot/axios.js`](file:///d:/varee-cm/alarm-light-kittens/src/boot/axios.js):

```javascript
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const api = axios.create({ baseURL })
```

### 5.3 อัพเดท .gitignore

เพิ่มใน `.gitignore`:
```
.env
.env.local
```

### 5.4 Deploy Frontend

ถ้า deploy ผ่าน Netlify หรือ GitHub Pages:
1. ตั้ง Environment Variable: `VITE_API_BASE_URL` ใน dashboard
2. Trigger rebuild

---

## 🎯 Step 6: อัพเดท CORS Settings (ถ้าจำเป็น)

ถ้า frontend อยู่คนละ domain กับ backend (เช่น GitHub Pages):

แก้ไขไฟล์ [`server/index.js`](file:///d:/varee-cm/alarm-light-kittens/server/index.js):

```javascript
app.use(cors({
  origin: [
    'http://localhost:9000',
    'https://your-frontend-url.netlify.app',
    'https://username.github.io'
  ]
}));
```

จากนั้น push และ Render จะ auto-deploy ใหม่

---

## 📊 การจัดการหลัง Deploy

### ดู Logs
Dashboard → Service → **"Logs"** tab

### Manual Deploy
Dashboard → Service → **"Manual Deploy"** → เลือก branch

### Auto Deploy
Render จะ auto-deploy ทุกครั้งที่ push ไป GitHub (default)

### Sleep Mode (Free Tier)
> [!WARNING]
> Free tier จะ sleep หลังไม่มี traffic 15 นาที
> - การ wake up ใช้เวลา 30-60 วินาที
> - ถ้าต้องการ always-on ต้องอัพเกรดเป็น paid plan

---

## 🐛 Troubleshooting

### ❌ Build Failed
- ตรวจสอบ logs ใน Render Dashboard
- ตรวจสอบว่า `server/package.json` มี dependencies ครบ
- ลองรัน `npm install && npx prisma generate` ใน local

### ❌ Cannot Connect to Database
- ตรวจสอบ `DATABASE_URL` ใน Environment Variables
- ใช้ Connection Pooler URL (port 6543)
- ตรวจสอบ Supabase IP whitelist settings

### ❌ CORS Error
- อัพเดท CORS settings ใน `server/index.js`
- เพิ่ม frontend URL ลงใน allowed origins

---

## 💰 ราคา

**Free Tier ของ Render:**
- ✅ 750 hours/month (พอสำหรับ 1 service ตลอดเดือน)
- ✅ Auto-sleep หลังไม่มี traffic 15 นาที
- ✅ 512 MB RAM
- ✅ Shared CPU

**Paid Tier ($7/month):**
- Always-on (ไม่ sleep)
- 512 MB RAM
- Dedicated resources

---

## 🎉 สรุป

หลังจากทำตามขั้นตอนข้างต้น backend ของคุณจะรันอยู่บน Render แล้ว! 

**Next Steps:**
1. ✅ ทดสอบ API endpoints
2. ✅ อัพเดท frontend baseURL
3. ✅ Deploy frontend
4. ✅ ทดสอบ end-to-end

หากมีปัญหา สามารถดู logs ใน Render Dashboard หรือ contact support ได้! 🚀
