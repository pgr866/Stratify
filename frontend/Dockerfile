FROM node:22.13.1-slim
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json /app/
RUN npm i -g npm@latest && npm ci
COPY frontend/ /app/
CMD ["sh", "-c", "\
    if [ \"${DEBUG}\" = \"True\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build; \
        npx serve -s dist -l 80; \
    fi"]