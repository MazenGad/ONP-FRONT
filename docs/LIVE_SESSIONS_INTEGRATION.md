# Live Review Sessions Feature - Integration Guide

## 🎯 Feature Overview
The Live Review Sessions feature allows students and instructors to manage Zoom-based review sessions for each course.

## 📁 Files Created/Modified

### New Files:
- `course-live-sessions.html` - Main live sessions page

### Modified Files:
- `course-details-enrolled.html` - Added "Live Review Sessions" button

## 🔗 Integration Points

### 1. Course Details Page Integration
- Added blue "Live Review Sessions" button next to "Message Instructor"
- Button redirects to: `course-live-sessions.html?courseId={courseId}`

### 2. API Endpoints Expected
The feature expects these backend endpoints:

```
GET /api/LiveSessions/course/{courseId}
- Returns array of sessions for the course

POST /api/LiveSessions/add
- Creates new session
- Body: { courseId, date, duration, zoomLink, notes }

PATCH /api/LiveSessions/{id}
- Updates existing session
- Body: { courseId, date, duration, zoomLink, notes }

DELETE /api/LiveSessions/{id}
- Deletes session
```

### 3. Authentication
- Uses `localStorage.token` for authorization
- Uses `localStorage.user` for role checking
- Requires "Instructor" role for create/edit/delete operations

## 🎨 UI Features

### For Students:
- View upcoming and past sessions
- Join Zoom meetings via "Join via Zoom" button
- Responsive card layout with session details

### For Instructors:
- All student features plus:
- "Add New Session" button
- Edit/Delete buttons on each session
- Modal form for session management

### Session Display:
- Date and time (formatted to local timezone)
- Duration in minutes
- Optional notes
- Zoom link (opens in new tab)
- Visual indicators for upcoming vs past sessions

## 🔧 Technical Details

### URL Structure:
- Access via: `course-live-sessions.html?courseId=123`
- Automatically loads course info and sessions

### Data Format:
```javascript
// Session object structure
{
  id: 1,
  courseId: 123,
  date: "2025-11-10T19:00:00Z",
  duration: 60,
  zoomLink: "https://zoom.us/j/123456789",
  notes: "Final exam review"
}
```

### Responsive Design:
- Mobile-friendly grid layout
- Collapsible session cards
- Touch-friendly buttons

## 🚀 How to Test

1. **Access Feature:**
   - Go to any enrolled course details page
   - Click "Live Review Sessions" button

2. **Student View:**
   - Should see list of sessions (if any exist)
   - Can click "Join via Zoom" for upcoming sessions

3. **Instructor View:**
   - Should see "Add New Session" button
   - Can create, edit, and delete sessions
   - Form validation for required fields

## 🔒 Security Notes

- Only enrolled students can access course sessions
- Only instructors can manage sessions
- All API calls include authentication headers
- Zoom links open in new tabs for security

## 📱 Browser Compatibility

- Modern browsers with ES6+ support
- Responsive design for mobile devices
- Uses Font Awesome icons (already included in project)

## 🎯 Future Enhancements

Potential improvements:
- Email notifications for new sessions
- Calendar integration (.ics files)
- Recording links for past sessions
- Attendance tracking
- Session reminders