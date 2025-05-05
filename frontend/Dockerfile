FROM node:22.14.0-slim
WORKDIR /app
COPY frontend/package*.json /app/
RUN npm i -g npm@latest && npm ci --legacy-peer-deps
COPY frontend/ /app/
CMD ["sh", "-c", "\
    if [ \"${DEBUG}\" = \"True\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build; \
        npx serve -s dist -l 80; \
    fi"]