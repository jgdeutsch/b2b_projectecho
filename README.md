# LinkedIn Post Reactors Scraper

A Next.js application that uses PhantomBuster API to scrape all LinkedIn profiles that reacted to a given LinkedIn post URL. All scraped data is stored in a Neon PostgreSQL database, organized by projects.

## Features

- 🎯 Create and manage projects
- 📝 Input LinkedIn post URLs per project
- 🔍 Scrape all profiles that reacted to posts
- 💾 Store all data in Neon PostgreSQL database
- 📊 Display results in a clean, responsive UI
- ⚡ Real-time scraping status updates
- 🗄️ Organized data structure: Projects → LinkedIn Posts → LinkedIn Profiles

## Prerequisites

- Node.js 18+ installed
- Neon PostgreSQL database (created via Vercel or directly)
- PhantomBuster account with API key
- PhantomBuster Phantom ID for LinkedIn post reactors scraper
- (Optional) LinkedIn session cookie for better results

## Setup

1. Clone the repository:
```bash
git clone https://github.com/jgdeutsch/b2b_projectecho.git
cd b2b_projectecho
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Neon database:
   - If you created the database via Vercel, get the connection string from your Vercel dashboard
   - Or create a database directly at [Neon](https://neon.tech)
   - Copy your database connection string

4. Create a `.env.local` file in the root directory:
```env
DATABASE_URL=your_neon_database_connection_string
PHANTOMBUSTER_API_KEY=your_phantombuster_api_key_here
PHANTOMBUSTER_PHANTOM_ID=your_phantombuster_phantom_id_here
LINKEDIN_SESSION_COOKIE=your_linkedin_session_cookie_here
```

5. Set up the database schema:
```bash
# Push the schema to your database (recommended for development)
npm run db:push

# Or generate and run migrations (for production)
npm run db:generate
npm run db:migrate
```

6. Get your PhantomBuster credentials:
   - Log in to [PhantomBuster](https://phantombuster.com)
   - Go to your API settings to get your API key
   - Create or use an existing Phantom for LinkedIn post reactors
   - Copy the Phantom ID

7. Run the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Create a Project**: Click "+ Create New Project" and enter a project name
2. **Select Project**: Choose the project you want to scrape profiles for
3. **Enter LinkedIn Post URL**: Paste the LinkedIn post URL in the input field
4. **Scrape Reactors**: Click "Scrape Reactors" to start scraping
5. **Wait for Results**: The scraping process may take a few minutes
6. **View Profiles**: All scraped profiles are displayed and automatically saved to the database

## Database Schema

The application uses a relational database structure:

- **Projects**: Each project has a name and can contain multiple LinkedIn posts
- **LinkedIn Posts**: Each post belongs to a project and can have multiple profiles
- **LinkedIn Profiles**: Each profile belongs to a post and contains:
  - Profile URL
  - Name (if available)
  - Headline (if available)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── phantombuster/
│   │   │   └── route.ts          # API route for PhantomBuster integration
│   │   └── projects/
│   │       └── route.ts          # API route for project management
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main page component
│   └── globals.css                # Global styles
├── lib/
│   └── db/
│       ├── schema.ts              # Database schema definitions
│       ├── index.ts               # Database connection
│       └── queries.ts             # Database query functions
├── drizzle/
│   └── 0000_init.sql              # Database migration file
├── drizzle.config.ts              # Drizzle ORM configuration
└── README.md                      # This file
```

## API Endpoints

### GET `/api/projects`

Get all projects.

**Response:**
```json
{
  "success": true,
  "projects": [...]
}
```

### POST `/api/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "Project Name"
}
```

**Response:**
```json
{
  "success": true,
  "project": { "id": 1, "name": "Project Name", ... }
}
```

### POST `/api/phantombuster`

Scrapes LinkedIn profiles that reacted to a post and saves them to the database.

**Request Body:**
```json
{
  "linkedinPostUrl": "https://www.linkedin.com/posts/...",
  "projectId": 1
}
```

**Response:**
```json
{
  "success": true,
  "profiles": [...],
  "postId": 1,
  "containerId": "..."
}
```

## Technologies Used

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- PhantomBuster API
- Neon PostgreSQL
- Drizzle ORM

## License

MIT
