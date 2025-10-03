const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    subject: {
        type: String,
        default: 'General'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const studySessionSchema = new mongoose.Schema({
    subject: String,
    duration: { // in minutes
        type: Number,
        default: 0
    },
    topics: [String],
    date: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // This creates an index automatically
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // This creates an index automatically
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    streak: {
        type: Number,
        default: 0
    },
    lastStudyDate: {
        type: Date,
        default: null
    },
    tasks: [taskSchema],
    studySessions: [studySessionSchema],
    preferences: {
        dailyGoal: {
            type: Number, // hours
            default: 8
        },
        preferredSubjects: [String],
        reminderTime: {
            type: String,
            default: "20:00"
        }
    },
    studyStats: {
        totalStudyTime: {
            type: Number, // minutes
            default: 0
        },
        quizzesTaken: {
            type: Number,
            default: 0
        },
        answersEvaluated: {
            type: Number,
            default: 0
        },
        subjectsMastered: [String]
    }
}, {
    timestamps: true
});

// REMOVE these duplicate index lines - they're already created by 'unique: true'
// userSchema.index({ email: 1 });
// userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);