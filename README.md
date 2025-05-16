# University Study Hub & Planner

A web application to assist university students in managing academic resources and personal study tasks.

## Features

* **User Authentication:** Register and log in to access personalized features.
* **Collaborative Resources:**
    * View a list of study resources shared by the community (publicly available).
    * Add new resources (requires login).
    * Mark resources as "Viewed" (personalized).
    * "Pin" important resources for quick access (personalized).
    * View separate lists for Available, Viewed, and Pinned resources.
* **Personalized Study Planner:**
    * Add, view, mark as complete, and delete personal study tasks (requires login).
    * Tasks include a name, optional due date, and related course.
    * Visual "time bar" indicating progress towards the due date since creation.
* **Responsive Design:** Usable across desktops, tablets, and mobile phones.

## Technologies Used

* **Frontend:**
    * `HTML5`: Structures the content.
    * `CSS3`: Styles the application and handles responsiveness.
    * `JavaScript`: Manages frontend logic, user interaction, navigation, and communication with the backend (Single Page Application behavior).
* **Backend:**
    * `PHP`: Server-side language for processing requests and interacting with the database.
    * `MySQL`: Relational database for storing application data.

## Setup and Installation

To run this project, you need a server environment with PHP and MySQL installed.

### Prerequisites

* A web server (like Apache or Nginx).
* PHP (v7.4 or higher recommended).
* MySQL database server.
* A modern web browser.

### Database Setup

1.  Access your MySQL server.
2.  Create a new database (replace `your_database_name`):
    ```sql
    CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE your_database_name;
    ```
3.  Run the following SQL to create tables:
    ```sql
    -- Create users table
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords!
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create resources table
    CREATE TABLE resources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Create tasks table
    CREATE TABLE tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        due_date DATE,
        course VARCHAR(100),
        completed BOOLEAN DEFAULT FALSE,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Table to track which resources users have viewed
    CREATE TABLE user_viewed_resources (
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, resource_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );

    -- Table to track which resources users have pinned
    CREATE TABLE user_pinned_resources (
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, resource_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    ```
4.  Create a MySQL user with privileges for this database.

### Code Deployment

1.  Download or clone the project files (`index.html`, `style.css`, `script.js`, `api.php`, `auth.php`, `includes/db.php`).
2.  Place these files in your web server's webroot directory. Ensure `includes` is a subdirectory.
3.  **Configuration:**
    * Edit `includes/db.php`: Update `$dbHost`, `$dbUsername`, `$dbPassword`, `$dbName` with your database details.
    * Edit `script.js`: Update the `API_BASE_URL` variable to the URL where your PHP files are hosted (e.g., `http://localhost/your-project-folder`).
    * For development, `Access-Control-Allow-Origin: *` in PHP allows cross-origin requests. Change `*` to your frontend's specific origin for production security.
4.  Access `index.html` through your web server (e.g., `http://localhost/your-project-folder/`).

## Project Structure

/your-project-folder/
|-- index.html         - Main HTML (SPA layout)
|-- style.css          - All CSS
|-- script.js          - All JavaScript frontend logic
|-- api.php            - Backend API for data operations
|-- auth.php           - Backend for user authentication
|-- includes/
|   |-- db.php         - Database connection script

## Database Schema

* **`users`**: `id`, `username`, `password_hash`, `created_at`
* **`resources`**: `id`, `title`, `url`, `category`, `description`, `user_id` (FK), `created_at`
* **`tasks`**: `id`, `name`, `due_date`, `course`, `completed`, `user_id` (FK), `created_at`
* **`user_viewed_resources`**: `user_id` (PK, FK), `resource_id` (PK, FK), `viewed_at`
* **`user_pinned_resources`**: `user_id` (PK, FK), `resource_id` (PK, FK), `pinned_at`

## API Endpoints (Backend)

The PHP backend provides JSON-based endpoints for frontend interaction.

* **`auth.php`**
    * `GET /auth.php`: Check login status.
    * `POST /auth.php` (action: `register`): Register a user.
    * `POST /auth.php` (action: `login`): Log in a user.
    * `POST /auth.php` (action: `logout`): Log out a user.

* **`api.php`**
    * `GET /api.php/resources`: Get all resources (public).
    * `POST /api.php/resources`: Add new resource (login required).
    * `GET /api.php/users/{userId}/viewed`: Get viewed resource IDs for user (login required, uses session ID).
    * `POST /api.php/users/{userId}/viewed`: Mark resource as viewed (login required, uses session ID).
    * `GET /api.php/users/{userId}/pinned`: Get pinned resource IDs for user (login required, uses session ID).
    * `POST /api.php/users/{userId}/pinned`: Pin resource (login required, uses session ID).
    * `DELETE /api.php/users/{userId}/pinned/{resourceId}`: Unpin resource (login required, uses session ID & URL ID).
    * `GET /api.php/tasks`: Get tasks for logged-in user (login required).
    * `POST /api.php/tasks`: Add new task (login required).
    * `PUT /api.php/tasks/{taskId}`: Update task (login required, uses session ID & URL ID).
    * `DELETE /api.php/tasks/{taskId}`: Delete task (login required, uses session ID & URL ID).

*(Note: Backend implementation must ensure user ID from session is used for user-specific endpoints, not trusting `{userId}` from the URL.)*

## Frontend (HTML, CSS, JavaScript)

* **`index.html`**: Structures the single page layout with sections for auth, resources, and planner.
* **`style.css`**: Styles the UI, handles responsiveness, defines colors, fonts, layout, and visual elements like the task time bar.
* **`script.js`**: Handles all dynamic behavior:
    * Manages view visibility and navigation.
    * Handles login, registration, and logout via API calls.
    * Fetches and displays resources (categorizing into Available, Viewed, Pinned based on user status).
    * Implements resource actions (Mark Viewed, Pin/Unpin) by calling the API.
    * Fetches and displays user tasks.
    * Calculates and renders the visual "time bar" for tasks based on creation and due dates.
    * Handles adding, completing, and deleting tasks via API calls.
    * Provides UI feedback (messages, loading states).

## Potential Enhancements

* Add editing functionality for resources and tasks.
* Implement search, sorting, and filtering.
* Develop real-time features (e.g., live time bar countdowns).
* Add notifications for deadlines.
* Allow resource categorization management.
* Improve UI/UX polish and mobile experience.
* Enhance backend security (e.g., API keys, more robust validation).

## Security Considerations

* **Always use HTTPS.**
* **Passwords are Hashed** server-side.
* Use **Prepared Statements** in PHP to prevent SQL Injection.
* **Validate input** on both frontend and backend.
* Backend **Authentication & Authorization** is crucial (ensure users only access/modify their own data).
* Restrict `Access-Control-Allow-Origin` in production.
* Disable detailed PHP errors on live servers.

## Troubleshooting

* Check server/PHP/MySQL error logs.
* Verify database credentials in `db.php`.
* Confirm `API_BASE_URL` in `script.js` is correct.
* Use browser developer tools (Network tab) to inspect API calls and responses.
* Ensure your web server is configured to run PHP files.
* Verify PHP session support is enabled if login/logout issues occur.

---
