# SB Service


## Prerequisites

Before running this application, ensure you have the following installed:

- Node.js (>=12.x)
- npm (>=6.x)
- pnpm

## Installation

```bash
$ npm install
```

## Configuration

To configure the application, follow these steps:

1. **Modify `.env.example`**: Create `.env` file in the project directory. This file contains placeholders for environment variables. Replace these placeholders with the actual values for your setup.

2. **Set up Environment Variables**: Here are the required environment variables that you need to set:

### Redis Configuration

- `REDIS_FE_URL`: The host address for the Redis server.

### Server Configuration

- `SERVER_PORT`: The port number on which the server will run.

- ### bf-rest Server URL Configuration
  -

## Installation

```bash
$ pnpm install
```

## Running the app

```bash
# development
$ npm run start:dev


# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
