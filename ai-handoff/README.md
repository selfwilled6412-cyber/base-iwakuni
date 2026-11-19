# BASE AI handoff | ChatGPT + Muse

This is a **public, non-secret coordination document** for the BASE business-development workflows. It is not an API integration and does not grant either assistant access to the other one's private chats or memory.

## Goal and responsibilities
- Final KPI: legitimate BASE revenue and profit, not just video views or draft counts.
- Muse: find and fact-check B2B prospects using **public business information only**, summarize observed business needs and opportunities. Never imply a company needs a service without evidence.
- ChatGPT: evaluate research, update BASE's own website and code, prepare product offers and landing-page improvements, and keep the project status grounded in GitHub.
- Existing implementation: `selfwilled6412-cyber/base-iwakuni`; sales work tracked in GitHub Issue #33 and BASE video quality in Issue #34.

## Public-data-only collaboration protocol
1. Read Issue #33 and the latest public docs before work. Do not edit deployed files, GitHub Actions, Buffer or Cloudflare, or create unreviewed production changes.
2. Muse may assemble a public prospect research brief: official organization name, URL, location, offered business service, observable public issue/evidence, possible BASE service fit, source URL, and date checked.
3. **No personal contact information, private mail, customer records, internal pricing, personal data, passwords, tokens, API keys or unannounced plans in this public repository.**
4. Share public research as a draft GitHub issue comment or a separate branch/PR for review; require owner approval for writes until the workflow proves reliable. Do not merge or deploy.
5. ChatGPT can review those public results and propose next actions via Issue #33. Confirm any material change against actual files and tests.
6. Never email, DM, publish to SNS, sign contracts, spend money, or modify permission settings without an explicitly authorized workflow and its checks.
7. Muse is a separate system. This is a **shared workspace**, not a direct Muse API or shared login/session; no automatic synchronization until explicitly configured and tested.

## First safe research assignment
Research up to 10 businesses in the Iwakuni-Hatsukaichi-Hiroshima area using public official websites. Cite evidence, flag uncertain matches, prioritize fit to BASE's actual services (website/app production, business workflow automation, cybersecurity readiness support). Return a reviewable public research brief; **do not contact prospects**.

## Permissions
When connecting Muse to GitHub, select only this repository if the authorization UI allows it, and start with read-only access / explicit approval before writes. Do not connect Gmail or grant mail-send permissions for this first test.
