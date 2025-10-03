const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// MongoDB imports
const connectDB = require("./config/database");
const User = require("./models/User");

const app = express();
const port = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: [
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// 🔑 Gemini AI Setup
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing in .env file");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// =========================
// Auth Middleware
// =========================
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers["authorization"];
        if (!token) {
            return res.status(403).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

// =========================
// Auth Routes
// =========================
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email or username" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            name,
            streak: 0,
            lastStudyDate: null,
            tasks: [],
            studySessions: []
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser._id, username: newUser.username },
            SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User created successfully",
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email,
                streak: newUser.streak
            }
        });

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email or username
        const user = await User.findOne({
            $or: [{ email }, { username: email }]
        });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, username: user.username },
            SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                streak: user.streak,
                tasks: user.tasks
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// =========================
// User Profile Routes
// =========================
app.get("/api/user/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                streak: user.streak,
                joinDate: user.createdAt,
                preferences: user.preferences,
                studyStats: user.studyStats
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

app.put("/api/user/profile", authMiddleware, async (req, res) => {
    try {
        const { name, preferences } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, preferences },
            { new: true }
        ).select('-password');

        res.json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// =========================
// Streak Routes
// =========================
app.post("/api/streak/update", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
        lastStudy?.setHours(0, 0, 0, 0);

        if (!lastStudy || lastStudy.getTime() !== today.getTime()) {
            if (lastStudy) {
                const diffDays = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
                user.streak = diffDays === 1 ? user.streak + 1 : 1;
            } else {
                user.streak = 1;
            }
            user.lastStudyDate = today;
        }

        await user.save();
        res.json({ streak: user.streak, lastStudyDate: user.lastStudyDate });
    } catch (error) {
        res.status(500).json({ error: "Failed to update streak" });
    }
});

app.get("/api/streak/get", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('streak lastStudyDate');
        res.json({ streak: user.streak, lastStudyDate: user.lastStudyDate });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch streak" });
    }
});

// =========================
// Task Routes
// =========================
app.post("/api/tasks/update", authMiddleware, async (req, res) => {
    try {
        const { tasks } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { tasks },
            { new: true }
        );

        res.json({ message: "Tasks updated successfully", tasks: user.tasks });
    } catch (error) {
        res.status(500).json({ error: "Failed to update tasks" });
    }
});

app.get("/api/tasks/get", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('tasks');
        res.json({ tasks: user.tasks });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// =========================
// Study Sessions Routes
// =========================
app.post("/api/study-sessions", authMiddleware, async (req, res) => {
    try {
        const { subject, duration, topics } = req.body;
        const user = await User.findById(req.user._id);

        user.studySessions.push({
            subject,
            duration,
            topics: topics || [],
            date: new Date()
        });

        // Update total study time
        user.studyStats.totalStudyTime += duration;

        await user.save();
        res.json({ message: "Study session saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save study session" });
    }
});

app.get("/api/study-sessions/recent", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('studySessions');
        const recentSessions = user.studySessions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        res.json({ sessions: recentSessions });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch study sessions" });
    }
});

// =========================
// AI Routes (Keep existing)
// =========================
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;
        const result = await model.generateContent(message);
        res.json({ reply: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/generate-quiz", async (req, res) => {
    try {
        const { topic } = req.body;
        const prompt = `Generate 5 medium-level UPSC quiz questions on ${topic}.`;
        const result = await model.generateContent(prompt);
        res.json({ quiz: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =========================
// Health Check
// =========================
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "OK", 
        service: "UPSC AI Buddy Backend",
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
});

// =========================
// Start Server
// =========================
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});
