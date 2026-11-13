# Seafarer Resume Sender

An independent full-stack side project for managing CV email campaigns to maritime recruiting agencies.

## Overview

The application accepts CV files and recipient data, sends campaigns through SendGrid, checks replies using Gmail OAuth 2.0, and stores campaign information in MongoDB. It includes an Express API, a lightweight browser UI, Swagger documentation, and a Docker/Nginx deployment setup.

## Technology

- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Email integrations:** SendGrid API, Gmail API, OAuth 2.0
- **Frontend:** HTML, CSS, JavaScript
- **Infrastructure:** Docker Compose, Nginx
- **API documentation:** Swagger UI

## Engineering approach

The backend separates HTTP routes, controllers, middleware, and services. Key implementation areas include recipient-file parsing, email campaign processing, response tracking, token-expiration handling, and persistence of campaign metadata.

This is a personal, AI-assisted project, not a production-scale commercial SaaS platform. I reviewed and integrated the generated code and worked through implementation and deployment issues.

## Run locally

You will need Node.js, npm, MongoDB, and credentials for any enabled third-party services.

```bash
git clone https://github.com/mennekis/cv-sender.git
cd cv-sender
cd backend
npm install
cp .env.example .env
npm run dev
```

Configure `backend/.env` with your own values. Do not use the example placeholders as real credentials. When the backend starts, Swagger documentation is served at `/api-docs` on its configured host.

The repository also includes `docker-compose.yml` and Nginx configuration; adapt hostnames, secrets, volumes, and ports before deployment.

## Current limitations

- External email services require private credentials; a publicly accessible live demo is not provided.
- The current `npm test` command is a placeholder, not an automated test suite.
- Deployment configuration requires review before reuse in another environment.

## Documentation

- [API documentation](./API_DOCUMENTATION.md)

## Security

Never commit real credentials, OAuth tokens, customer records, or recipient lists. If any secret was committed previously, revoke or rotate it and review Git history; removing it from the latest commit alone is not enough.

## Author

[Oleksiy Nikolayenko](https://www.linkedin.com/in/oleksiy-n-73849441/) — JavaScript/TypeScript developer working across enterprise web platforms, CMS modernization, frontend engineering, and automation.
