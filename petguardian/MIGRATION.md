# Moving PetGuardian into its own GitHub repo

PetGuardian was built inside the `petguardian/` subfolder of the **botBybit** repo
(which is an unrelated Freqtrade trading bot). These steps move it to a dedicated
`heart7/PetGuardian` repo with the project at the repository root.

> The Claude Code web session was scoped to `heart7/botBybit`, so it could not create
> the new repo or push to it. Run the steps below with your own GitHub access (they use
> the `gh` CLI; the GitHub web UI works too).

## Recommended — preserve history (promotes `petguardian/` to the repo root)

```bash
# 0. Get a local clone of botBybit on the build branch
git clone https://github.com/heart7/botBybit.git
cd botBybit
git checkout claude/petguardian-incremental-build-82rqu5

# 1. Extract just the petguardian/ folder into a new branch, with its history,
#    rewritten so that the folder's contents become the repo root.
git subtree split --prefix=petguardian -b petguardian-root

# 2. Create the new (private) repo
gh repo create heart7/PetGuardian --private \
  --description "PetGuardian — an AI Health Operating System for Pets"

# 3. Push the extracted history as the new repo's main branch
git push https://github.com/heart7/PetGuardian.git petguardian-root:main
```

That's it. Because `petguardian/.github/workflows/ci.yml` is inside the folder, the
split promotes it to `.github/workflows/ci.yml` at the new root, so **CI runs
automatically** on the first push. The old botBybit-scoped workflow
(`.github/workflows/petguardian-ci.yml`) stays behind in botBybit and is not needed.

## Alternative — fresh start (no history)

```bash
gh repo create heart7/PetGuardian --private --clone
cp -R botBybit/petguardian/. PetGuardian/
cd PetGuardian
git add .
git commit -m "Initial commit: PetGuardian (migrated from botBybit subfolder)"
git push -u origin main
```

## After the move

- **Verify locally:** `npm install && npm run typecheck && npm test`, and
  `sudo -u postgres bash scripts/test-db.sh` (or rely on the CI `database` job).
- **Continue the build** (Steps 7–13) from the new repo: start a fresh Claude Code
  session pointed at `heart7/PetGuardian` so the environment and GitHub access are
  scoped to it.
- **Optional cleanup:** once you're happy with the new repo, delete the
  `petguardian/` folder from botBybit on a branch and open a PR there.
- All paths in the docs drop the `petguardian/` prefix once the project is at the root
  (e.g. `bash scripts/test-db.sh`, not `bash petguardian/scripts/test-db.sh`).
