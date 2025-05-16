<?php
// Set headers for JSON response and CORS (Cross-Origin Resource Sharing)
header('Content-Type: application/json');
// Allow requests from your frontend domain during development.
// IMPORTANT: Replace * with your frontend URL in production (e.g., http://localhost:8000 or https://your-frontend.com)
header('Access-Control-Allow-Origin: *');
// Allow POST, GET, and OPTIONS methods for authentication requests
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Include the database connection file
require_once 'includes/db.php';

// Start a session. This allows storing user information across requests.
session_start();

// Get the request method (GET, POST, OPTIONS)
$request_method = $_SERVER['REQUEST_METHOD'];

// Handle OPTIONS requests (CORS preflight)
if ($request_method === 'OPTIONS') {
    http_response_code(200);
    exit(); // Stop script execution after handling OPTIONS
}

// --- Handle GET Request (e.g., check login status) ---
if ($request_method === 'GET') {
    // Check if the user_id is set in the session
    if (isset($_SESSION['user_id'])) {
        // User is logged in
        http_response_code(200); // OK
        echo json_encode([
            "isLoggedIn" => true,
            "userId" => $_SESSION['user_id'],
            "username" => $_SESSION['username'] // Assuming you stored username in session upon login
        ]);
    } else {
        // User is not logged in
        http_response_code(200); // OK, just indicating status
        echo json_encode(["isLoggedIn" => false]);
    }
    $conn->close(); // Close the database connection for GET requests
    exit(); // Stop script execution
}


// --- Handle POST Requests (e.g., register, login, logout) ---
if ($request_method === 'POST') {
    // Get the raw POST body (expected to be JSON)
    $json_data = file_get_contents("php://input");
    // Decode the JSON string into a PHP associative array
    $data = json_decode($json_data, true);

    // Get the requested action and user credentials from the request body
    $action = $data['action'] ?? ''; // 'register', 'login', or 'logout'
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? ''; // Password needs hashing/verification

    // Use prepared statements to prevent SQL injection
    // Ensure inputs are strings before binding if they might be other types (though here username/password are strings)
    $username = is_string($username) ? $username : '';
    $password = is_string($password) ? $password : '';


    switch ($action) {
        case 'register':
            // --- User Registration ---
            if (empty($username) || empty($password)) {
                http_response_code(400); // Bad Request
                echo json_encode(["message" => "Username and password are required"]);
                break; // Exit switch
            }

            // Hash the password securely using PHP's built-in functions
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            // Check if username already exists using a prepared statement
            $checkSql = "SELECT id FROM users WHERE username = ? LIMIT 1";
            $checkStmt = $conn->prepare($checkSql);

            if ($checkStmt === false) {
                 http_response_code(500); // Internal Server Error
                 echo json_encode(["message" => "Database prepare error: " . $conn->error]);
                 $conn->close(); exit();
            }

            $checkStmt->bind_param("s", $username); // Bind username as string
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();

            if ($checkResult->num_rows > 0) {
                http_response_code(409); // Conflict
                echo json_encode(["message" => "Username already exists"]);
            } else {
                // Insert new user using a prepared statement
                $insertSql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
                $insertStmt = $conn->prepare($insertSql);

                 if ($insertStmt === false) {
                     http_response_code(500); // Internal Server Error
                     echo json_encode(["message" => "Database prepare error: " . $conn->error]);
                     $checkStmt->close(); $conn->close(); exit();
                 }

                $insertStmt->bind_param("ss", $username, $passwordHash); // Bind username and hashed password as strings

                if ($insertStmt->execute()) {
                    http_response_code(201); // Created
                    // Optional: Log the user in automatically after successful registration
                    // $_SESSION['user_id'] = $conn->insert_id;
                    // $_SESSION['username'] = $username;
                    echo json_encode(["message" => "User registered successfully", "userId" => $conn->insert_id]);
                } else {
                    http_response_code(500); // Internal Server Error
                    // Log $insertStmt->error in a real application
                    echo json_encode(["message" => "Error registering user: " . $conn->error]);
                }
                $insertStmt->close(); // Close the prepared statement
            }
            $checkStmt->close(); // Close the prepared statement
            break; // End register case

        case 'login':
            // --- User Login ---
            if (empty($username) || empty($password)) {
                http_response_code(400); // Bad Request
                echo json_encode(["message" => "Username and password are required"]);
                break; // Exit switch
            }

            // Select user and their password hash using a prepared statement
            $sql = "SELECT id, password_hash FROM users WHERE username = ? LIMIT 1";
            $stmt = $conn->prepare($sql);

            if ($stmt === false) {
                 http_response_code(500); // Internal Server Error
                 echo json_encode(["message" => "Database prepare error: " . $conn->error]);
                 $conn->close(); exit();
            }

            $stmt->bind_param("s", $username); // Bind username as string
            $stmt->execute();
            $result = $stmt->get_result(); // Get the result set


            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $passwordHash = $row['password_hash'];

                // Verify the provided password against the stored hash
                if (password_verify($password, $passwordHash)) {
                    // Password is correct, start/regenerate session and store user info
                    session_regenerate_id(true); // Regenerate session ID for security
                    $_SESSION['user_id'] = $row['id'];
                    $_SESSION['username'] = $username; // Store username in session

                    http_response_code(200); // OK
                    echo json_encode(["message" => "Login successful", "userId" => $row['id'], "username" => $username]);
                } else {
                    // Password incorrect
                    http_response_code(401); // Unauthorized
                    echo json_encode(["message" => "Invalid username or password"]);
                }
            } else {
                // Username not found
                http_response_code(401); // Unauthorized
                echo json_encode(["message" => "Invalid username or password"]);
            }
            $stmt->close(); // Close the prepared statement
            break; // End login case

        case 'logout':
            // --- User Logout ---
            // Clear all session variables
            session_unset();
            // Destroy the session
            session_destroy();
            // Also delete the session cookie
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }

            http_response_code(200); // OK
            echo json_encode(["message" => "Logout successful"]);
            break; // End logout case

        default:
            http_response_code(400); // Bad Request
            echo json_encode(["message" => "Invalid authentication action"]);
    }
} else {
     // Handle methods other than GET and POST
     http_response_code(405); // Method Not Allowed
     echo json_encode(["message" => "Method not allowed"]);
}

// Close the database connection at the end of the script
$conn->close();
?>