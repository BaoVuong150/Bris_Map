# Stage 1: Build React App
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all source files and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the build output from the first stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to handle React Router SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 inside the container
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
