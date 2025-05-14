# Node-React Bootstrap Project

A full-stack application with Node.js backend and React frontend.

## Docker Deployment

This project is configured to be easily deployed using Docker Compose with a super simple setup.

### Prerequisites

- Docker
- Docker Compose

### Running the Application

To start the application, run:

```bash
docker compose up
```

This will:

1. Pull the Node.js Alpine image
2. Mount your current directory into the container
3. Run the `docker-build.sh` script which:
   - Installs all necessary dependencies
   - Builds the UI with Vite
   - Builds the API with Parcel
   - Outputs all build artifacts to the `/app/build` directory
4. Start the backend server which serves the frontend static files
5. Expose the application on port 6969

### Accessing the Application

Once running, you can access the application at:

```
http://localhost:6969
```

### Stopping the Application

To stop the application, press `Ctrl+C` in the terminal where Docker Compose is running.

If you started it in detached mode with `-d`, run:

```bash
docker compose down
```

## Development

For local development without Docker:

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build for production
pnpm build

# Start production servers
pnpm start

# Run linting (with auto-fix, will fail on errors)
pnpm lint

# Run linting (with auto-fix, will not fail on errors)
pnpm lint:fix

# Check for lint issues without fixing
pnpm lint:check

# Format code with Prettier (current directory only)
pnpm format

# Check formatting issues without fixing (current directory only)
pnpm format:check

# Format code with Prettier (all workspaces)
pnpm format:all

# Check formatting issues without fixing (all workspaces)
pnpm format:check:all

# Run both Prettier formatting and ESLint fixing
pnpm fix
```

The frontend development server runs on port 5173 and the backend on port 6969.
