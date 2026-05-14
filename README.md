# VisionX Dashboard

A comprehensive web application for managing and analyzing video feeds from multiple cameras. The application includes a login system, real-time detection using YOLOv11 models, and a dashboard for visualizing detection data.

## Features

- **Login System**: Simple admin login with username and password (both "admin").
- **Home Page**: Displays graphs showing precision, recall, and model information based on trained model results.
- **Live Page**: Add camera feeds and select different models for each feed. Detection runs simultaneously for all feeds.
- **Database Page**: View detection results with camera names, locations, detection times, and captured images.
- **Dashboard Page**: Shows KPI cards and graphs based on detection data.

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Chart.js
- **Backend**: Flask
- **Database**: MongoDB

## Getting Started

### Prerequisites

- Node.js
- Python 3.8+
- MongoDB

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   cd server
   pip install -r requirements.txt
   ```

### Running the Application

1. Start the frontend development server:
   ```
   npm run dev
   ```
2. Start the backend server:
   ```
   npm run server
   ```

## Usage

1. Access the application at `http://localhost:5173`
2. Login with username: `admin` and password: `admin`
3. Navigate through the different pages using the sidebar
4. On the Live page, add cameras and select detection models
5. View detection results in the Database page
6. Check analytics on the Dashboard page

## Project Structure

- `/src`: Frontend React code
  - `/components`: Reusable UI components
  - `/context`: React context providers
  - `/pages`: Application pages
  - `/types`: TypeScript type definitions
- `/server`: Flask backend
  - `app.py`: Main Flask application
  - `requirements.txt`: Python dependencies

## Camera Data Persistence

Camera configurations are stored in localStorage to persist between sessions. In a production environment, this would be stored in the MongoDB database.

## Detection Models

The application supports various YOLOv11-based detection models:
- Smoking Detection
- Weapon Detection
- Crime Detection
- General Object Detection

Each camera can use a different model for detection, and all models can run simultaneously.