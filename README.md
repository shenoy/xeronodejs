# Xero NodeJS OAuth 2.0 Typescript Starter
This NodeJS Typescript project is meant to get you started interacting with the Xero API using the xero-node SDK and OAuth 2.0. 

Note: this project was built using Visual Studio Code and NodeJS

## How to use

### Configure with your credentials
Create an OAuth 2.0 app in Xero to get a *CLIENT_ID* and *CLIENT_SECRET*.

* Create a free Xero user account (if you don't have one) 
* Login to Xero Developer center https://developer.xero.com/myapps
* Click "Try OAuth 2.0"
* Enter your app details (your redirect URI: `http://localhost:${PORT}`)
* Click "Create App"
* Click "Generate a secret"
* Create a `.env` file in the root of your project & replace the 3 variables
> `touch .env`
```
CLIENT_ID=...
CLIENT_SECRET=...
REDIRECT_URI=...
```

### Build and run

```sh
npm install
npm run dev
```