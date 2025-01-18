FROM python:3.13.1-slim
RUN apt update -y && apt install -y --no-install-recommends wget build-essential libpq-dev wait-for-it && \
    rm -rf /var/lib/apt/lists/* && \
    wget https://github.com/TA-Lib/ta-lib/releases/download/v0.6.4/ta-lib-0.6.4-src.tar.gz && \
    tar -xzf ta-lib*.tar.gz && \
    cd ta-lib* && \
    ./configure && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib*
WORKDIR /app
COPY backend/ /app/
RUN pip install --no-cache-dir -U -r requirements.txt && rm -rf /root/.cache
EXPOSE 8000
CMD ["sh", "-c", "wait-for-it db:5432 --timeout=30 --strict && \
    python manage.py makemigrations --noinput && \
    python manage.py migrate --noinput && \
    python manage.py createsuperuser --noinput --email=$EMAIL_HOST_USER > /dev/null 2>&1 || true && \
    if [ \"$(echo $DEBUG | tr '[:upper:]' '[:lower:]')\" = \"true\" ]; then \
        python manage.py runserver 0.0.0.0:8000; \
    else \
        export DJANGO_SETTINGS_MODULE=stratify.settings \
        gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --timeout 60 --workers $(python -c 'import multiprocessing; print(multiprocessing.cpu_count()*2+1)'); \
    fi"]
