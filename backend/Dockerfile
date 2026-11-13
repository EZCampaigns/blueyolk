# Blue Yolk instant treatment: ffmpeg (with vidstab) + a tiny Python HTTP endpoint on port 8080.
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY treat.py ./
COPY *.m4a ./music/
EXPOSE 8080
CMD ["python3", "treat.py", "--serve", "8080"]
