FROM node:18.18

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Fix permissions for node_modules/.bin executables
RUN chmod +x ./node_modules/.bin/*
# Fix permissions for workspace node_modules
RUN find ./packages -path "*/node_modules/.bin/*" -exec chmod +x {} \;

# Build UI with direct node execution
RUN cd packages/ui && npx tsc && \
    node --experimental-modules ./node_modules/vite/bin/vite.js build && \
    cd ../..

# Build the API
RUN cd packages/api && npm run build && cd ../..

# Create data directory in the build folder
RUN mkdir -p /app/build/data

# Set permissions for the data directory
RUN chmod -R 777 /app/build/data

# Expose the data directory as a volume
VOLUME ["/app/build/data"]

CMD ["node", "/app/build/app.js"]
