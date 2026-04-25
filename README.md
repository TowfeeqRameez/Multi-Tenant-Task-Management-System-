# 📋 Multi-Tenant Task Management System 🏢⚡

A scalable backend system that allows multiple organizations (tenants) to manage tasks independently with real-time updates and secure authentication.

---

## 🚀 Features

* 🔐 **User Authentication** (JWT-based login & registration)
* 🏢 **Multi-Tenant Architecture** (separate data per organization)
* 📋 **Task Management (CRUD)** (Create, Read, Update, Delete tasks)
* ⚡ **Real-Time Updates** using Socket.io
* 👥 **Multi-User Collaboration**
* 🗄️ **PostgreSQL Database Integration**
* 🔄 **RESTful API Design**

---

## 🛠️ Tech Stack

* ⚙️ **Backend:** Node.js, Express.js
* 🗄️ **Database:** PostgreSQL
* 🔗 **ORM:** Prisma
* 🔐 **Authentication:** JWT
* ⚡ **Real-time:** Socket.io
* 🧠 **Language:** TypeScript

---

## 📁 Project Structure

```
src/
 ├── controllers/
 ├── routes/
 ├── middleware/
 ├── utils/
 ├── socket/
 └── index.ts

prisma/
 └── schema.prisma
```

---

## ▶️ Getting Started

### 1️⃣ Install dependencies

```
npm install
```

### 2️⃣ Setup environment variables

Create a `.env` file:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/taskdb"
JWT_SECRET="your_secret_key"
```

### 3️⃣ Setup database

```
npx prisma generate
npx prisma db push
```

### 4️⃣ Run the server

```
npx ts-node src/index.ts
```

---

## 🌐 API Endpoints

* 🔑 `POST /auth/register` → Register user
* 🔐 `POST /auth/login` → Login user
* 📋 `GET /tasks` → Get tasks
* ➕ `POST /tasks` → Create task
* ✏️ `PUT /tasks/:id` → Update task
* ❌ `DELETE /tasks/:id` → Delete task

---

## 🎯 Key Highlights

* ⚡ Real-time collaboration without page refresh
* 🏢 Multi-tenant scalable architecture
* 🔐 Secure authentication system
* 🧩 Clean modular backend structure

---

## 📌 Future Improvements

* 🌐 Add frontend (React)
* 📊 Task analytics dashboard
* 🔔 Notifications system
* ☁️ Deployment (AWS / Docker)

---

## 👨‍💻 Author

**Towfeeq Rameez**

---

## ⭐ Show Your Support

If you like this project, give it a ⭐ on GitHub!
