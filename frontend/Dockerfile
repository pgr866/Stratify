FROM node:22.13.0-slim
WORKDIR /app
COPY frontend/ /app/
RUN npm ci
EXPOSE 51737
CMD ["sh", "-c", "if [ \"$(echo $DEBUG | tr '[:upper:]' '[:lower:]')\" = \"true\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build && npx serve build --port 80; \
    fi"]