---
name: step-command
description: Use when the linter needs a known-good skill. Writes a greeting file and checks it.
---

# Good skill

Limits are in [spec.md](spec.md).

## Steps

### 1. Write the greeting

```bash
echo hello > greeting.txt
```

Verify: `cat greeting.txt` prints `hello`.

### 2. Count the lines

Count the lines in the file.

Verify: it prints `1`.

## Error recovery

| Failure | Fix |
|---|---|
| `greeting.txt` is empty | Check the disk is writable with `touch probe.txt`, then rerun step 1 |
