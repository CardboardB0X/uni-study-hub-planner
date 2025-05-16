<?php
// Database credentials
$dbHost = 'localhost'; // MySQL server is on localhost with XAMPP
$dbUsername = 'root'; // the dedicated user you created
$dbPassword = '';     // the password for the user (leave empty for root default)
$dbName = 'uni_study_db'; // use the exact database name you created

// Create database connection
$conn = new mysqli($dbHost, $dbUsername, $dbPassword, $dbName);


?>