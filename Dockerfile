ARG PYTHON_VERSION=3.10-buster

FROM python:${PYTHON_VERSION}

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN --mount=type=secret,id=SECRET_KEY \
    SECRET_KEY=LirzoeF1HXFgBvUwNOVU_7Ug_kS7qAiIXRMF2b322Qw

RUN mkdir -p /code

WORKDIR /code

COPY requirements.txt /tmp/requirements.txt

RUN apt-get update && apt-get install -y git

RUN set -ex && \
    pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache/ && \
    pip install git+ssh://git@github.com/jtiosue/rcal.git

COPY . /code/

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# replace demo.wsgi with <project_name>.wsgi
CMD ["gunicorn", "--bind", ":8000", "--workers", "2", "citiopen.wsgi"]
