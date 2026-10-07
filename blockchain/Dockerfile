FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx hardhat compile
EXPOSE 8545
CMD ["sh", "-c", "npx hardhat node --hostname 0.0.0.0 & sleep 8 && npx hardhat run scripts/deploy.js --network localhost && wait"]
