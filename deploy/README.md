# Deploy

Push to `development` → GitHub Actions runs the checks, builds the image `ghcr.io/igorchugurov/studio-desk-frontend:<commit>`, copies `docker-compose.yml` and `deploy.sh` to `/opt/studio-desk/frontend/` and runs `deploy.sh`.

Design and rules: `studio-desk-docs/03-architecture/deployment.md`, `studio-desk-docs/04-engineering-rules/deploy-new-service.md`. The server, the `studio-desk` user, Docker and nginx are the same as for the backend.

## Files

| File                                           | On the server                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `docker-compose.yml`                           | `/opt/studio-desk/frontend/docker-compose.yml`                           |
| `deploy.sh`                                    | `/opt/studio-desk/frontend/deploy.sh`                                    |
| `nginx/admin.studio-desk.axondigital.xyz.conf` | `/etc/nginx/sites-available/admin.studio-desk.axondigital.xyz` (by hand) |
| —                                              | `/opt/studio-desk/frontend/image.env` (written by `deploy.sh`: version)  |

The frontend needs no `.env` on the server: its hosts and the API address are in `.env.production`, which is built into the image (public addresses only). The container listens on `127.0.0.1:3101`.

## One-time server setup (as root)

DNS: an `A` record `admin.studio-desk` → `31.220.80.11` in Vercel.

### 1. Deploy key

`<PUBLIC KEY>` is the public half of the deploy key of this repository (`ssh-ed25519 ...`). The line is appended; the backend key stays.

```bash
echo '<PUBLIC KEY>' >> /home/studio-desk/.ssh/authorized_keys
chown studio-desk:studio-desk /home/studio-desk/.ssh/authorized_keys
chmod 600 /home/studio-desk/.ssh/authorized_keys
```

### 2. Deploy folder

```bash
install -d -m 750 -o studio-desk -g studio-desk /opt/studio-desk/frontend
```

### 3. nginx site and certificate

Other sites are not touched. Port `3101` must be free: `ss -ltn | grep 3101` prints nothing.

```bash
curl -fsSL https://raw.githubusercontent.com/IgorChugurov/studio-desk-frontend/development/deploy/nginx/admin.studio-desk.axondigital.xyz.conf \
  -o /etc/nginx/sites-available/admin.studio-desk.axondigital.xyz
ln -s /etc/nginx/sites-available/admin.studio-desk.axondigital.xyz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d admin.studio-desk.axondigital.xyz --redirect
```

The first time, before the file is on GitHub, write it by hand with the content of `nginx/admin.studio-desk.axondigital.xyz.conf`.

### 4. Server fingerprint

To compare with `DEPLOY_KNOWN_HOSTS`:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

## GitHub secrets (repository `studio-desk-frontend`)

`DEPLOY_HOST`, `DEPLOY_USER` (`studio-desk`), `DEPLOY_SSH_KEY` (private half of the deploy key), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan` output of the server).

## Manual operations (as studio-desk, in /opt/studio-desk/frontend)

```bash
docker compose --env-file image.env ps
docker compose --env-file image.env logs --tail 100 frontend
bash deploy.sh <older-tag>          # roll back
```
