#!/bin/bash
# Run once the Cloudflare CNAME for intrinsics -> altorienl.github.io exists.
set -e
echo "== 1. confirm DNS =="
got=$(dig +short intrinsics.altorien.com @1.1.1.1 | tr '\n' ' ')
[ -z "$got" ] && { echo "   no record yet -- add the CNAME first"; exit 1; }
echo "   intrinsics.altorien.com -> $got"

echo "== 2. point GitHub Pages at the new domain =="
cd ~/intrinsics
echo "intrinsics.altorien.com" > CNAME
git add CNAME
git commit -q -m "Serve from intrinsics.altorien.com

Consolidating onto the one domain that is already paid for through 2029, so
intrinsics.app can lapse. Pages keeps building from main and the nightly
scan is untouched -- only the hostname it answers on changes."
git push -q origin HEAD
echo "   CNAME pushed; GitHub will re-issue the certificate (a few minutes)"

echo "== 3. update the links on altorien.com =="
cd ~/altorien-site
sed -i '' 's|https://intrinsics\.app|https://intrinsics.altorien.com|g' index.html resume.html
sed -i '' 's|>intrinsics\.app<|>intrinsics.altorien.com<|g' index.html
cp index.html resume.html favicon.svg public/
cp index.html public/lander/index.html
git add -A
git commit -q -m "Point the Intrinsics links at intrinsics.altorien.com"
git push -q origin HEAD
npx wrangler deploy 2>&1 | grep -iE "deployed" || true
echo
echo "Done. Verify:"
echo "  curl -sI https://intrinsics.altorien.com | head -1"
