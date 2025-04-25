#!/bin/bash

# Script to help with Docker operations

# Function to display help
show_help() {
    echo "Usage: ./docker-run.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the containers in detached mode"
    echo "  stop        Stop the containers"
    echo "  restart     Restart the containers"
    echo "  logs        Show logs from the containers"
    echo "  build       Rebuild the containers"
    echo "  shell       Open a shell in the container"
    echo "  help        Show this help message"
    echo ""
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Process commands
case "$1" in
    start)
        echo "Starting containers..."
        docker-compose up -d
        echo "Containers started. Access the application at http://localhost:8080"
        ;;
    stop)
        echo "Stopping containers..."
        docker-compose down
        echo "Containers stopped."
        ;;
    restart)
        echo "Restarting containers..."
        docker-compose restart
        echo "Containers restarted."
        ;;
    logs)
        echo "Showing logs (press Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    build)
        echo "Rebuilding containers..."
        docker-compose build --no-cache
        echo "Containers rebuilt."
        ;;
    shell)
        echo "Opening shell in container..."
        docker-compose exec monthly-returns /bin/bash
        ;;
    help|*)
        show_help
        ;;
esac
