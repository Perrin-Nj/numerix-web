# Hosted mock backend (Render, Fly, any Docker host). Vercel cannot run WireMock.
FROM wiremock/wiremock:3.13.1
COPY mappings /home/wiremock/mappings
# Hosts pass the port in $PORT
ENTRYPOINT ["/bin/sh", "-c", "exec /docker-entrypoint.sh --global-response-templating --disable-gzip --port ${PORT:-8080}"]
