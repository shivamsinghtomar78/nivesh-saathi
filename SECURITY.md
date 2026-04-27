# Security Notes

## Secrets

Never commit API keys, `.env.local`, Firebase Admin service account JSON, private keys, or Vercel project tokens.

This repo keeps committed configuration in `.env.example` only. Real values belong in local `.env.local` or in Vercel environment variables.

## Key Rotation

Rotate any key that has been pasted into chat, screenshots, public issue trackers, pull requests, or commit history. Treat pasted keys as exposed even if the repository itself is clean.

## Git Checks Before Push

Run these before pushing:

```powershell
git status --short
git check-ignore -v .env.local
rg -n "<key-prefix-or-private-key-marker>" --glob "!node_modules/**" --glob "!.next/**" --glob "!.env.local" --glob "!*.log"
```

The `rg` command should not return any committed source file containing real secret literals.
