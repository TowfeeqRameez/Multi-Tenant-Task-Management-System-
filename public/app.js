let currentMode = 'login';
let token = localStorage.getItem('token') || null;
let userProfile = JSON.parse(localStorage.getItem('user')) || null;
let tasks = [];
let socket = null;

// Init
window.onload = () => {
    if (token) {
        showDashboard();
        fetchTasks();
        initSocket();
    }
};

function switchAuth(mode) {
    currentMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
    document.getElementById('signup-fields').style.display = mode === 'signup' ? 'block' : 'none';
    document.getElementById('submit-btn').innerText = mode === 'login' ? 'Login' : 'Sign Up';
}

async function handleOAuth(provider) {
    // Brownie points implementation: Mock OAuth flow
    const mockOAuthUser = {
        email: `user@${provider.toLowerCase()}.com`,
        password: "oauth_mock_password",
        organizationName: `${provider} Inc`,
        roleName: "ADMIN"
    };

    alert(`Authenticating with ${provider}... (Mocked for demonstration). Creating an account via API...`);

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockOAuthUser)
        });
        const data = await res.json();
        if (res.ok) {
            handleLoginSuccess(data);
        } else {
            // If already exists, login instead
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: mockOAuthUser.email, password: mockOAuthUser.password })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) handleLoginSuccess(loginData);
            else alert(loginData.message || 'OAuth Fake Login Failed');
        }
    } catch (e) {
        alert('Network error handling OAuth');
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const payload = { email, password };

    if (currentMode === 'signup') {
        payload.organizationName = document.getElementById('orgName').value;
        payload.roleName = document.getElementById('roleName').value;
    }

    try {
        const res = await fetch(`/api/auth/${currentMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error occurred');

        handleLoginSuccess(data);
    } catch (err) {
        alert(err.message);
    }
}

function handleLoginSuccess(data) {
    token = data.token;
    userProfile = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userProfile));

    showDashboard();
    fetchTasks();
    initSocket();
}

function initSocket() {
    if (socket) return;
    socket = io();
    socket.emit('join_org', userProfile.organizationId);
    socket.on('task_changed', () => {
        // A teammate updated something! Fetch immediately!
        fetchTasks();
    });
}

function showDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'flex';

    document.getElementById('dash-org').innerText = userProfile.organizationId.substring(0, 8).toUpperCase() + " ORG";
    document.getElementById('dash-email').innerText = userProfile.email;
    document.getElementById('dash-role').innerText = userProfile.role;
}

function logout() {
    token = null;
    userProfile = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('dashboard-screen').style.display = 'none';
}

async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            if (res.status === 401) logout();
            return;
        }
        tasks = await res.json();
        renderTasks();
    } catch (e) {
        console.error('Failed to fetch tasks', e);
    }
}

function renderTasks() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';

    tasks.forEach(task => {
        const isOwner = task.creatorId === userProfile.id;
        const canManage = userProfile.role === 'ADMIN' || isOwner;

        container.innerHTML += `
      <div class="task-card">
        <div class="meta" style="margin-bottom: 8px;">
          <span class="badge ${task.status}">${task.status.replace('_', ' ')}</span>
        </div>
        <h4>${task.title}</h4>
        <p>${task.description || 'No description provided.'}</p>
        <div class="meta" style="margin-top: 10px;">
           <button class="btn-delete" style="background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.2);" onclick="showAudit('${task.id}')">View History</button>
           ${canManage ? `<button class="btn-delete" style="background: rgba(16, 185, 129, 0.1); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.2);" onclick="editTask('${task.id}')">Edit</button>` : ''}
           ${canManage ? `<button class="btn-delete" onclick="deleteTask('${task.id}')">Delete</button>` : '<span>(Read Only)</span>'}
        </div>
      </div>
    `;
    });
}

// Modal handling
let currentEditingId = null;

function openTaskModal() {
    currentEditingId = null;
    document.getElementById('task-modal').classList.add('active');
    document.getElementById('modal-title').innerText = 'Create Task';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-status').value = 'TODO';
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    currentEditingId = id;

    document.getElementById('task-modal').classList.add('active');
    document.getElementById('modal-title').innerText = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status;
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
}

async function saveTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const status = document.getElementById('task-status').value;

    try {
        const url = currentEditingId ? `/api/tasks/${currentEditingId}` : '/api/tasks';
        const method = currentEditingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description, status })
        });

        if (res.ok) {
            closeModal();
            fetchTasks();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (e) {
        alert("Error saving task");
    }
}

async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchTasks();
        else alert('Failed to delete or insufficient permissions');
    } catch (e) {
        console.error(e);
    }
}

async function showAudit(id) {
    try {
        const res = await fetch(`/api/tasks/${id}/audit-logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await res.json();

        document.getElementById('audit-timeline').innerHTML = '';
        logs.forEach(log => {
            const date = new Date(log.createdAt).toLocaleString();
            document.getElementById('audit-timeline').innerHTML += `
        <div class="container-timeline">
          <div class="content-timeline">
            <h5>Action: ${log.action}</h5>
            <span class="time">${date} by ${log.user.email} (${log.user.role})</span>
            ${log.details ? `<p>Updates: ${JSON.stringify(log.details)}</p>` : ''}
          </div>
        </div>
      `;
        });

        document.getElementById('audit-modal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
}

function closeAuditModal() {
    document.getElementById('audit-modal').classList.remove('active');
}
