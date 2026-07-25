# Reverse Proxy and Load Balancer

`infrastructure/proxy/nginx.conf` provides a local foundation. Production can use Nginx, Traefik, Caddy, or a cloud load balancer.

Required controls:

- HTTPS termination and HTTP-to-HTTPS redirect;
- API and frontend routing;
- WebSocket upgrade support;
- request body and upload limits;
- timeout controls;
- compression where safe;
- security headers;
- correlation/request IDs;
- health checks;
- graceful backend removal during rolling deployments.

Do not commit private TLS keys.
