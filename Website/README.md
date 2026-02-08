# Traffinity

Traffinity is a modern web application designed to help cities, fleets, and signals think ahead. It integrates advanced traffic management features with a robust parking management system.

## Features

- **ParkHub:** A comprehensive parking management system allowing admins to create layouts, manage slots, and handle bookings.
- **TrafficSync:** AI-powered traffic analysis tool using computer vision to optimize signal timings.
- **Modern UI/UX:** Smooth transitions, "liquid glass" effects, and dynamic gradients.
- **Authentication:** Secure Login and Signup powered by Supabase with strict data isolation.
- **Dark Mode:** Toggle between Light and Dark themes with persistent preferences.

## Tech Stack

- **Frontend:** React, Vite
- **Styling:** CSS3 (Glassmorphism, Grid, Transitions)
- **Backend (App):** Supabase (Auth, Database, Realtime)
- **Backend (AI):** Python, FastAPI, YOLOv8

## Getting Started

### Prerequisites

- Node.js installed
- Python 3.8+ installed
- Supabase account

### 1. Frontend Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory with your Supabase and TomTom credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_TOMTOM_API_KEY=your_tomtom_api_key
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

### 2. Backend (AI) Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Start the FastAPI server:
    ```bash
    uvicorn main:app --reload
    ```

### 3. Database Setup

1.  Go to your Supabase Dashboard > SQL Editor.
2.  Open the `supabase_schema.sql` file from this project.
3.  Copy the contents and run them in the SQL Editor.
    *   This creates the `admin_profiles` table and enforces strict Row Level Security (RLS) so admins only see their own data.

## Project Structure

- `src/App.jsx`: Main entry point handling Auth state and Theme.
- `src/components/ParkHub/`: Components for parking layout creation and management.
- `src/components/TrafficSync/`: Components for traffic signal analysis.
- `backend/`: Python FastAPI server for image processing.
- `supabase_schema.sql`: Database schema and security policies.
