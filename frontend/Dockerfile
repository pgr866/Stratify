FROM node:22.15.0-alpine
WORKDIR /app
COPY package*.json .
RUN npm i -g npm@latest && npm ci --legacy-peer-deps
COPY . .
CMD ["sh", "-c", "\
    if [ \"${DEBUG}\" = \"True\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build; \
        npx serve -s dist -l 80; \
    fi"]