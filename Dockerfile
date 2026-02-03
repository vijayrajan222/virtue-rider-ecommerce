# Use lightweight Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose app port
EXPOSE 3000

# Start app
CMD ["npm", "run", "start"]
