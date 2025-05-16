<?php
// Database credentials
$dbHost = 'localhost'; // MySQL server is usually on localhost with XAMPP
$dbUsername = 'root'; // Or the dedicated user you created
$dbPassword = '';     // Or the password for the user (leave empty for root default)
$dbName = 'uni_study_db'; // <--- *** Use the exact database name you created ***

// Create database connection
$conn = new mysqli($dbHost, $dbUsername, $dbPassword, $dbName);

// ... rest of the code
?>