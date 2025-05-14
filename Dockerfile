FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Create data directory in the build folder
RUN mkdir -p /app/build/data

# Set permissions for the data directory
RUN chmod -R 777 /app/build/data

# Expose the data directory as a volume
VOLUME ["/app/build/data"]

CMD ["node", "/app/build/app.js"]
