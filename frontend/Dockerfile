FROM node:22.13.0-slim
WORKDIR /app
COPY frontend/ /app/
RUN npm i -g npm@latest && npm ci
EXPOSE 5173
CMD ["sh", "-c", "if [ \"$(echo $DEBUG | tr '[:upper:]' '[:lower:]')\" = \"true\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build; \
        npx serve -s dist -l 80; \
    fi"]