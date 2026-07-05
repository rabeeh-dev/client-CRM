# Client Workspace - Freelancer Operating System (CRM)

A comprehensive Customer Relationship Management (CRM) and project management system tailored specifically for freelancers, agencies, and independent professionals.

---

## 1. Technical Stack Overview

### **Backend (Server-Side)**
- **Runtime:** Node.js (v20+)
- **Framework:** Express.js (v4.19.2) - Handles request routing, custom middleware execution, and controllers.
- **Database:** MongoDB - NoSQL document storage.
- **ODM:** Mongoose (v8.4.1) - Schema definitions, data validation, and aggregation pipelines.
- **Authentication:** Session-based authentication via [express-session](https://www.npmjs.com/package/express-session) using `connect-mongo` to persist sessions in a `sessions` MongoDB collection with a 14-day TTL. Hashing is performed using `bcrypt` (12 rounds).
- **Validation:** [express-validator](https://express-validator.github.io/docs/) for form request verification (used in authentication).
- **Rate Limiting:** A custom, in-memory rate-limiting middleware mapping failed attempts by remote IP addresses.

### **Frontend (Client-Side)**
- **View Engine:** EJS (Embedded JavaScript) - Server-side page layout composition.
- **Styling:** Modular Custom CSS design system located under `public/css`.
- **Icons:** Lucide Icons.
- **Interactivity:** Client-side JavaScript.

### **Integrations & Third-Party Services**
- **File Uploads & Storage:** Cloudinary integration for user profile photos and company logo uploads. Powered by `multer` (in-memory buffer storage) and the Cloudinary SDK.
- **Email Delivery (Planned/Stubbed):** Dependency `nodemailer` is defined in `package.json`, but currently email logs are mock-recorded as database activities.

---

## 2. Directory Structure & File Map

Below is a detailed map of the project files and directories:

- [app.js](file:///Users/rabeeh/Client%20CRM/app.js): Configures Express middleware, session store, local variables, and mounts router paths.
- [server.js](file:///Users/rabeeh/Client%20CRM/server.js): Starts the HTTP server, handles uncaught promise rejections, and connects to MongoDB.
- **config/**
  - [database.js](file:///Users/rabeeh/Client%20CRM/config/database.js): Database connection setup using Mongoose.
- **middleware/**
  - [auth.js](file:///Users/rabeeh/Client%20CRM/middleware/auth.js): Provides `isAuthenticated` and `isGuest` guards to secure routes.
  - [rateLimiter.js](file:///Users/rabeeh/Client%20CRM/middleware/rateLimiter.js): Implements login brute-force protection.
  - [upload.js](file:///Users/rabeeh/Client%20CRM/middleware/upload.js): Multer configurations for Cloudinary and memory storage.
  - [errorHandler.js](file:///Users/rabeeh/Client%20CRM/middleware/errorHandler.js): Centralized Express error handler rendering 500 error views.
  - *Stubs:* `activityLogger.js` (empty placeholder).
- **models/**
  - [User.js](file:///Users/rabeeh/Client%20CRM/models/User.js): Freelancer profile, preferences, and credential details.
  - [Lead.js](file:///Users/rabeeh/Client%20CRM/models/Lead.js): Sales pipeline opportunities with interaction history and follow-up alerts.
  - [Client.js](file:///Users/rabeeh/Client%20CRM/models/Client.js): Converted leads or manually registered active customers.
  - [Project.js](file:///Users/rabeeh/Client%20CRM/models/Project.js): Work projects containing scope details, milestone checklists, and progress metrics.
  - [Task.js](file:///Users/rabeeh/Client%20CRM/models/Task.js): Granular action items linked to a specific project.
  - [Payment.js](file:///Users/rabeeh/Client%20CRM/models/Payment.js): Invoices and receipts tracking transactions against projects.
  - [Activity.js](file:///Users/rabeeh/Client%20CRM/models/Activity.js): Logs communication, uploads, checklist items, and workflow actions.
  - [Document.js](file:///Users/rabeeh/Client%20CRM/models/Document.js): Tracks uploaded files associated with clients or projects.
  - *Stubs:* `Notification.js` and `Setting.js` (both empty placeholders).
- **controllers/**
  - [auth.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/auth.controller.js): Sign-in and logout processing, including initial admin bootstrapping.
  - [dashboard.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/dashboard.controller.js): Compiles metrics, activities, tasks, and deadlines for the overview dashboard.
  - [lead.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/lead.controller.js): Coordinates the leads pipeline, interactions, follow-ups, and conversion process.
  - [client.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/client.controller.js): Manages customers, project additions, document metadata registry, and email logs.
  - [project.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/project.controller.js): Coordinates project workflows, checklists, tasks, payments, and document mappings.
  - [task.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/task.controller.js): Kanban task board display, CRUD, and status column updates.
  - [payment.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/payment.controller.js): Invoice creation, payment receipts logging, and ledger billing calculations.
  - [calendar.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/calendar.controller.js): Calculates month and week grids, overlaying events from across multiple models.
  - [analytics.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/analytics.controller.js): Aggregates historical revenue, client share, and project metrics.
  - [settings.controller.js](file:///Users/rabeeh/Client%20CRM/controllers/settings.controller.js): Profile and preferences updater including logo/avatar image streaming.
  - *Stubs:* `document.controller.js` (empty placeholder).
- **routes/**
  - [auth.routes.js](file:///Users/rabeeh/Client%20CRM/routes/auth.routes.js), [dashboard.routes.js](file:///Users/rabeeh/Client%20CRM/routes/dashboard.routes.js), [lead.routes.js](file:///Users/rabeeh/Client%20CRM/routes/lead.routes.js), [client.routes.js](file:///Users/rabeeh/Client%20CRM/routes/client.routes.js), [project.routes.js](file:///Users/rabeeh/Client%20CRM/routes/project.routes.js), [task.routes.js](file:///Users/rabeeh/Client%20CRM/routes/task.routes.js), [calendar.routes.js](file:///Users/rabeeh/Client%20CRM/routes/calendar.routes.js), [payment.routes.js](file:///Users/rabeeh/Client%20CRM/routes/payment.routes.js), [analytics.routes.js](file:///Users/rabeeh/Client%20CRM/routes/analytics.routes.js), [settings.routes.js](file:///Users/rabeeh/Client%20CRM/routes/settings.routes.js).
  - *Stubs:* `document.routes.js` (empty placeholder).
- **validators/**
  - [auth.validator.js](file:///Users/rabeeh/Client%20CRM/validators/auth.validator.js): Express validators for the login request.
  - *Stubs:* `client.validator.js`, `lead.validator.js`, `payment.validator.js`, `project.validator.js`, `task.validator.js` (all empty placeholders).
- **services/**
  - *Stubs:* `activity.service.js`, `cloudinary.service.js`, `dashboard.service.js`, `email.service.js`, `notification.service.js`, `payment.service.js` (all empty placeholders; dependencies like Cloudinary and Mongo operations are handled inline inside middleware and controllers instead).
- **utils/**
  - [logger.js](file:///Users/rabeeh/Client%20CRM/utils/logger.js): Structured console logger wrapper.
  - [seed.js](file:///Users/rabeeh/Client%20CRM/utils/seed.js): Seeds/synchronizes the main administrator user from `.env` keys.
  - [check-user.js](file:///Users/rabeeh/Client%20CRM/utils/check-user.js), [test-auth.js](file:///Users/rabeeh/Client%20CRM/utils/test-auth.js), [reset-db.js](file:///Users/rabeeh/Client%20CRM/utils/reset-db.js): Debug scripts.
  - *Stubs:* `constants.js`, `formatter.js`, `helpers.js`, `pagination.js` (all empty placeholders).
- **public/css/**
  - Structured modular design rules organized into subfolders: `base/` (CSS reset and variables), `components/` (modals, badges, forms, widgets), `layout/` (sidebar, header grid layouts), and `pages/` (page-specific CSS overrides).

---

## 3. Database Schema Specifications

### **1. User Schema** (`User`)
Represents the authenticated account (the business owner).
- `firstName` (String, required): Max 100 characters.
- `lastName` (String, required): Max 100 characters.
- `username` (String, required, unique, lowercase): Alphanumeric and underscores only, 3-50 characters.
- `email` (String, required, unique, lowercase): Valid email regex validation.
- `password` (String, required): Hashed using `bcrypt`.
- `role` (String, enum: `['admin']`, default: `admin`).
- `profileImage` (String, default: null): Avatar image URL.
- `company` (Object):
  - `name`, `logo` (Cloudinary URL), `phone`, `address`, `email`.
- `smtp` (Object):
  - `senderEmail`.
- `preferences` (Object):
  - `currency` (default: `'INR'`).
  - `timezone` (default: `'Asia/Kolkata'`).
  - `dateFormat` (default: `'DD/MM/YYYY'`).

### **2. Lead Schema** (`Lead`)
Represents potential customer opportunities.
- `userId` (ObjectId, ref: `'User'`, required).
- `name` (String, required): Max 200 characters.
- `email` (String, lowercase): Valid email pattern.
- `phone`, `company` (String).
- `source` (String, enum: `['referral', 'website', 'social_media', 'cold_outreach', 'freelance_platform', 'event', 'other']`, default: `'other'`).
- `status` (String, enum: `['new', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost']`, default: `'new'`).
- `estimatedValue` (Number, default: 0).
- `currency` (String, default: `'INR'`).
- `priority` (String, enum: `['low', 'medium', 'high']`, default: `'medium'`).
- `notes` (String).
- `socialMedia` (Object): `linkedin`, `twitter`, `instagram`, `whatsapp`.
- `interactions` (Array of objects):
  - `type` (String, enum: `['call', 'email', 'meeting', 'note']`, required).
  - `description` (String, required, max 2000 chars).
  - `date` (Date, default: `Date.now`).
- `followUps` (Array of objects):
  - `date` (Date, required).
  - `note` (String, max 500 chars).
  - `isCompleted` (Boolean, default: false).
- `convertedClientId` (ObjectId, ref: `'Client'`, default: null).
- `convertedAt` (Date, default: null).
- `isDeleted` (Boolean, default: false).
- `deletedAt` (Date, default: null).

### **3. Client Schema** (`Client`)
Represents active clients who have projects, invoices, and documents.
- `userId` (ObjectId, ref: `'User'`, required).
- `name` (String, required): Max 200 characters.
- `email`, `phone`, `company` (String).
- `rating` (Number, 1-5, default: 5).
- `notes` (String).
- `status` (String, enum: `['active', 'inactive']`, default: `'active'`).
- `socialMedia` (Object): `linkedin`, `twitter`, `instagram`, `whatsapp`.
- `isDeleted` (Boolean, default: false).

### **4. Project Schema** (`Project`)
Projects active under a Client.
- `userId` (ObjectId, ref: `'User'`, required).
- `clientId` (ObjectId, ref: `'Client'`, required).
- `name` (String, required): Max 200 characters.
- `description` (String).
- `status` (String, enum: `['planning', 'in_progress', 'completed', 'on_hold']`, default: `'planning'`).
- `priority` (String, enum: `['low', 'medium', 'high']`, default: `'medium'`).
- `value` (Number, default: 0).
- `budget` (Number, default: 0).
- `amountReceived` (Number, default: 0).
- `progress` (Number, 0-100, default: 0).
- `checklist` (Array of objects):
  - `label` (String, required).
  - `completed` (Boolean, default: false).
- `startDate`, `endDate` (Date).
- `isDeleted` (Boolean, default: false).
- *Pre-save Hook:* Automatically synchronizes `value` and `budget`. If `budget` changes, `value` is matched, and vice versa.

### **5. Task Schema** (`Task`)
Granular project items mapped to the Kanban board.
- `userId` (ObjectId, ref: `'User'`, required).
- `projectId` (ObjectId, ref: `'Project'`, required).
- `title` (String, required): Max 500 characters.
- `description` (String).
- `status` (String, enum: `['todo', 'in_progress', 'completed']`, default: `'todo'`).
- `priority` (String, enum: `['low', 'medium', 'high']`, default: `'medium'`).
- `dueDate` (Date).
- `isDeleted` (Boolean, default: false).

### **6. Payment Schema** (`Payment`)
Tracks billing invoices and payment installments (transactions).
- `userId` (ObjectId, ref: `'User'`, required).
- `clientId` (ObjectId, ref: `'Client'`, required).
- `projectId` (ObjectId, ref: `'Project'`).
- `amount` (Number, required).
- `invoiceNumber` (String, required).
- `status` (String, enum: `['pending', 'paid', 'overdue']`, default: `'pending'`).
- `dueDate` (Date, required).
- `paidDate` (Date).
- `transactions` (Array of objects):
  - `amount` (Number, required).
  - `date` (Date, default: `Date.now`).
  - `method` (String, enum: `['bank_transfer', 'cash', 'card', 'upi', 'other']`, default: `'bank_transfer'`).
  - `notes` (String).
- `isDeleted` (Boolean, default: false).
- *Pre-save Hook:* Automatically sets `paidDate = new Date()` when invoice status is set to `'paid'`, and deletes it if set back.

### **7. Activity Schema** (`Activity`)
Audits all workflow logs, notes, and emails in a single timeline.
- `userId` (ObjectId, ref: `'User'`, required).
- `clientId` (ObjectId, ref: `'Client'`, required).
- `projectId` (ObjectId, ref: `'Project'`).
- `type` (String, enum: `['general', 'project', 'payment', 'document', 'email', 'call', 'meeting', 'note']`, default: `'general'`).
- `description` (String, required).
- `date` (Date, default: `Date.now`).

### **8. Document Schema** (`Document`)
Metadata registries mapping external document links to Clients/Projects.
- `userId` (ObjectId, ref: `'User'`, required).
- `clientId` (ObjectId, ref: `'Client'`, required).
- `projectId` (ObjectId, ref: `'Project'`).
- `name` (String, required).
- `fileUrl` (String, required): Secure URL link.
- `fileSize` (String, default: `'0 KB'`).
- `fileType` (String, default: `'PDF'`).
- `uploadedAt` (Date, default: `Date.now`).
- `isDeleted` (Boolean, default: false).

---

## 4. Key Core Technical Workflows

### **A. Authentication, Registration, and Bootstrapping**
1. **Bootstrapping & Syncing the Admin Account:**
   During server startup (in the database connection hook), the application automatically checks for an existing administrator account (role: `'admin'`). If found, it synchronizes the details (username, email, password) in the database with the current configurations specified in the `.env` file (e.g., `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`). If no administrator exists, it bootstraps the user automatically using these values. Hashing is applied to the new password upon save using Mongoose hooks.

2. **Brute-Force Lockout Middleware:**
   To secure logins without external packages, [rateLimiter.js](file:///Users/rabeeh/Client%20CRM/middleware/rateLimiter.js) intercepts the endpoint. It tracks failed attempts from each remote IP in an in-memory Map, periodically running memory cleanups (every 60s). If an IP registers 5 consecutive failed attempts, it triggers a 15-minute lockout window.
3. **Session Handshake:**
   On success, session parameters are established, serialized into MongoDB by `connect-mongo`, and mapping hooks write the session data to `res.locals.user` for frontend templates access on subsequent calls.

### **B. Sidebar Metrics & Unified Notifications Middleware**
In [app.js](file:///Users/rabeeh/Client%20CRM/app.js), a global middleware queries the database on each request when the user is logged in to construct real-time notifications:
- Counts active leads (excluding statuses `'won'` or `'lost'`).
- Queries all Tasks with a `dueDate` within 3 days that are not completed.
- Queries upcoming Activities of type `'meeting'` scheduled between today and the next 3 days.
- Aggregates both datasets, sorts by date, and exposes the top 6 entries as a global `notifications` variable.

### **C. Unified Calendar Calculations**
The Calendar workspace combines data from five models into a single calendar view:
- **Client Meetings:** Querying `Activity` where `type: 'meeting'`.
- **Lead Meetings:** Querying `interactions` in the `Lead` model where `type: 'meeting'`.
- **Lead Follow-ups:** Extracting unresolved follow-up items from the `Lead` model's arrays.
- **Project Deadlines:** Fetching `Project` records containing an `endDate`.
- **Task Deadlines:** Querying `Task` objects that possess a `dueDate`.
- The controller dynamically compiles a 42-cell calendar grid for the month view (including trailing padding days from the previous month and leading padding days from the next month) or a 7-column layout for the week view, matching events to dates using an ISO date-string comparison.

### **D. Lead Conversion Workflow**
A lead can be converted into an active customer in two ways:
1. **Automatic Conversion:** Changing the status to `'won'` in `updateLead` triggers a hook that creates a matching `Client` document, copies the contact details, logs a general Activity, and links `convertedClientId` on the lead.
2. **Manual Conversion:** Submitting to the dedicated `/leads/:id/convert` API checks for double-conversion, constructs the `Client` object, updates the lead status to `'won'`, and returns the client ID to redirect the user to the new Customer workspace.

### **E. Invoicing & Billing Progress Computation**
- **Billing Receipts:** Creating a payment records a full transaction in the `Payment` ledger and increments the linked project's `amountReceived` buffer.
- **Invoice Balance Ledger:** Adding partial payments (installments) adds entries to the invoice's `transactions` sub-document array. If the sum of transaction amounts meets or exceeds the invoice amount, the invoice status changes to `'paid'`, writing `paidDate` to the record and incrementing the project's cumulative `amountReceived`.
- **Overdue Invoices:** The ledger dynamically flags pending invoices whose due dates have elapsed as `'overdue'` during metric aggregations, ensuring accurate balance and revenue figures for the dashboard.

---

## 5. Development & Configuration Details

### **Prerequisites**
- Node.js (v20+)
- MongoDB (Running instance)
- Cloudinary Credentials (if handling avatars/logo media uploads)

### **Environment Setup (.env)**
Ensure the following keys are populated in your local `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/client-workspace
SESSION_SECRET=a_secure_session_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Default Bootstrapped Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=Password123
DEFAULT_ADMIN_EMAIL=admin@clientworkspace.io
DEFAULT_ADMIN_FIRST_NAME=System
DEFAULT_ADMIN_LAST_NAME=Administrator
```

### **Utility Tasks**
- **Seeding/Syncing Admin User:**
  Run the seeder tool to initialize or synchronize your admin credentials:
  ```bash
  npm run seed
  ```
- **Development Server:**
  Boot with nodemon hot-reload:
  ```bash
  npm run dev
  ```
- **Production Boot:**
  ```bash
  npm start
  ```
