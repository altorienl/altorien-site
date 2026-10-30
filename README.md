# altorien.com

The front page. Two links and a sentence.

Its own Cloudflare Worker, not a path on another one: every project is a
separate origin, so a bug in any of them cannot reach another's cookies,
localStorage or install identity. `fly.altorien.com` and `intrinsics.app` are
likewise their own origins.

```
cp index.html favicon.svg public/
npx wrangler deploy
```

Then in the Cloudflare dashboard, add `altorien.com` as a custom domain on this
Worker. The zone has to be on Cloudflare nameservers for that to be offered.
