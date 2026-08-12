# GradePad

An intelligent academic management system that tracks semesters, courses, and assignments with real-time GPA calculation, AI-powered syllabus parsing, and seamless cloud synchronization.


## Overview

GradePad is more than a grade calculator—it's a complete academic organizer that helps students manage their entire semester. From parsing course syllabi with AI to calculating weighted GPAs across multiple courses, GradePad streamlines academic tracking with both offline and cloud-based storage.

## ✨ Features

### Core Functionality
- **Multi-Semester Management**: Organize courses across multiple semesters with custom date ranges
- **Course Tracking**: Track course codes, topics, and unit weights
- **Assignment Management**: Add evaluations with names, due dates, grades, and weights
- **Real-Time Calculations**: Automatic final grade and GPA calculations as you type
- **Weighted GPA System**: Course units properly weight GPA calculations (e.g., 0.50 units vs 1.00 units)

### Advanced Features
- **AI-Powered Syllabus Parsing**: Automatically extract course information and assignments from pasted syllabi
- **Dual Storage System**: 
  - **Guests**: Data persists in browser localStorage
  - **Logged-in Users**: Cloud sync via Firebase Firestore across devices
- **Offline-First Architecture**: Full functionality without internet connection
- **Real-Time Synchronization**: Changes sync automatically across devices for logged-in users
- **Drag & Drop**: Reorder evaluation rows with intuitive drag-and-drop

## 🛠️ Tech Stack

### Frontend
- **JavaScript
- **HTML / CSS

### Backend & Services
- **Firebase Firestore**: Cloud database for user data synchronization
- **Firebase Authentication**: User authentication and session management
- **LocalStorage API**: Client-side data persistence for guest users

### AI Integration
- **LLM Integration**: AI-powered syllabus parsing and content extraction


### Storage Strategy
- **Guest Users**: All data stored in `localStorage` under `'gradepad_data'`
- **Authenticated Users**: Data stored in Firestore at `users/{userId}/gradepad`
- **Automatic Detection**: System automatically routes to appropriate storage based on auth state
- **First Sign-In**: Grades saved on the device as a guest are moved into the account when it has none of its own

### Security Rules
Firestore access is restricted to each user's own document. The rules live in
`firestore.rules` so they are reviewable alongside the code, and are published
with:

```bash
firebase deploy --only firestore:rules
```

Editing rules in the Firebase console instead will leave this file stale, so
change them here and deploy.

### Key Components
- **Real-Time Calculations**: Event-driven grade and GPA updates
- **Form Validation**: Input sanitization with cursor position preservation
- **State Management**: Efficient data flow and synchronization
- **Error Handling**: Comprehensive error handling for edge cases

## 📖 Usage

### Getting Started
1. **As a Guest**: Start using GradePad immediately—all data saves locally
2. **With Account**: Sign up to sync data across devices

### Adding Courses
1. Create a new semester or select an existing one
2. Add courses with code, topic, and unit weight
3. Set course units (0.25, 0.50, 0.75, 1.00, 1.50, 2.00) for proper GPA weighting

### Managing Assignments
1. Add evaluation rows with name, due date, grade, and weight
2. Grades and weights support decimal values
3. Final grade calculates automatically as you input data
4. Use drag-and-drop to reorder assignments

### Syllabus Parsing
1. Click the syllabus button on any course
2. Paste your course syllabus
3. AI automatically extracts course code, title, and assignments
4. Review and adjust parsed data as needed

### GPA Calculation
- **Course-level GPA**: Calculated from weighted assignments
- **Term GPA**: Weighted average across all courses based on unit values
- Updates in real-time as you modify grades or units

## 💡 Technical Highlights

### Advanced Input Handling
- Decimal support for grades and weights
- Cursor position preservation during input validation
- Real-time sanitization without disrupting user experience
