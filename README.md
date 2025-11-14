# LinkedIn Post Reactors Scraper

A Next.js application that uses PhantomBuster API to scrape all LinkedIn profiles that reacted to a given LinkedIn post URL.

## Features

- 🎯 Input LinkedIn post URL
- 🔍 Scrape all profiles that reacted to the post
- 📊 Display results in a clean, responsive UI
- ⚡ Real-time scraping status updates

## Prerequisites

- Node.js 18+ installed
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

3. Create a `.env.local` file in the root directory:
```env
PHANTOMBUSTER_API_KEY=your_phantombuster_api_key_here
PHANTOMBUSTER_PHANTOM_ID=your_phantombuster_phantom_id_here
LINKEDIN_SESSION_COOKIE=your_linkedin_session_cookie_here
```

4. Get your PhantomBuster credentials:
   - Log in to [PhantomBuster](https://phantombuster.com)
   - Go to your API settings to get your API key
   - Create or use an existing Phantom for LinkedIn post reactors
   - Copy the Phantom ID

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a LinkedIn post URL in the input field
2. Click "Scrape Reactors"
3. Wait for the scraping to complete (this may take a few minutes)
4. View the scraped profiles in the results section

## Project Structure

```
├── app/
│   ├── api/
│   │   └── phantombuster/
│   │       └── route.ts          # API route for PhantomBuster integration
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main page component
│   └── globals.css                # Global styles
├── .env.example                   # Example environment variables
└── README.md                      # This file
```

## API Endpoints

### POST `/api/phantombuster`

Scrapes LinkedIn profiles that reacted to a post.

**Request Body:**
```json
{
  "linkedinPostUrl": "https://www.linkedin.com/posts/..."
}
```

**Response:**
```json
{
  "success": true,
  "profiles": [...],
  "containerId": "..."
}
```

## Technologies Used

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- PhantomBuster API

## License

MIT
