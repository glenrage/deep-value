# Use an official Node.js runtime as a parent image
FROM node:23-alpine

# Set the working directory in the container
WORKDIR /server

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the HTTP port your application listens on (Cloud Run needs this)
EXPOSE 4000

# Define environment variables (can be overridden in Cloud Run)
ENV PORT=4000

# Command to run your application
CMD ["node", "server.js"]