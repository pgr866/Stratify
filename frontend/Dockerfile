FROM node:22.13.0-slim
RUN apt update -y && apt install -y --no-install-recommends npm && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY frontend/ /app/
RUN npm ci
EXPOSE 51737
CMD ["sh", "-c", "if [ \"$(echo $DEBUG | tr '[:upper:]' '[:lower:]')\" = \"true\" ]; then \
        npm run dev -- --host; \
    else \
        npm run build && npx serve -s build -l 80; \
    fi"]