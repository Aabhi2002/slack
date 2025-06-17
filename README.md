# Slack Clone with AI Features

A modern Slack clone built with React, TypeScript, and Supabase, featuring advanced AI capabilities for enhanced team collaboration.

## 🚀 Features

### Core Features
- Real-time messaging and collaboration
- Workspace management
- Direct messaging
- Channel management
- File sharing and attachments
- Message reactions and emojis
- Thread support
- Typing indicators
- Read receipts
- Pinned messages
- Activity feed

### AI-Powered Features

1. **OrgBrain**
   - Organization-wide memory and knowledge management
   - Semantic search across channels
   - Context-aware responses
   - Pin-boosted content prioritization
   - Vector-based similarity search

2. **Message Tone Analysis**
   - Real-time sentiment analysis of messages
   - Tone detection and feedback
   - Emotional intelligence insights
   - Helps maintain positive communication

3. **Meeting Notes**
   - Automated meeting note generation
   - Smart summarization
   - Action item extraction
   - Integration with workspace memory
   - Easy access to historical meeting context

4. **Thread Memory System**
   - Context preservation in threads
   - Semantic search within threads
   - Related content suggestions
   - Memory-based conversation continuity
   - Vector embeddings for context understanding

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- TanStack Query (React Query)
- Tailwind CSS
- Shadcn UI Components
- Radix UI Primitives
- React Hook Form
- Zod (Schema Validation)

### Backend
- Supabase
  - Real-time database
  - Authentication
  - Storage
  - Vector embeddings
  - Edge Functions

### Development Tools
- ESLint
- TypeScript
- PostCSS
- Tailwind CSS
- SWC (for fast compilation)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/slack-clone.git
cd slack-clone
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Database Setup

1. Create a new Supabase project
2. Run the following SQL migrations in your Supabase SQL editor:
   - Create necessary tables (channels, messages, workspaces, etc.)
   - Set up vector extensions for AI features
   - Configure RLS (Row Level Security) policies

### AI Features Setup

1. **OrgBrain Setup**
   - Enable vector extension in Supabase
   - Configure embedding generation
   - Set up search functions

2. **Message Tone Analysis**
   - Configure sentiment analysis service
   - Set up real-time processing

3. **Meeting Notes**
   - Configure meeting note generation service
   - Set up workspace memory tables

4. **Thread Memory**
   - Configure vector embeddings
   - Set up memory tables and functions

## 📁 Project Structure

```
src/
├── components/
│   ├── workspace/     # Workspace-related components
│   ├── ui/           # Reusable UI components
│   └── auth/         # Authentication components
├── pages/            # Page components
├── integrations/     # External service integrations
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.io/) for the backend infrastructure
- [Shadcn UI](https://ui.shadcn.com/) for the component library
- [Radix UI](https://www.radix-ui.com/) for accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) for styling
