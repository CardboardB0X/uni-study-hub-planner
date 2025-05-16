<?php
// Set headers for JSON response and CORS (Cross-Origin Resource Sharing)
header('Content-Type: application/json');
// Allow requests from your frontend domain during development.
// IMPORTANT: Replace * with your frontend URL in production (e.g., http://localhost:8000 or https://your-frontend.com)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Include the database connection file
require_once 'includes/db.php';

// Start a session to access logged-in user info
session_start();

// Get the logged-in user ID from the session
// This will be null if the user is not logged in
$loggedInUserId = $_SESSION['user_id'] ?? null;

// Get the request method (GET, POST, PUT, DELETE)
$request_method = $_SERVER['REQUEST_METHOD'];
// Get the requested URI (e.g., /api.php/resources, /api.php/tasks/123)
$request_uri = $_SERVER['REQUEST_URI'];

// --- Basic Routing ---
// We'll parse the URI to determine the resource type and ID (if any)

// Parse the path part of the URL
$path = parse_url($request_uri, PHP_URL_PATH);
// Split the path into segments
$uri_segments = explode('/', $path);

// Find the segment after the script name (api.php)
// This assumes your file structure is like /your-project-folder/api.php
// Adjust if your api.php is in a different path
$api_segment_index = array_search('api.php', $uri_segments);
$resource_type = null;
$id = null;

if ($api_segment_index !== false && isset($uri_segments[$api_segment_index + 1])) {
    $resource_type = $uri_segments[$api_segment_index + 1];

    // Check if there's an ID after the resource type
    if (isset($uri_segments[$api_segment_index + 2]) && is_numeric($uri_segments[$api_segment_index + 2])) {
        $id = (int) $uri_segments[$api_segment_index + 2];
    }
}

// Handle OPTIONS requests (preflight)
if ($request_method === 'OPTIONS') {
    http_response_code(200);
    exit(); // Stop script execution after handling OPTIONS
}


// --- Handle API Requests based on Resource Type ---

// Note: In a real app, you'd need robust input validation and more detailed error handling.
// This code uses prepared statements, which helps prevent SQL injection for bound parameters.

switch ($resource_type) {
    case 'resources':
        switch ($request_method) {
            case 'GET':
                // --- Get All Resources (Public Access) ---
                // You might add filtering/sorting based on query parameters later
                $sql = "SELECT id, title, url, category, description, user_id, created_at FROM resources ORDER BY created_at DESC";
                $result = $conn->query($sql); // Simple query without user input, prepared not strictly needed but good practice for consistency

                $resources = [];
                if ($result->num_rows > 0) {
                    while($row = $result->fetch_assoc()) {
                        $resources[] = $row;
                    }
                }
                http_response_code(200); // OK
                echo json_encode($resources);
                break;

            case 'POST':
                // --- Add New Resource (Requires Login) ---
                 if (!$loggedInUserId) {
                    http_response_code(401); // Unauthorized
                    echo json_encode(["message" => "Please log in to add a resource"]);
                    break;
                }
                $data = json_decode(file_get_contents("php://input"), true); // Get JSON body

                // Basic validation
                $title = $data['title'] ?? '';
                $url = $data['url'] ?? '';
                $category = $data['category'] ?? null;
                $description = $data['description'] ?? null;

                 if (empty($title) || empty($url)) {
                    http_response_code(400); // Bad Request
                    echo json_encode(["message" => "Title and URL are required"]);
                    break;
                }

                // Insert new resource using a prepared statement
                $sql = "INSERT INTO resources (title, url, category, description, user_id) VALUES (?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                // 'ssssi' -> bind parameters as string, string, string, string, integer
                $stmt->bind_param("ssssi", $title, $url, $category, $description, $loggedInUserId);

                if ($stmt->execute()) {
                    http_response_code(201); // Created
                    echo json_encode(["message" => "New resource added successfully", "id" => $conn->insert_id]);
                } else {
                    http_response_code(500); // Internal Server Error
                    // Log $stmt->error in a real application
                    echo json_encode(["message" => "Error adding resource: " . $conn->error]);
                }
                $stmt->close(); // Close the prepared statement
                break;

            // PUT/DELETE for resources would go here if you allow users to edit/delete their added resources
            // case 'PUT':
            //     // Handle update, require login and ownership check
            //     break;
            // case 'DELETE':
            //     // Handle deletion, require login and ownership check
            //     break;

            default:
                http_response_code(405); // Method Not Allowed
                echo json_encode(["message" => "Method not allowed for resources"]);
        }
        break;

    case 'tasks':
        // --- All Task Operations Require Login ---
         if (!$loggedInUserId) {
            http_response_code(401); // Unauthorized
            echo json_encode(["message" => "Please log in to manage tasks"]);
            break;
        }

        switch ($request_method) {
            case 'GET':
                // --- Get User's Tasks ---
                // Fetch tasks only for the logged-in user, ordered by due date then creation date
                $sql = "SELECT id, name, due_date, course, completed, created_at FROM tasks WHERE user_id = ? ORDER BY due_date IS NULL ASC, due_date ASC, created_at ASC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $loggedInUserId); // Bind user ID
                $stmt->execute();
                $result = $stmt->get_result();

                $tasks = [];
                if ($result->num_rows > 0) {
                    while($row = $result->fetch_assoc()) {
                         // Format date for JavaScript if needed, though JS can parse 'YYYY-MM-DD'
                         // $row['due_date'] = $row['due_date'] ? date('Y-m-d', strtotime($row['due_date'])) : null;
                        $tasks[] = $row;
                    }
                }
                http_response_code(200); // OK
                echo json_encode($tasks);
                $stmt->close();
                break;

            case 'POST':
                // --- Add New Task ---
                $data = json_decode(file_get_contents("php://input"), true); // Get JSON body

                // Basic validation
                $name = $data['name'] ?? '';
                $dueDate = $data['dueDate'] ?? null; // Expects 'YYYY-MM-DD' or null
                $course = $data['course'] ?? null;

                if (empty($name)) {
                    http_response_code(400); // Bad Request
                    echo json_encode(["message" => "Task name is required"]);
                    break;
                }

                // Insert new task using a prepared statement
                $sql = "INSERT INTO tasks (name, due_date, course, user_id) VALUES (?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                // 'sssi' -> bind name(string), dueDate(string or null), course(string or null), userId(integer)
                $stmt->bind_param("sssi", $name, $dueDate, $course, $loggedInUserId);

                 if ($stmt->execute()) {
                    http_response_code(201); // Created
                    echo json_encode(["message" => "New task added successfully", "id" => $conn->insert_id]);
                } else {
                    http_response_code(500); // Internal Server Error
                    // Log $stmt->error in a real application
                     echo json_encode(["message" => "Error adding task: " . $conn->error]);
                 }
                $stmt->close();
                break;

            case 'PUT':
            case 'PATCH': // Handle both PUT and PATCH for updates
                // --- Update Task ---
                if (!$id) {
                    http_response_code(400); // Bad Request
                    echo json_encode(["message" => "Task ID not provided"]);
                    break;
                }
                $data = json_decode(file_get_contents("php://input"), true); // Get JSON body

                // Build the SET clause and parameters dynamically based on input
                $setClauses = [];
                $bindTypes = '';
                $bindParams = [];

                if (isset($data['name'])) {
                    $setClauses[] = "name = ?";
                    $bindTypes .= "s";
                    $bindParams[] = $data['name'];
                }
                 if (isset($data['due_date'])) {
                    $setClauses[] = "due_date = ?";
                    $bindTypes .= "s";
                    $bindParams[] = $data['due_date'] ?: null; // Handle empty string or null date
                }
                 if (isset($data['course'])) {
                    $setClauses[] = "course = ?";
                    $bindTypes .= "s";
                    $bindParams[] = $data['course'];
                }
                if (isset($data['completed'])) {
                    $setClauses[] = "completed = ?";
                    $bindTypes .= "i"; // Boolean as integer (0 or 1)
                    $bindParams[] = $data['completed'] ? 1 : 0;
                }

                if (empty($setClauses)) {
                     http_response_code(400); // Bad Request
                     echo json_encode(["message" => "No valid fields provided for update"]);
                    break;
                }

                // Add ID and user_id to the WHERE clause parameters
                $sql = "UPDATE tasks SET " . implode(", ", $setClauses) . " WHERE id = ? AND user_id = ?";
                $stmt = $conn->prepare($sql);

                // Add the id and user_id bind types and values
                $bindTypes .= "ii";
                $bindParams[] = $id;
                $bindParams[] = $loggedInUserId;

                // Bind parameters dynamically using call_user_func_array or ... (splat operator requires PHP 5.6+)
                // For older PHP: call_user_func_array([$stmt, 'bind_param'], array_merge([$bindTypes], $bindParams));
                $stmt->bind_param($bindTypes, ...$bindParams);


                 if ($stmt->execute()) {
                     if ($stmt->affected_rows > 0) {
                         http_response_code(200); // OK
                         echo json_encode(["message" => "Task updated successfully"]);
                     } else {
                         // Affected rows is 0. Could be no change, or task not found for user.
                          // Check if the task exists but belongs to a different user
                          $checkSql = "SELECT id FROM tasks WHERE id = ? LIMIT 1";
                          $checkStmt = $conn->prepare($checkSql);
                          $checkStmt->bind_param("i", $id);
                          $checkStmt->execute();
                          $checkResult = $checkStmt->get_result();

                          if ($checkResult->num_rows > 0) {
                                // Task exists, but WHERE user_id didn't match
                                http_response_code(403); // Forbidden
                                echo json_encode(["message" => "Task does not belong to the logged-in user"]);
                          } else {
                                // Task ID not found at all
                                http_response_code(404); // Not Found
                                echo json_encode(["message" => "Task not found"]);
                          }
                          $checkStmt->close();
                     }
                 } else {
                    http_response_code(500); // Internal Server Error
                    // Log $stmt->error in a real application
                     echo json_encode(["message" => "Error updating task: " . $conn->error]);
                 }
                 $stmt->close();
                break;


            case 'DELETE':
                // --- Delete Task ---
                if (!$id) {
                    http_response_code(400); // Bad Request
                    echo json_encode(["message" => "Task ID not provided"]);
                    break;
                }

                 // Delete task using a prepared statement, ensuring it belongs to the logged-in user
                 $sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
                 $stmt = $conn->prepare($sql);
                 $stmt->bind_param("ii", $id, $loggedInUserId); // Bind task ID and user ID

                 if ($stmt->execute()) {
                     if ($stmt->affected_rows > 0) {
                         http_response_code(200); // OK
                         echo json_encode(["message" => "Task deleted successfully"]);
                     } else {
                          // Check if the task exists but belongs to a different user
                          $checkSql = "SELECT id FROM tasks WHERE id = ? LIMIT 1";
                          $checkStmt = $conn->prepare($checkSql);
                          $checkStmt->bind_param("i", $id);
                          $checkStmt->execute();
                          $checkResult = $checkStmt->get_result();

                          if ($checkResult->num_rows > 0) {
                                http_response_code(403); // Forbidden
                                echo json_encode(["message" => "Task does not belong to the logged-in user"]);
                          } else {
                                http_response_code(404); // Not Found
                                echo json_encode(["message" => "Task not found"]);
                          }
                          $checkStmt->close();
                     }
                 } else {
                    http_response_code(500); // Internal Server Error
                    // Log $stmt->error in a real application
                     echo json_encode(["message" => "Error deleting task: " . $conn->error]);
                 }
                 $stmt->close();
                break;


            default:
                http_response_code(405); // Method Not Allowed
                echo json_encode(["message" => "Method not allowed for tasks"]);
        }
        break;

    // --- New Endpoints for User Resource Statuses (Viewed/Pinned) ---
    // These require database tables like user_viewed_resources and user_pinned_resources
    // with columns like user_id INT, resource_id INT, PRIMARY KEY (user_id, resource_id)

    case 'users':
         // Expecting URLs like /api.php/users/1/viewed or /api.php/users/1/pinned/5
         if (!$id) { // Here, the ID is the user ID from the URL segment
             http_response_code(400); // Bad Request
             echo json_encode(["message" => "User ID not provided in URL"]);
             break;
         }
         // IMPORTANT SECURITY CHECK: Ensure the $id from the URL matches the $loggedInUserId
         // A user should only be able to view/modify THEIR OWN viewed/pinned status
         if ((int)$id !== $loggedInUserId) {
              http_response_code(403); // Forbidden
              echo json_encode(["message" => "Access denied. You can only access your own data."]);
              break;
         }

         // Get the sub-resource (e.g., 'viewed', 'pinned')
         $sub_resource = $uri_segments[count($uri_segments) - 1]; // e.g., 'viewed' or 'pinned' if no resource ID after it

         $resource_id = null;
         // Check if there's a resource ID after the sub-resource (e.g., /users/1/pinned/5)
         if (is_numeric($sub_resource)) {
             $resource_id = (int) $sub_resource;
             $sub_resource = $uri_segments[count($uri_segments) - 2] ?? ''; // e.g., 'pinned'
         }


         switch ($sub_resource) {
             case 'viewed':
                 switch ($request_method) {
                     case 'GET':
                         // --- Get Viewed Resource IDs for User ---
                         // Assumes a table named user_viewed_resources with columns user_id, resource_id
                         $sql = "SELECT resource_id FROM user_viewed_resources WHERE user_id = ?";
                         $stmt = $conn->prepare($sql);
                         $stmt->bind_param("i", $loggedInUserId);
                         $stmt->execute();
                         $result = $stmt->get_result();

                         $viewedResourceIds = [];
                         if ($result->num_rows > 0) {
                             while($row = $result->fetch_assoc()) {
                                 $viewedResourceIds[] = $row; // Or just $row['resource_id'] if you only need IDs
                             }
                         }
                         http_response_code(200);
                         echo json_encode($viewedResourceIds);
                         $stmt->close();
                         break;

                     case 'POST':
                         // --- Mark Resource as Viewed for User ---
                         $data = json_decode(file_get_contents("php://input"), true);
                         $resource_id_to_mark = $data['resource_id'] ?? null;

                         if (!$resource_id_to_mark) {
                              http_response_code(400);
                              echo json_encode(["message" => "Resource ID is required"]);
                              break;
                         }

                         // Prevent duplicates and insert using prepared statement
                         $sql = "INSERT IGNORE INTO user_viewed_resources (user_id, resource_id) VALUES (?, ?)";
                         $stmt = $conn->prepare($sql);
                         $stmt->bind_param("ii", $loggedInUserId, $resource_id_to_mark);

                         if ($stmt->execute()) {
                              if ($stmt->affected_rows > 0) {
                                  http_response_code(200); // OK
                                  echo json_encode(["message" => "Resource marked as viewed"]);
                              } else {
                                   http_response_code(200); // OK, but it was already viewed
                                   echo json_encode(["message" => "Resource was already marked as viewed"]);
                              }
                         } else {
                             http_response_code(500);
                             // Log $stmt->error
                             echo json_encode(["message" => "Error marking resource as viewed: " . $conn->error]);
                         }
                         $stmt->close();
                         break;

                      case 'OPTIONS':
                         http_response_code(200);
                         break;

                     default:
                          http_response_code(405); // Method Not Allowed
                          echo json_encode(["message" => "Method not allowed for viewed resources"]);
                 }
                 break;

             case 'pinned':
                  switch ($request_method) {
                     case 'GET':
                         // --- Get Pinned Resource IDs for User ---
                         // Assumes a table named user_pinned_resources with columns user_id, resource_id
                         $sql = "SELECT resource_id FROM user_pinned_resources WHERE user_id = ?";
                         $stmt = $conn->prepare($sql);
                         $stmt->bind_param("i", $loggedInUserId);
                         $stmt->execute();
                         $result = $stmt->get_result();

                         $pinnedResourceIds = [];
                         if ($result->num_rows > 0) {
                             while($row = $result->fetch_assoc()) {
                                 $pinnedResourceIds[] = $row; // Or just $row['resource_id']
                             }
                         }
                         http_response_code(200);
                         echo json_encode($pinnedResourceIds);
                         $stmt->close();
                         break;

                     case 'POST':
                         // --- Pin Resource for User ---
                         $data = json_decode(file_get_contents("php://input"), true);
                         $resource_id_to_pin = $data['resource_id'] ?? null;

                         if (!$resource_id_to_pin) {
                              http_response_code(400);
                              echo json_encode(["message" => "Resource ID is required"]);
                              break;
                         }

                         // Prevent duplicates and insert using prepared statement
                         $sql = "INSERT IGNORE INTO user_pinned_resources (user_id, resource_id) VALUES (?, ?)";
                         $stmt = $conn->prepare($sql);
                         $stmt->bind_param("ii", $loggedInUserId, $resource_id_to_pin);

                         if ($stmt->execute()) {
                             if ($stmt->affected_rows > 0) {
                                 http_response_code(200); // OK
                                 echo json_encode(["message" => "Resource pinned successfully"]);
                             } else {
                                 http_response_code(200); // OK, but it was already pinned
                                 echo json_encode(["message" => "Resource was already pinned"]);
                             }
                         } else {
                             http_response_code(500);
                              // Log $stmt->error
                             echo json_encode(["message" => "Error pinning resource: " . $conn->error]);
                         }
                         $stmt->close();
                         break;

                    case 'DELETE':
                        // --- Unpin Resource for User ---
                         if (!$resource_id) { // Here, resource_id is from the URL segment like /pinned/5
                              http_response_code(400);
                              echo json_encode(["message" => "Resource ID is required in URL"]);
                              break;
                         }

                         // Delete using prepared statement, ensuring user owns the pin
                         $sql = "DELETE FROM user_pinned_resources WHERE user_id = ? AND resource_id = ?";
                         $stmt = $conn->prepare($sql);
                         $stmt->bind_param("ii", $loggedInUserId, $resource_id);

                         if ($stmt->execute()) {
                             if ($stmt->affected_rows > 0) {
                                http_response_code(200); // OK
                                echo json_encode(["message" => "Resource unpinned successfully"]);
                             } else {
                                 // Check if the pin exists but belongs to a different user (less likely with this query)
                                 // Or if the resource_id didn't exist
                                  http_response_code(404); // Not Found
                                  echo json_encode(["message" => "Resource pin not found or does not belong to user"]);
                             }
                         } else {
                             http_response_code(500);
                              // Log $stmt->error
                             echo json_encode(["message" => "Error unpinning resource: " . $conn->error]);
                         }
                         $stmt->close();
                         break;

                     case 'OPTIONS':
                         http_response_code(200);
                         break;

                     default:
                          http_response_code(405); // Method Not Allowed
                          echo json_encode(["message" => "Method not allowed for pinned resources"]);
                 }
                 break;


             default:
                 http_response_code(404); // Not Found
                 echo json_encode(["message" => "User sub-resource not found"]);
         }
        break; // End users case


    default:
        http_response_code(404); // Not Found
        echo json_encode(["message" => "API resource not found"]);
}

// Close the database connection
$conn->close();
?>