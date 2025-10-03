class UPSCAIBuddy {
    constructor() {
        this.chatHistory = [];
        this.currentContext = 'general';
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.API_BASE = 'https://upsc-ai-buddy.onrender.com';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadChatHistory();
        
        // Check if user is logged in
        if (this.token) {
            await this.checkAuth();
        } else {
            this.showGuestView();
        }
    }

    setupEventListeners() {
        // Enter key for chat input
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // Context buttons
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setContext(btn.dataset.context, btn);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
    }

    async checkAuth() {
        try {
            const response = await fetch(`${this.API_BASE}/user/profile`, {
                headers: {
                    'Authorization': this.token
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showAuthenticatedView();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    showGuestView() {
        const userName = document.getElementById('user-name');
        const authBtns = document.querySelectorAll('.auth-btn');
        
        if (userName) userName.textContent = 'Guest';
        
        authBtns.forEach(btn => {
            btn.style.display = 'inline-block';
        });
        
        // Remove logout button if exists
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }

    showAuthenticatedView() {
        const userName = document.getElementById('user-name');
        const authBtns = document.querySelectorAll('.auth-btn');
        
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name || this.currentUser.username;
        }
        
        // Hide login/signup buttons
        authBtns.forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Create logout button
        const userInfo = document.querySelector('.user-info');
        let logoutBtn = document.querySelector('.logout-btn');
        
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.textContent = 'Logout';
            logoutBtn.className = 'auth-btn logout-btn';
            logoutBtn.onclick = () => this.logout();
            userInfo.appendChild(logoutBtn);
        }
        
        this.showProfileSection();
        this.loadUserData();
    }

    async loginUser() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.closeModal('login-modal');
                await this.checkAuth();
                this.showNotification('Login successful!', 'success');
                
                // Clear login form
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    async signupUser() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        if (!name || !email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, username: email })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showNotification('Signup successful! Please login.', 'success');
                this.closeModal('signup-modal');
                this.openModal('login-modal');
                
                // Clear signup form
                document.getElementById('signup-name').value = '';
                document.getElementById('signup-email').value = '';
                document.getElementById('signup-password').value = '';
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Signup failed. Please try again.', 'error');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.showGuestView();
        this.showNotification('Logged out successfully', 'success');
    }

    showProfileSection() {
        // This will be implemented when we add profile features
        console.log('Profile section would show here');
    }

    async loadUserData() {
        if (!this.token) return;

        try {
            // Load streak
            const streakResponse = await fetch(`${this.API_BASE}/streak/get`, {
                headers: { 'Authorization': this.token }
            });
            if (streakResponse.ok) {
                const streakData = await streakResponse.json();
                const streakCount = document.getElementById('streak-count');
                if (streakCount) streakCount.textContent = streakData.streak;
            }

            // Load tasks
            const tasksResponse = await fetch(`${this.API_BASE}/tasks/get`, {
                headers: { 'Authorization': this.token }
            });
            if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json();
                this.renderTasks(tasksData.tasks);
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    renderTasks(tasks = []) {
        const taskList = document.getElementById('task-list');
        if (!taskList) return;
        
        taskList.innerHTML = '';
        
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="window.upscBuddy.updateTask(${index}, this.checked)">
                <span class="${task.completed ? 'completed' : ''}">${task.text}</span>
            `;
            taskList.appendChild(li);
        });
        
        this.updateProgress();
    }

    async updateTask(index, completed) {
        if (!this.token) return;

        try {
            const tasksResponse = await fetch(`${this.API_BASE}/tasks/get`, {
                headers: { 'Authorization': this.token }
            });
            
            if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json();
                const tasks = tasksData.tasks || [];
                tasks[index].completed = completed;
                
                await fetch(`${this.API_BASE}/tasks/update`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tasks })
                });
                
                this.updateProgress();
                await this.updateStreak();
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    }

    async addTask() {
        const taskInput = document.getElementById('new-task');
        const text = taskInput?.value.trim();
        if (!text) {
            this.showNotification('Please enter a task', 'error');
            return;
        }

        if (!this.token) {
            this.showNotification('Please login to add tasks', 'error');
            return;
        }

        try {
            const tasksResponse = await fetch(`${this.API_BASE}/tasks/get`, {
                headers: { 'Authorization': this.token }
            });
            
            if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json();
                const tasks = tasksData.tasks || [];
                tasks.push({ text, completed: false });
                
                await fetch(`${this.API_BASE}/tasks/update`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tasks })
                });
                
                taskInput.value = '';
                this.renderTasks(tasks);
                this.showNotification('Task added successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to add task:', error);
            this.showNotification('Failed to add task', 'error');
        }
    }

    async updateStreak() {
        if (!this.token) return;

        try {
            await fetch(`${this.API_BASE}/streak/update`, {
                method: 'POST',
                headers: { 'Authorization': this.token }
            });
            
            await this.loadUserData();
        } catch (error) {
            console.error('Failed to update streak:', error);
        }
    }

    updateProgress() {
        const totalTasks = document.querySelectorAll('#task-list input[type="checkbox"]').length;
        const completedTasks = document.querySelectorAll('#task-list input[type="checkbox"]:checked').length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // Update progress bars
        const gsProgress = document.getElementById('gs-progress');
        const gsProgressValue = document.getElementById('gs-progress-value');
        
        if (gsProgress) gsProgress.style.width = `${progress}%`;
        if (gsProgressValue) gsProgressValue.textContent = `${Math.round(progress)}%`;
    }

    // Chat functionality
    setContext(context, button) {
        this.currentContext = context;
        
        // Update UI
        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show context-specific message
        this.addAIMessage(this.getContextMessage(context));
    }

    getContextMessage(context) {
        const messages = {
            'general': "I'm ready to help with general UPSC preparation questions. What would you like to know?",
            'answer-eval': "Answer Evaluation mode activated. Paste your answer and I'll evaluate it based on UPSC standards.",
            'quiz': "Quiz Generator mode. Tell me a subject/topic and I'll create practice questions for you."
        };
        return messages[context] || messages.general;
    }

    async sendMessage() {
        const userInput = document.getElementById('user-input');
        const message = userInput?.value.trim();
        
        if (!message) {
            this.showNotification('Please enter a message', 'error');
            return;
        }

        // Add user message to chat
        this.addUserMessage(message);
        userInput.value = '';

        // Show loading
        this.showLoading();

        try {
            const response = await this.callGeminiAPI(message, this.currentContext);
            this.addAIMessage(response);
        } catch (error) {
            console.error('Error:', error);
            this.addAIMessage("I'm having trouble connecting right now. Please try again later.");
        }

        this.hideLoading();
    }

    async callGeminiAPI(userMessage, context) {
        try {
            const response = await fetch(`${this.API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    context: context
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Save chat history
            this.chatHistory.push({ role: 'user', content: userMessage });
            this.chatHistory.push({ role: 'assistant', content: data.reply });
            this.saveChatHistory();

            return data.reply;
        } catch (error) {
            console.error('API Call failed:', error);
            return this.getFallbackResponse(userMessage, context);
        }
    }

    getFallbackResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        if (context === 'answer-eval') {
            return "Based on UPSC standards, your answer shows good conceptual understanding. To improve: structure your answer with introduction, body, and conclusion. Add relevant examples and current affairs connections.";
        }
        
        if (context === 'quiz') {
            return "Here's a sample quiz question:\n\nQ: Which article of the Indian Constitution deals with the establishment of the Election Commission?\nA) Article 324\nB) Article 352\nC) Article 368\nD) Article 123\n\nCorrect Answer: A) Article 324";
        }
        
        if (lowerMessage.includes('constitution')) {
            return "The Indian Constitution is the supreme law of India. Key features:\n• Lengthiest written constitution\n• Federal system with unitary features\n• Fundamental Rights (Part III)\n• Directive Principles of State Policy (Part IV)\n• Parliamentary system of government";
        }
        
        if (lowerMessage.includes('history')) {
            return "Modern Indian History covers:\n• British colonial rule and administration\n• Indian National Movement (1885-1947)\n• Social reforms and cultural changes\n• Post-independence consolidation";
        }

        return "I can help you with UPSC preparation topics including Polity, History, Geography, Economics, and Current Affairs. What specific topic would you like to learn about?";
    }

    addUserMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `<div class="message-content"><strong>You:</strong> ${this.escapeHtml(message)}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addAIMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = `<div class="message-content"><strong>AI Buddy:</strong> ${this.formatMessage(message)}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessage(message) {
        return this.escapeHtml(message)
            .replace(/\n/g, '<br>')
            .replace(/\d+\.\s/g, '<br>$&')
            .replace(/•/g, '<br>•');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-message';
        loadingDiv.className = 'message ai-message';
        loadingDiv.innerHTML = '<div class="message-content"><em>⏳ AI Buddy is thinking...</em></div>';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) loadingDiv.remove();
    }

    // Modal functions
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create simple alert for now
        alert(`${type.toUpperCase()}: ${message}`);
    }

    saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            this.chatHistory = JSON.parse(saved);
        }
    }
}

// Global functions for HTML onclick attributes
function openModal(modalId) {
    if (window.upscBuddy) {
        window.upscBuddy.openModal(modalId);
    }
}

function closeModal(modalId) {
    if (window.upscBuddy) {
        window.upscBuddy.closeModal(modalId);
    }
}

function sendMessage() {
    if (window.upscBuddy) {
        window.upscBuddy.sendMessage();
    }
}

function insertSuggestion(text) {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = text;
        userInput.focus();
    }
}

function addTask() {
    if (window.upscBuddy) {
        window.upscBuddy.addTask();
    }
}

function loginUser() {
    if (window.upscBuddy) {
        window.upscBuddy.loginUser();
    }
}

function signupUser() {
    if (window.upscBuddy) {
        window.upscBuddy.signupUser();
    }
}

function openAnswerEvaluator() {
    if (window.upscBuddy) {
        const answer = prompt("Paste your answer for evaluation:");
        if (answer) {
            window.upscBuddy.addUserMessage(`Please evaluate this answer: ${answer}`);
            window.upscBuddy.showLoading();
            setTimeout(() => {
                window.upscBuddy.addAIMessage("📘 Answer Evaluation:\n\n• Content: Good understanding of concepts\n• Structure: Needs better organization with clear introduction and conclusion\n• Suggestions: Add more current affairs examples and data points\n• Score: 6/10 - Good foundation, needs refinement");
                window.upscBuddy.hideLoading();
            }, 1500);
        }
    }
}

function generateStudyPlan() {
    if (window.upscBuddy) {
        const subject = prompt("Which subject do you want a study plan for? (e.g., History, Polity, All Subjects)");
        if (subject) {
            window.upscBuddy.addUserMessage(`Create study plan for ${subject}`);
            window.upscBuddy.showLoading();
            setTimeout(() => {
                window.upscBuddy.addAIMessage(`📅 Study Plan for ${subject}:\n\nWeek 1-2: Basic Concepts & NCERT\nWeek 3-4: Standard Reference Books\nWeek 5: Revision & Mind Maps\nWeek 6: Answer Writing Practice\nWeek 7: Mock Tests & Previous Papers\nWeek 8: Final Revision & Current Affairs Integration\n\nDaily Routine: 8 hours (2h GS, 2h Optional, 2h Current Affairs, 2h Writing Practice)`);
                window.upscBuddy.hideLoading();
            }, 1500);
        }
    }
}

function generateQuizWithAI() {
    if (window.upscBuddy) {
        const topic = document.getElementById('quiz-topic')?.value || 'polity';
        const difficulty = document.getElementById('quiz-difficulty')?.value || 'medium';
        
        window.upscBuddy.addUserMessage(`Generate ${difficulty} quiz on ${topic}`);
        window.upscBuddy.showLoading();
        
        setTimeout(() => {
            window.upscBuddy.addAIMessage(`🎯 ${difficulty.toUpperCase()} QUIZ ON ${topic.toUpperCase()}:\n\n1. Which of the following is NOT a feature of Indian Federalism?\nA) Written Constitution\nB) Independent Judiciary\nC) Dual Citizenship\nD) Division of Powers\n\nCorrect Answer: C) Dual Citizenship\n\n2. The concept of 'Basic Structure' of Constitution was established in:\nA) Golaknath Case\nB) Kesavananda Bharati Case\nC) Minerva Mills Case\nD) Maneka Gandhi Case\n\nCorrect Answer: B) Kesavananda Bharati Case`);
            window.upscBuddy.hideLoading();
            closeModal('quiz-modal');
        }, 2000);
    }
}

// Placeholder functions for material cards
function openSyllabusTracker() {
    alert('Syllabus Tracker feature coming soon!');
}

function openPreviousPapers() {
    alert('Previous Year Questions feature coming soon!');
}

function openNotes() {
    alert('Smart Notes feature coming soon!');
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.upscBuddy = new UPSCAIBuddy();
});

// Close modal when clicking outside
window.onclick = (event) => {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }
};
