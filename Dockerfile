# ============================================================
# Stage 1: Build the React frontend
# ============================================================
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /frontend

# Install dependencies using the committed lockfile.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the frontend source and build it.
COPY frontend/ ./
RUN npm run build

# Arrange the output for Django.
# Keep index.html at build/index.html and move the other
# build files, including static/, into build/root/.
RUN mkdir -p build/root \
    && for item in build/* build/.[!.]* build/..?*; do \
         [ -e "$item" ] || continue; \
         name="${item##*/}"; \
         case "$name" in \
             index.html|root) continue ;; \
         esac; \
         mv "$item" build/root/; \
       done \
    && test -d build/root/static


# ============================================================
# Stage 2: Build the Django application
# ============================================================
FROM python:3.10-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /code

# Install system dependencies.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies.
COPY requirements.txt /tmp/requirements.txt

RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements.txt \
    && rm -rf /root/.cache/

# Copy the Django application.
COPY . /code/

# Include the frontend build produced in Stage 1.
# This replaces any ignored or stale local frontend build.
COPY --from=frontend-build /frontend/build/ /code/frontend/build/

# Collect Django static assets.
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", ":8000", "--workers", "2", "citiopen.wsgi"]
