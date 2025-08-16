# Lizt

A simple list management web application created to fill a personal need via vibe coding with Claude Code.

## Overview

Lizt is a lightweight Node.js web app that allows you to create, manage, and organize lists. It features a clean web interface for managing your lists and items with persistent JSON-based storage.

## Features

- Create and manage multiple lists
- Add, edit, and delete list items
- RESTful API for list operations
- Simple web interface
- Persistent data storage using JSON files
- Docker support for easy deployment

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: JSON files
- **Development**: Nodemon for hot reloading

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Using Docker (Recommended for Production)

Build and run with Docker Compose:
```bash
docker-compose up --build
```

The application will be available at `http://localhost:3737`

Data persistence is handled automatically with Docker volumes, avoiding permission issues.

## API Endpoints

- `GET /api/lists` - Get all lists
- `POST /api/lists` - Create a new list
- `GET /api/lists/:id` - Get a specific list
- `PUT /api/lists/:id` - Update a list
- `DELETE /api/lists/:id` - Delete a list

## Data Storage

Lists are stored in `data/lists.json`. This directory is created automatically when the first list is saved.

---

*Built with vibe coding and Claude Code* 🤖