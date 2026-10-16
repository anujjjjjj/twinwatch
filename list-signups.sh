#!/bin/sh
# Lists waitlist signups stored in the private Vercel Blob store (run from this dir after `vercel env pull`).
T=$(grep BLOB_READ_WRITE_TOKEN .env.local | cut -d= -f2- | tr -d '"'); vercel blob list --rw-token "$T" --prefix signups/
