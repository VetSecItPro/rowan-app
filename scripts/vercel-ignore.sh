#!/usr/bin/env bash
# Vercel ignoreCommand: decide whether to build this commit.
# Exit 0 = skip build. Exit 1 = build.
#
# Skip rules:
# 1. Any non-main branch (preview deploys are unused; user opts out)
# 2. Main branch where the diff only touched non-deployable paths
#    (assets, screenshots, markdown, docs, SQL migrations)

set -euo pipefail

if [ "${VERCEL_GIT_COMMIT_REF:-}" != "main" ]; then
  echo "vercel-ignore: skipping (branch=$VERCEL_GIT_COMMIT_REF, not main)"
  exit 0
fi

# On main: skip if the diff hit ONLY excluded paths
if git diff --quiet HEAD^ HEAD -- \
  ':(exclude)public/marketing/' \
  ':(exclude)public/screenshots/' \
  ':(exclude)**/*.md' \
  ':(exclude)docs/' \
  ':(exclude)supabase/migrations/'; then
  echo "vercel-ignore: skipping (only excluded paths changed)"
  exit 0
fi

echo "vercel-ignore: building (production code changed)"
exit 1
