# User Journey: Social Media Login Flow

## Overview

Testing the complete social media authentication and profile setup flow.

## User Journey Steps

### 1. Landing Page

- **Action**: User visits the homepage
- **Expected**: Landing page loads with login options
- **API Calls**: None

### 2. Social Login

- **Action**: Click "Login with Google" button
- **Expected**: Redirect to Google OAuth
- **API Calls**: `GET /auth/google`

### 3. OAuth Callback

- **Action**: User authorizes the application
- **Expected**: Redirect back to app with auth code
- **API Calls**: `POST /auth/google/callback`

### 4. Profile Setup

- **Action**: User completes profile information
- **Input**:
  - Full name: "Jane Smith"
  - Bio: "Software developer"
  - Profile picture upload
- **Expected**: Profile saved successfully
- **API Calls**: `POST /api/profile`, `POST /api/upload/avatar`

### 5. Dashboard Access

- **Action**: Navigate to user dashboard
- **Expected**: Personalized dashboard loads
- **API Calls**: `GET /api/dashboard`, `GET /api/user/notifications`

## Test Scenarios

### Happy Path

1. Successful Google OAuth login
2. Complete profile setup
3. Access dashboard with all features

### Error Handling

1. OAuth failure (user denies permission)
2. Network timeout during profile save
3. Invalid image upload format

### Edge Cases

1. User cancels OAuth mid-flow
2. Duplicate account detection
3. Session expiry during profile setup
