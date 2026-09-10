// Generates a VAPID key pair for Web Push. Run once, then store the output in
// your environment (locally in .env.local, in production in Vercel).
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
