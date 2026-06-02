FROM node:20-slim

WORKDIR /workspace

# Copy dependencies manifest
COPY package.json .

# Install dependencies including peer dependencies bypass
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY . .

EXPOSE 5173

# Bind to 0.0.0.0 so container is accessible from host network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
