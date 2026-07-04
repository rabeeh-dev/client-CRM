# Client Workspace - Freelancer Operating System (CRM)

## 1. Project Overview
Client Workspace is a comprehensive Customer Relationship Management (CRM) and project management system tailored specifically for freelancers, agencies, and independent professionals. The primary goal of the system is to centralize the entire freelance workflow: from acquiring initial leads and converting them into clients, to managing ongoing projects, tracking daily tasks, scheduling activities, and handling invoicing and payments.

This "Operating System" provides a unified dashboard to monitor business health, track upcoming deadlines, and manage the sales pipeline effectively.

---

## 2. Technical Stack

The project is built on a robust JavaScript/Node.js stack using the MVC (Model-View-Controller) architecture.

### **Backend (Server-Side)**
- **Runtime:** Node.js (v20.0.0+)
- **Framework:** Express.js (v4.19.2) - Handles routing, middleware, and HTTP requests.
- **Database:** MongoDB - NoSQL database for flexible document storage.
- **ODM (Object Data Modeling):** Mongoose (v8.4.1) - Schema validation and DB interactions.
- **Authentication:** Custom session-based authentication using `express-session` and `bcrypt` for password hashing.
- **Session Storage:** `connect-mongo` for persisting user sessions in MongoDB.
- **Validation:** `express-validator` for backend form validation and sanitization.

### **Frontend (Client-Side)**
- **View Engine:** EJS (Embedded JavaScript templates) - Server-side rendering of HTML pages.
- **Styling:** Custom CSS (Vanilla CSS structure, likely incorporating a modern design system with CSS variables).
- **Icons:** Lucide Icons (referenced in EJS views).
- **Interactivity:** Vanilla JavaScript for DOM manipulation, modals, and dynamic UI updates.

### **Integrations & Third-Party Services**
- **File Uploads:** `multer` and `multer-storage-cloudinary` for handling multipart/form-data and uploading files directly to Cloudinary.
- **Cloud Storage:** Cloudinary SDK for storing user avatars, client documents, and project files.
- **Email Delivery:** `nodemailer` for sending transactional emails (e.g., onboarding, password resets, payment reminders).

---

## 3. Architecture & Directory Structure

The application strictly follows the **MVC (Model-View-Controller)** design pattern.

```
/
├── app.js                 # Application setup, middleware configuration, global variables
├── server.js              # Entry point; binds the Express app to a port and starts the server
├── package.json           # Dependencies and NPM scripts
├── .env                   # Environment variables (DB URI, Secrets, API Keys)
├── config/                # Configuration files (e.g., Database connection logic)
├── models/                # Mongoose Schema definitions (The "Model" in MVC)
├── controllers/           # Business logic and request handlers (The "Controller" in MVC)
├── routes/                # Express router definitions mapping URLs to Controllers
├── views/                 # EJS templates (The "View" in MVC)
├── public/                # Static assets (CSS, client-side JS, images)
├── middleware/            # Custom Express middlewares (Auth guards, Error handlers)
├── services/              # Abstractions for 3rd party APIs (e.g., Cloudinary, Nodemailer)
├── utils/                 # Utility helpers (e.g., Database seeders, formatting tools)
└── validators/            # Request validation logic using express-validator
```

---

## 4. Data Models (Database Entities)

The system revolves around several core entities linked to the authenticated `User`:

1. **User:** The freelancer/agency owner using the system. Contains credentials, profile info, and business settings.
2. **Lead:** A potential client. Contains contact info, lead source, status (e.g., New, Contacted, Qualified, Won, Lost), and estimated value.
3. **Client:** An active customer. Usually converted from a "Won" Lead. Contains company details, contact info, and serves as the parent entity for Projects, Payments, and Activities.
4. **Project:** Work being done for a Client. Contains scope, status (Planning, In Progress, Completed), start/end dates, and budget.
5. **Task:** Actionable items. Can be attached to a specific Project or stand-alone. Contains priority, due dates, and completion status.
6. **Payment (Invoice):** Financial records attached to a Client/Project. Contains amount, due date, status (Pending, Paid, Overdue), and payment method.
7. **Activity:** Logged interactions with a Client (e.g., Meeting, Call, Email, Note). Used for timeline tracking and calendar scheduling.
8. **Document:** Files uploaded to Cloudinary, attached to either a Client or a Project for centralized asset management.

*(All entities generally include a `userId` reference to ensure data isolation in a multi-tenant environment, and an `isDeleted` flag for soft deletes).*

---

## 5. Non-Technical Workflows (User Journey)

### **A. The Sales Pipeline (Lead to Client)**
1. **Lead Capture:** The freelancer receives a new inquiry and adds a **Lead** into the system.
2. **Nurturing:** The freelancer logs **Activities** (emails sent, discovery calls made) against the Lead.
3. **Conversion:** Once the lead agrees to a proposal, their status is changed to "Won". The system provides a workflow to automatically convert this Lead into a **Client**.

### **B. Project Delivery**
1. **Initiation:** The freelancer creates a new **Project** under the newly converted Client.
2. **Planning:** The freelancer breaks the project down into **Tasks**, assigning due dates and priorities.
3. **Execution:** As work progresses, the freelancer marks Tasks as complete and uploads necessary assets as **Documents**.
4. **Completion:** Once all tasks are done, the Project status is marked as "Completed".

### **C. Financial Workflow**
1. **Invoicing:** The freelancer generates a **Payment** record (Invoice) linked to the Client/Project.
2. **Tracking:** The Dashboard tracks "Pending Payments" and flags them as "Overdue" if the due date passes.
3. **Collection:** Once the client pays, the freelancer updates the Payment status to "Paid". This immediately reflects in the Dashboard's "Revenue This Month" analytics.

### **D. Daily Operations & Productivity**
1. **Dashboard:** The freelancer logs in and views the Dashboard. They see dynamic widgets showing:
   - Active Clients added this month.
   - Projects nearing their completion deadlines.
   - Overdue payments requiring follow-up.
   - Monthly revenue growth.
2. **Notifications:** The global sidebar alerts the freelancer of Tasks due within the next 3 days and upcoming Meetings.
3. **Calendar:** The freelancer uses the Calendar view to visualize all upcoming Activities and Task deadlines.

---

## 6. Technical Workflows

### **Authentication & Session Lifecycle**
1. User submits login form.
2. Auth Controller looks up the user by email, compares password using `bcrypt.compare`.
3. If successful, `req.session.userId` is set.
4. `connect-mongo` serializes this session and stores it in the MongoDB `sessions` collection with a 14-day TTL.
5. On subsequent requests, the `express-session` middleware reads the signed cookie, retrieves the session from MongoDB, and populates `req.session`.
6. A global middleware in `app.js` checks `req.session.userId`, fetches the User document, and attaches it to `res.locals.user` making it accessible in all EJS views.

### **Global Data Middleware (res.locals)**
To keep the UI consistent, `app.js` runs a middleware on every request that:
1. Fetches the active Lead count for the sidebar badge.
2. Queries the DB for Tasks due in <= 3 days and upcoming Meetings.
3. Formats these into a unified `notifications` array.
4. Attaches them to `res.locals`, so the navbar/sidebar can render them dynamically without each individual controller needing to fetch them.

### **File Upload Workflow (Cloudinary)**
1. A user submits a form with `enctype="multipart/form-data"`.
2. The route utilizes a `multer` middleware configured with `multer-storage-cloudinary`.
3. As the file is streamed to the server, it is piped directly to the Cloudinary API.
4. Cloudinary responds with a secure URL (e.g., `https://res.cloudinary.com/...`).
5. The Controller receives `req.file.path` (the Cloudinary URL) and saves this URL string into the MongoDB document (e.g., as a user's avatar or a Document record).

### **Error Handling**
- Express routes wrap asynchronous controller logic in `try/catch` blocks.
- Errors are passed to `next(err)`.
- A centralized error handling middleware (`middleware/errorHandler.js`) catches these, logs them, and renders a friendly `500 Internal Server Error` page (or sends JSON for API requests).
- Missing routes fall through to a 404 handler that renders an `errors/404.ejs` view.

---

## 7. Development & Environment Setup

### **Prerequisites**
- Node.js (v20+)
- MongoDB (Local instance or MongoDB Atlas cluster)
- Cloudinary Account (for file uploads)

### **Environment Variables (.env)**
The system requires a `.env` file at the root:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/client-workspace
SESSION_SECRET=your_super_secret_session_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### **Running the Application**
1. **Install dependencies:** `npm install`
2. **Seed Database (Optional):** `npm run seed` (Uses `utils/seed.js` to populate dummy data).
3. **Run in Development (Auto-restart):** `npm run dev` (Uses nodemon).
4. **Run in Production:** `npm start` (Standard node execution).

The server will start on the port defined in `.env` (default 3000) and will be accessible at `http://localhost:3000`.
