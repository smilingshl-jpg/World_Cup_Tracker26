# Hosting the hub for yourself with Cloudflare Tunnel

The app is a Node server, so it needs a runtime (not static hosting). A Cloudflare
Tunnel exposes the hub running on your own machine to a public HTTPS URL — no ports
opened, free. `cloudflared` is already installed on this machine.

There are two paths. Start with the Quick tunnel to see it work; switch to the
Named tunnel when you want a stable, private URL.

---

## A. Quick tunnel — works right now, zero account

One command. Gives a random `https://<words>.trycloudflare.com` URL that lives only
while the command runs (new URL each time, no login required, no access lock).

```powershell
cd C:\Users\sahil\worldcup
.\host.ps1
```

Watch the output for a line like `https://brave-tiger-xyz.trycloudflare.com` — that's
your live site. Ctrl+C stops both the tunnel and the server.

Good for: trying it, sharing for an afternoon. Not for: a permanent bookmark.

---

## B. Named tunnel on your own domain — stable + private (recommended to keep)

A fixed URL like `https://worldcup.yourdomain.com`, optionally locked to just your
Google login. Needs a domain added to a (free) Cloudflare account. One-time setup:

### 1. Log in (opens your browser — only you can do this)
```powershell
cloudflared tunnel login
```
Pick the domain (zone) you want to use. This writes `cert.pem` to `~/.cloudflared`.

> No domain yet? Add any domain you own to Cloudflare (dash.cloudflare.com → Add a site,
> free plan), or register one. A tunnel needs a zone you control.

### 2. Create the tunnel (prints a UUID + a credentials .json path)
```powershell
cloudflared tunnel create worldcup
```

### 3. Write the config
Copy `deploy\cloudflared-config.example.yml` to `C:\Users\sahil\.cloudflared\config.yml`
and replace the two `REPLACE-WITH-TUNNEL-UUID` placeholders with the UUID from step 2,
and set `hostname:` to your chosen subdomain.

### 4. Point DNS at the tunnel
```powershell
cloudflared tunnel route dns worldcup worldcup.yourdomain.com
```

### 5. Run it (server + tunnel together)
```powershell
cd C:\Users\sahil\worldcup
.\host.ps1 -Named worldcup
```
Your site is now at `https://worldcup.yourdomain.com`.

### 6. (Recommended) Lock it to just you — Cloudflare Access
In the Cloudflare dashboard → **Zero Trust → Access → Applications → Add an application**
→ Self-hosted → set the domain to `worldcup.yourdomain.com` → add a policy
**Allow** where **Emails = vivek7@gmail.com**. Now only your login can open the site;
everyone else gets a Cloudflare login wall.

### Keep it always-on (optional)
Run the tunnel as a Windows service so it survives reboots/logout:
```powershell
cloudflared service install
```
(You still need `node server.js` running — Task Scheduler at logon, or run `host.ps1`
in a startup shortcut. The tunnel only matters when the server is up.)

---

## Notes
- Put secrets in `.env` (already gitignored): `ODDS_API_KEY=yourkey`. `host.ps1` loads it.
- Live odds stay snapshot-only until that key is set; everything else works without it.
- The hub leans on unofficial ESPN endpoints for live scores/lineups — no hosting impact,
  but a future ESPN change could need a small code fix.
- Your machine must be on and `host.ps1` running for the site to be reachable. If you'd
  rather not keep a machine on, deploy the same repo to Render/Fly.io instead (it already
  honors `PORT` and `npm start` — no code changes).
