# Security Policy

Poge is a client-side tool, but security still matters. If you discover a vulnerability, **do not open a public issue**. Please report it privately.

## Supported Versions

Only the latest version of Poge (main branch + latest deployment on https://poge.dev) receives security updates.

## Reporting a Vulnerability

If you find something that could compromise user data, expose credentials, or break the local-first security model, please contact the maintainer privately:

**Email:** webdev.byhari@gmail.com  
**GitHub:** https://github.com/dev-hari-prasad

Please include:

- A clear description of the vulnerability  
- Steps to reproduce  
- Expected impact  
- Any suggested fixes (optional)

You'll receive a response within **48 hours**.

## Security Notes

- Poge is **local-first**: credentials are stored in the browser, encrypted at rest.  
- No telemetry or tracking systems are used.  
- The hosted version at **https://poge.dev** uses **minimal, privacy-safe analytics** to measure grouped metrics such as visitor counts and countries.  
  - These analytics do **not** collect queries, credentials, personal information, or anything that gives access to a user’s data.  
  - Users who fork Poge can remove analytics completely by deleting the Vercel Analytics component and its import from the codebase.

- You control where it runs (local, Vercel, self-hosted).  
- Never share your exported `.enc` files or environment variables; they contain sensitive information such as connection details, encryption keys, and configuration secrets. Anyone with access to these files could potentially connect to your database or misuse your environment. These files are only meant for your own use when importing or exporting your settings across devices.

Thank you for helping keep Poge secure.
