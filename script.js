document.addEventListener('DOMContentLoaded', () => {
    // --- Get references to HTML elements ---
    const authSection = document.getElementById('auth-section');
    const resourcesSection = document.getElementById('resources-section');
    const plannerSection = document.getElementById('planner-section');

    const showResourcesBtn = document.getElementById('show-resources-btn');
    const showPlannerBtn = document.getElementById('show-planner-btn');

    const welcomeMessage = document.getElementById('welcome-message');
    const showAuthBtn = document.getElementById('show-auth-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');

    const addResourceFormContainer = document.getElementById('add-resource-form-container');
    const addResourceForm = document.getElementById('add-resource-form');
    const addResourceMessage = document.getElementById('add-resource-message');
    const pinnedResourcesList = document.getElementById('pinned-resources-list');
    const viewedResourcesList = document.getElementById('viewed-resources-list');
    const availableResourcesList = document.getElementById('available-resources-list');
    const pinnedCountSpan = document.querySelector('#pinned-resources-container .list-count');
    const viewedCountSpan = document.querySelector('#viewed-resources-container .list-count');
    const availableCountSpan = document.querySelector('#available-resources-container .list-count');


    const addTaskForm = document.getElementById('add-task-form');
    const addTaskMessage = document.getElementById('add-task-message');
    const tasksList = document.getElementById('tasks-list');


    // --- API Base URL ---
    // IMPORTANT: Replace with the actual URL where your PHP files are hosted
    // Example: 'http://localhost/your-project-folder' or 'https://your-domain.com'
    const API_BASE_URL = 'http://localhost/uni-study-hub'; // <--- *** UPDATE THIS ***

    let currentUser = null; // Store logged-in user info (id, username, etc.)

    // --- Utility Functions ---

    // Function to show a message in a specific element
    function showMessage(element, message, type = 'info') {
        element.textContent = message;
        element.className = `message ${type}`; // Apply base 'message' and type class
    }

    // Function to clear a message
    function clearMessage(element) {
        element.textContent = '';
        element.className = 'message'; // Reset classes
    }

    // Function to format date for display
    function formatDate(dateString) {
        if (!dateString) return 'No due date';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // --- Authentication Functions ---

    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'GET',
                 headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.isLoggedIn) {
                currentUser = data; // Store user ID and username
                showAuthenticatedView();
                console.log("User is logged in:", currentUser.username);
                 // Fetch user-specific data after login status confirmed
                 fetchUserResourceStatuses(); // Fetch pinned/viewed status
                 fetchTasks(); // Fetch user's tasks
            } else {
                currentUser = null;
                showPublicView();
                console.log("User is not logged in.");
                 // Fetch resources publicly (Viewed/Pinned lists will remain empty)
                 fetchResources();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Assume not logged in on error and show public view
            currentUser = null;
            showPublicView();
             fetchResources(); // Attempt to load public resources anyway
        }
    }

    function showAuthenticatedView() {
        authSection.classList.add('hidden');
        showAuthBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
         addResourceFormContainer.classList.remove('hidden'); // Show add resource form

        // Ensure we are on a relevant section
        if (plannerSection.classList.contains('hidden') && resourcesSection.classList.contains('hidden')) {
             resourcesSection.classList.remove('hidden'); // Default to resources
             showResourcesBtn.classList.add('active');
             showPlannerBtn.classList.remove('active');
        }
    }

    function showPublicView() {
        authSection.classList.remove('hidden');
        showAuthBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        welcomeMessage.textContent = '';
         addResourceFormContainer.classList.add('hidden'); // Hide add resource form

        // Hide user-specific sections
        plannerSection.classList.add('hidden');

         // Default to resources view (which shows available resources publicly)
        resourcesSection.classList.remove('hidden');
        showResourcesBtn.classList.add('active');
        showPlannerBtn.classList.remove('active');

        // Clear user-specific lists/messages
        pinnedResourcesList.innerHTML = '<p>Log in to see your pinned resources.</p>';
        viewedResourcesList.innerHTML = '<p>Log in to see your viewed resources.</p>';
        tasksList.innerHTML = '<p>Please log in to access your study planner.</p>';
        pinnedCountSpan.textContent = '';
        viewedCountSpan.textContent = '';
    }

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(loginMessage); // Clear previous messages

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username, password })
            });
            const data = await response.json();

            if (response.ok) { // HTTP status 2xx
                showMessage(loginMessage, data.message, 'success');
                 loginForm.reset();
                 // Wait a moment then check status to update UI
                setTimeout(checkAuthStatus, 500);
            } else {
                showMessage(loginMessage, data.message || 'Login failed.', 'error');
            }
        } catch (error) {
            console.error('Error during login:', error);
            showMessage(loginMessage, 'An error occurred during login.', 'error');
        }
    });

    // Handle Register Form Submission
     registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(registerMessage); // Clear previous messages

        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register', username, password })
            });
            const data = await response.json();

            if (response.ok) { // HTTP status 2xx
                showMessage(registerMessage, data.message, 'success');
                 registerForm.reset();
                 // Optionally auto-login or prompt for login
                 // setTimeout(() => { /* show login form */ }, 1000);
            } else {
                showMessage(registerMessage, data.message || 'Registration failed.', 'error');
            }
        } catch (error) {
            console.error('Error during registration:', error);
             showMessage(registerMessage, 'An error occurred during registration.', 'error');
        }
     });

    // Handle Logout Button Click
    logoutBtn.addEventListener('click', async () => {
         try {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            const data = await response.json();

            if (response.ok) { // HTTP status 2xx
                 alert(data.message); // Simple feedback
                 // Check status to update UI back to public view
                 checkAuthStatus();
            } else {
                 alert(data.message || 'Logout failed.');
            }
        } catch (error) {
            console.error('Error during logout:', error);
             alert('An error occurred during logout.');
        }
    });

     // Handle Show Auth Button Click
     showAuthBtn.addEventListener('click', () => {
        resourcesSection.classList.add('hidden');
        plannerSection.classList.add('hidden');
        authSection.classList.remove('hidden');
         showResourcesBtn.classList.remove('active');
         showPlannerBtn.classList.remove('active');
     });


    // --- Navigation ---
    showResourcesBtn.addEventListener('click', () => {
        resourcesSection.classList.remove('hidden');
        plannerSection.classList.add('hidden');
        authSection.classList.add('hidden'); // Hide auth if navigating away
        showResourcesBtn.classList.add('active');
        showPlannerBtn.classList.remove('active');
         showAuthBtn.classList.remove('active'); // Ensure auth button isn't active

         // Re-fetch resources if needed (optional, could just show loaded data)
         // fetchResources();
         // if (currentUser) fetchUserResourceStatuses();
    });

    showPlannerBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Please log in to access your study planner.");
            showAuthBtn.click(); // Redirect to auth section
            return;
        }
        resourcesSection.classList.add('hidden');
        plannerSection.classList.remove('hidden');
        authSection.classList.add('hidden'); // Hide auth if navigating away
        showResourcesBtn.classList.remove('active');
        showPlannerBtn.classList.add('active');
         showAuthBtn.classList.remove('active'); // Ensure auth button isn't active

        fetchTasks(); // Fetch/refresh tasks when planner is viewed
    });


    // --- Resource Hub Logic ---

    let allResources = []; // Store all resources fetched
    let userPinnedResourceIds = []; // Store IDs of resources pinned by the user
    let userViewedResourceIds = []; // Store IDs of resources viewed by the user

    // Function to fetch all resources (public access)
    async function fetchResources() {
        const loadingIndicator = availableResourcesList.querySelector('.loading');
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        availableResourcesList.querySelector('p:not(.loading)')?.remove(); // Remove previous empty message

        try {
            const response = await fetch(`${API_BASE_URL}/api.php/resources`, {
                 method: 'GET',
                 headers: { 'Content-Type': 'application/json' }
             });
             if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
             }
            allResources = await response.json();

            // Resources fetched, now display them (categorized by user status if logged in)
            displayResources();

        } catch (error) {
            console.error('Error fetching resources:', error);
            availableResourcesList.innerHTML = '<p class="message error">Error loading resources.</p>';
             pinnedResourcesList.innerHTML = ''; // Clear other lists on error
             viewedResourcesList.innerHTML = '';
             pinnedCountSpan.textContent = '';
             viewedCountSpan.textContent = '';
             availableCountSpan.textContent = '';
        } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    // Function to fetch user-specific resource statuses (pinned/viewed) - Requires login
    async function fetchUserResourceStatuses() {
        if (!currentUser) {
             userPinnedResourceIds = [];
             userViewedResourceIds = [];
             displayResources(); // Redraw resources with no user status
             return;
         }

         // Show loading for user-specific lists
        pinnedResourcesList.innerHTML = '<p class="loading">Loading...</p>';
        viewedResourcesList.innerHTML = '<p class="loading">Loading...</p>';


        try {
            // Fetch Pinned Resource IDs
             const pinnedResponse = await fetch(`${API_BASE_URL}/api.php/users/${currentUser.userId}/pinned`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
             if (!pinnedResponse.ok && pinnedResponse.status !== 404) throw new Error(`HTTP error! status: ${pinnedResponse.status}`); // 404 is okay if no pinned
             const pinnedData = pinnedResponse.status !== 404 ? await pinnedResponse.json() : [];
             userPinnedResourceIds = pinnedData.map(item => item.resource_id); // Assuming backend returns [{resource_id: N}, ...]

            // Fetch Viewed Resource IDs
             const viewedResponse = await fetch(`${API_BASE_URL}/api.php/users/${currentUser.userId}/viewed`, {
                method: 'GET',
                 headers: { 'Content-Type': 'application/json' }
             });
            if (!viewedResponse.ok && viewedResponse.status !== 404) throw new Error(`HTTP error! status: ${viewedResponse.status}`); // 404 is okay if no viewed
            const viewedData = viewedResponse.status !== 404 ? await viewedResponse.json() : [];
            userViewedResourceIds = viewedData.map(item => item.resource_id); // Assuming backend returns [{resource_id: N}, ...]

            // Now that we have user statuses, display all resources categorized
            displayResources();

        } catch (error) {
            console.error('Error fetching user resource statuses:', error);
             pinnedResourcesList.innerHTML = '<p class="message error">Error loading pinned.</p>';
             viewedResourcesList.innerHTML = '<p class="message error">Error loading viewed.</p>';
             pinnedCountSpan.textContent = '';
             viewedCountSpan.textContent = '';
        }
    }


    // Function to display resources into the correct lists based on user status
    function displayResources() {
        const pinned = [];
        const viewed = [];
        const available = [];

        // Clear previous lists
        pinnedResourcesList.innerHTML = '';
        viewedResourcesList.innerHTML = '';
        availableResourcesList.innerHTML = '';

        allResources.forEach(resource => {
            const isPinned = currentUser ? userPinnedResourceIds.includes(resource.id) : false;
            const isViewed = currentUser ? userViewedResourceIds.includes(resource.id) : false;

            const resourceItem = document.createElement('div');
            resourceItem.classList.add('resource-item');
            if (isPinned) {
                resourceItem.classList.add('pinned');
            }

            resourceItem.innerHTML = `
                <div>
                    <h4>${resource.title}</h4>
                    <p>Category: ${resource.category || 'N/A'}</p>
                    <p>${resource.description || ''}</p>
                </div>
                <div class="resource-actions">
                    <a href="${resource.url}" target="_blank" class="secondary-btn">Go to Resource</a>
                    ${currentUser ? // Only show these buttons if logged in
                        `
                        ${!isViewed ? `<button class="mark-viewed-btn" data-resource-id="${resource.id}">Mark Viewed</button>` : ''}
                        <button class="pin-resource-btn" data-resource-id="${resource.id}">
                           ${isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        `
                        : '' // Empty string if not logged in
                    }
                </div>
            `;

            // Add event listeners for the buttons (only if logged in)
            if (currentUser) {
                 const pinBtn = resourceItem.querySelector('.pin-resource-btn');
                 if (pinBtn) {
                     pinBtn.addEventListener('click', isPinned ? handleUnpinResource : handlePinResource);
                 }
                 const viewedBtn = resourceItem.querySelector('.mark-viewed-btn');
                 if (viewedBtn) {
                     viewedBtn.addEventListener('click', handleMarkResourceViewed);
                 }
            }


            if (isPinned) {
                pinned.push(resource);
                 pinnedResourcesList.appendChild(resourceItem);
            } else if (isViewed) {
                 viewed.push(resource);
                 viewedResourcesList.appendChild(resourceItem);
            } else {
                 available.push(resource);
                 availableResourcesList.appendChild(resourceItem);
            }
        });

        // Display empty messages if lists are empty
        if (pinned.length === 0) pinnedResourcesList.innerHTML += '<p>No pinned resources.</p>';
        if (viewed.length === 0) viewedResourcesList.innerHTML += '<p>No viewed resources.</p>';
        if (available.length === 0) availableResourcesList.innerHTML += '<p>No available resources.</p>';

        // Update counts
        pinnedCountSpan.textContent = `(${pinned.length})`;
        viewedCountSpan.textContent = `(${viewed.length})`;
        availableCountSpan.textContent = `(${available.length})`;
    }

    // Handle Marking Resource as Viewed
    async function handleMarkResourceViewed(event) {
        const resourceId = parseInt(event.target.dataset.resourceId);
        if (!currentUser) return; // Should be guarded by UI, but double check

        try {
            const response = await fetch(`${API_BASE_URL}/api.php/users/${currentUser.userId}/viewed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resourceId })
            });

             if (response.ok) {
                // Add to viewed list and refresh display
                userViewedResourceIds.push(resourceId);
                displayResources();
                // Optional: Show a temporary success message
            } else {
                const data = await response.json();
                 console.error('Failed to mark viewed:', data.message);
                 alert('Could not mark resource as viewed.'); // Simple feedback
            }
        } catch (error) {
            console.error('Error marking resource viewed:', error);
            alert('An error occurred.');
        }
    }

    // Handle Pinning a Resource
    async function handlePinResource(event) {
        const resourceId = parseInt(event.target.dataset.resourceId);
         if (!currentUser) return;

         try {
             const response = await fetch(`${API_BASE_URL}/api.php/users/${currentUser.userId}/pinned`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resourceId })
            });

             if (response.ok) {
                // Add to pinned list and refresh display
                userPinnedResourceIds.push(resourceId);
                displayResources();
             } else {
                 const data = await response.json();
                 console.error('Failed to pin:', data.message);
                 alert('Could not pin resource.');
             }
         } catch (error) {
            console.error('Error pinning resource:', error);
            alert('An error occurred.');
        }
    }

    // Handle Unpinning a Resource
     async function handleUnpinResource(event) {
        const resourceId = parseInt(event.target.dataset.resourceId);
         if (!currentUser) return;

        try {
             const response = await fetch(`${API_BASE_URL}/api.php/users/${currentUser.userId}/pinned/${resourceId}`, {
                method: 'DELETE',
                 headers: { 'Content-Type': 'application/json' }
             });

             if (response.ok) {
                // Remove from pinned list and refresh display
                userPinnedResourceIds = userPinnedResourceIds.filter(id => id !== resourceId);
                displayResources();
             } else {
                 const data = await response.json();
                 console.error('Failed to unpin:', data.message);
                 alert('Could not unpin resource.');
             }
         } catch (error) {
            console.error('Error unpinning resource:', error);
            alert('An error occurred.');
        }
     }


    // Handle Adding a New Resource - Requires login (uncomment form in HTML to enable)
    if (addResourceForm) { // Check if the form element exists
        addResourceForm.addEventListener('submit', async (event) => {
            event.preventDefault();
             clearMessage(addResourceMessage);

            if (!currentUser) {
                 showMessage(addResourceMessage, "You must be logged in to add resources.", 'error');
                 return;
            }

            const newResource = {
                title: document.getElementById('resource-title').value,
                url: document.getElementById('resource-url').value,
                category: document.getElementById('resource-category').value,
                description: document.getElementById('resource-description').value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api.php/resources`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newResource)
                });
                const data = await response.json();

                if (response.ok) { // Check for HTTP status 2xx
                    showMessage(addResourceMessage, data.message, 'success');
                    addResourceForm.reset();
                    // Re-fetch all resources to include the new one and update lists
                    fetchResources();
                } else {
                    showMessage(addResourceMessage, data.message || 'Failed to add resource.', 'error');
                }
            } catch (error) {
                console.error('Error adding resource:', error);
                showMessage(addResourceMessage, 'An error occurred while adding the resource.', 'error');
            }
        });
    }


    // --- Study Planner Logic ---

    // Function to fetch and display user's tasks from the backend
    async function fetchTasks() {
         if (!currentUser) {
            tasksList.innerHTML = '<p>Please log in to see your study planner.</p>';
            return;
        }
        const loadingIndicator = tasksList.querySelector('.loading');
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
         tasksList.querySelector('p:not(.loading)')?.remove(); // Remove previous empty message

        try {
            const response = await fetch(`${API_BASE_URL}/api.php/tasks`, {
                 method: 'GET',
                 headers: { 'Content-Type': 'application/json' }
                 // Session cookie is automatically sent by the browser to the same domain
             });
             if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
             }
            const tasks = await response.json();

            tasksList.innerHTML = ''; // Clear current list

            if (!tasks || tasks.length === 0) {
                tasksList.innerHTML = '<p>No tasks added yet. Add one above!</p>';
                return;
            }

            tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.classList.add('task-item');
                 if (task.completed) {
                    taskItem.classList.add('completed');
                }

                // --- Time Bar Calculation ---
                let progressBarHtml = '';
                if (task.due_date) {
                    const creationDate = new Date(task.created_at); // Assumes backend provides created_at
                    const dueDate = new Date(task.due_date);
                    const currentDate = new Date();

                    const totalDuration = dueDate.getTime() - creationDate.getTime();
                    const elapsedTime = currentDate.getTime() - creationDate.getTime();

                    let progressPercentage = 0;
                    let timeBarClass = ''; // Class for color

                    if (totalDuration > 0) {
                        progressPercentage = (elapsedTime / totalDuration) * 100;
                        if (progressPercentage < 0) progressPercentage = 0; // Handle tasks due in the future relative to creation
                        if (progressPercentage > 100) progressPercentage = 100; // Cap at 100%

                        // Determine color class based on proximity to deadline
                        if (currentDate > dueDate) {
                             timeBarClass = 'progress-critical'; // Overdue
                             progressPercentage = 100; // Show full bar
                        } else if (progressPercentage > 75) {
                             timeBarClass = 'progress-warning'; // Getting close
                        } else if (progressPercentage > 95) {
                             timeBarClass = 'progress-critical'; // Very close
                        }
                    } else if (totalDuration <= 0 && currentDate > dueDate) {
                        // Task created on or after due date, and due date is in the past
                         timeBarClass = 'progress-critical'; // Overdue
                         progressPercentage = 100;
                    } else {
                         // Task created and due today or in the future, but total duration is 0 (same day)
                         progressPercentage = currentDate.getDate() === dueDate.getDate() && currentDate.getMonth() === dueDate.getMonth() && currentDate.getFullYear() === dueDate.getFullYear() ? (currentDate.getHours() / 24) * 100 : 0;
                         if (currentDate > dueDate) timeBarClass = 'progress-critical';
                    }

                    // Cap percentage for display if it went over 100% before color check
                     const displayPercentage = Math.min(progressPercentage, 100);


                    progressBarHtml = `
                        <div class="task-time-bar ${timeBarClass}">
                            <div class="progress" style="width: ${displayPercentage}%;"></div>
                        </div>
                    `;
                     // You could also add text here showing time left or %
                     // e.g., <span class="time-left">${Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))} days left</span>
                }
                // --- End Time Bar Calculation ---


                taskItem.innerHTML = `
                    <div>
                        <h4>${task.name}</h4>
                        <p>Due: ${formatDate(task.due_date)}</p>
                        <p>Course: ${task.course || 'N/A'}</p>
                        ${progressBarHtml} </div>
                    <div class="task-actions">
                         ${!task.completed ? `<button class="mark-complete-btn" data-task-id="${task.id}">Done</button>` : ''}
                         <button class="delete-task-btn" data-task-id="${task.id}">Delete</button>
                    </div>
                `;
                tasksList.appendChild(taskItem);
            });

            // Add event listeners to the new buttons AFTER they are added to the DOM
            tasksList.querySelectorAll('.mark-complete-btn').forEach(button => {
                button.addEventListener('click', handleMarkComplete);
            });
             tasksList.querySelectorAll('.delete-task-btn').forEach(button => {
                button.addEventListener('click', handleDeleteTask);
            });

        } catch (error) {
            console.error('Error fetching tasks:', error);
             tasksList.innerHTML = '<p class="message error">Error loading tasks.</p>';
        } finally {
             if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    // Handle adding a new task
     addTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(addTaskMessage);

         if (!currentUser) {
             showMessage(addTaskMessage, "You must be logged in to add tasks.", 'error');
             return;
         }

        const taskNameInput = document.getElementById('task-name');
        const taskDueDateInput = document.getElementById('task-due-date');
        const taskCourseInput = document.getElementById('task-course');


        const newTask = {
            name: taskNameInput.value,
            dueDate: taskDueDateInput.value || null, // Send empty date as null
            course: taskCourseInput.value
        };

        try {
             const response = await fetch(`${API_BASE_URL}/api.php/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
             const data = await response.json();

            if (response.ok) { // Check for HTTP status 2xx (e.g., 201 Created)
                showMessage(addTaskMessage, data.message, 'success');
                addTaskForm.reset();
                fetchTasks(); // Refresh the list
            } else {
                 showMessage(addTaskMessage, data.message || 'Failed to add task.', 'error');
             }

        } catch (error) {
            console.error('Error adding task:', error);
            showMessage(addTaskMessage, 'An error occurred while adding the task.', 'error');
        }
     });

    // Handle marking a task complete
    async function handleMarkComplete(event) {
        const button = event.target;
        const taskId = parseInt(button.dataset.taskId);

         if (!currentUser) {
             alert("You must be logged in to update tasks."); // Should be hidden by UI
             return;
         }

        // Optional: Disable button while processing
        button.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api.php/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true }) // Send the updated status
            });
             const data = await response.json();

             if (response.ok) { // Check for HTTP status 2xx
                // Success, no need for alert, refresh list updates UI
                fetchTasks();
            } else {
                alert(data.message || 'Failed to update task.');
            }
        } catch (error) {
            console.error('Error marking task complete:', error);
            alert('An error occurred while marking the task complete.');
        } finally {
            button.disabled = false; // Re-enable button
        }
    }

     // Handle deleting a task
    async function handleDeleteTask(event) {
        const button = event.target;
        const taskId = parseInt(button.dataset.taskId);

         if (!currentUser) {
             alert("You must be logged in to delete tasks."); // Should be hidden by UI
             return;
         }

        if (!confirm('Are you sure you want to delete this task?')) {
            return; // User cancelled
        }

         // Optional: Disable button while processing
        button.disabled = true;


        try {
             const response = await fetch(`${API_BASE_URL}/api.php/tasks/${taskId}`, {
                method: 'DELETE',
                 headers: { 'Content-Type': 'application/json' }
             });
             const data = await response.json();

             if (response.ok) { // Check for HTTP status 2xx
                 // Success, no need for alert, refresh list updates UI
                 fetchTasks();
             } else {
                  alert(data.message || 'Failed to delete task.');
             }

        } catch (error) {
            console.error('Error deleting task:', error);
            alert('An error occurred while deleting the task.');
        } finally {
             button.disabled = false; // Re-enable button
        }
     }


    // --- Initial Check and Load ---
    checkAuthStatus(); // Check login status when the page loads
    // fetchResources() is called within checkAuthStatus for both logged in and public views.
    // fetchTasks() is called within checkAuthStatus only if logged in.
});