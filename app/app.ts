const path = require("path");
var cors = require("cors");
const morgan = require("morgan");
require("dotenv").config({ path: "./sample.env" });
import express, { response } from "express";
import { Request, Response } from "express";
import jwtDecode from "jwt-decode";
import { TokenSet } from "openid-client";
import { XeroAccessToken, XeroIdToken, XeroClient } from "xero-node";
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const nodeCookie = require("node-cookie");
var router = express.Router();
var userRouter = require("./routes/userRoutes");
const mongoose = require("mongoose");
const BalanceSheet = require("./models/balanceSheetModel.js");
const session = require("express-session");
const client_id: string = process.env.CLIENT_ID;
const client_secret: string = process.env.CLIENT_SECRET;
const redirectUrl: string = process.env.REDIRECT_URI;
const scopes: string =
"openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments accounting.transactions offline_access";

const xero = new XeroClient({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUris: [redirectUrl],
  scopes: scopes.split(" "),
});

if (!client_id || !client_secret || !redirectUrl) {
  throw Error(
    "Environment Variables not all set - please check your .env file in the project root or create one!"
    );
  }
  
  const app: express.Application = express();
  app.use(cookieParser());
  app.use(cors());

app.use(express.static(__dirname + "/build"));

app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));

app.use(
  session({
    secret: "something crazy",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const authenticationData: any = (req: Request, res: Response) => {
  return {
    decodedIdToken: req.session.decodedIdToken,
    decodedAccessToken: req.session.decodedAccessToken,
    tokenSet: req.session.tokenSet,
    allTenants: req.session.allTenants,
    activeTenant: req.session.activeTenant,
  };
};
mongoose
  .connect(
    "mongodb+srv://xero:xero@cluster0.3i65i.mongodb.net/test?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
    }
  )
  .then(() => console.log("DB connection successful!"));

app.get("/", (req: Request, res: Response) => {
  res.send(`<a href='/connect'>Connect to Xero</a>`);
});

app.get("/connect", async (req: Request, res: Response) => {
  try {
    const consentUrl: string = await xero.buildConsentUrl();
    res.redirect(consentUrl);
  } catch (err) {
    res.send("Sorry, something went wrong");
  }
});

app.get("/starter/Callback", async (req: Request, res: Response) => {
  try {
    const tokenSet: TokenSet = await xero.apiCallback(req.url);
    await xero.updateTenants();

    const decodedIdToken: XeroIdToken = jwtDecode(tokenSet.id_token);
    const decodedAccessToken: XeroAccessToken = jwtDecode(
      tokenSet.access_token
    );

    req.session.decodedIdToken = decodedIdToken;
    req.session.decodedAccessToken = decodedAccessToken;
    req.session.tokenSet = tokenSet;
    req.session.allTenants = xero.tenants;
    // XeroClient is sorting tenants behind the scenes so that most recent / active connection is at index 0
    req.session.activeTenant = xero.tenants[0];

    const authData: any = authenticationData(req, res);

    // console.log(authData);

    res.redirect("/reports");
    // res.redirect(`<p>Connect to mongo</p>`);
  } catch (err) {
    res.send("Sorry, something went wrong");
  }
});

app.get("/reports", async (req: Request, res: Response) => {
  try {
    const tokenSet: TokenSet = await xero.readTokenSet();
    console.log(tokenSet.expired() ? "expired" : "valid");
    const balsheetDate = "2021-02-17";
    const balsheetPeriods = 7;
    const balsheetTimeframe = "MONTH";
    const balsheetTrackingOptionID1 = undefined;
    const balsheetTrackingOptionID2 = undefined;
    const balsheetStandardLayout = true;
    const balsheetPaymentsOnly = false;
    const getBalanceSheetResponse = await xero.accountingApi.getReportBalanceSheet(
      req.session.activeTenant.tenantId,
      balsheetDate,
      balsheetPeriods,
      balsheetTimeframe,
      balsheetTrackingOptionID1,
      balsheetTrackingOptionID2,
      balsheetStandardLayout,
      balsheetPaymentsOnly
    );

    const reportDate = getBalanceSheetResponse.body.reports[0].reportDate;
    const company = getBalanceSheetResponse.body.reports[0].reportTitles[1]; 
    const currentAssets =
      getBalanceSheetResponse.body.reports[0].rows[3].rows[1].cells[1].value;
    const capital =
      getBalanceSheetResponse.body.reports[0].rows[2].rows[1].cells[1].value;
    const fixedAssets =
      getBalanceSheetResponse.body.reports[0].rows[4].rows[2].cells[1].value;
    const totalCurrentAssets = parseFloat(currentAssets) + parseFloat(capital);
    const currentLiabilities =
      getBalanceSheetResponse.body.reports[0].rows[8].rows[0].cells[1].value;

    const equity =
      getBalanceSheetResponse.body.reports[0].rows[10].rows[2].cells[1].value;
    const longTermLiabilities =
      totalCurrentAssets - parseFloat(currentLiabilities) - parseFloat(equity);

    const testBalanceSheet = new BalanceSheet({
      reportDate: reportDate,
      company: company,
      bank: capital,
      currentAssets: currentAssets,
      fixedAssets: fixedAssets,
      totalCurrentAssets: totalCurrentAssets,
      currentLiabilities: currentLiabilities,
      equity: equity,
    });

    testBalanceSheet
      .save()
      .then((doc) => console.log(doc))
      .catch((err) => console.log(err));

   
    res.redirect("http://localhost:4200/reports");
  } catch (err) {
    res.send("Sorry, something went wrong");
  }
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log("COOKIES>>>", req.cookies);
  next();
});

app.use((req, res, next) => {
  const {
    headers: { cookie },
  } = req;
  if (cookie) {
    const values = cookie.split(";").reduce((res, item) => {
      const data = item.trim().split("=");
      return { ...res, [data[0]]: data[1] };
    }, {});
    res.locals.cookie = values;
    console.log("CUSTOM COOKIE PARSER", values);
  } else res.locals.cookie = {};
  next();
});

app.use("/users", userRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

//==========================================================================================================================
 // res.send(` Report Name : ${getBalanceSheetResponse.body.reports[0].reportName} </br>
    // Report Date:   ${reportDate} </br>
    // ASSETS</br>
    // Accounts Receivable : ${currentAssets}</br>
    // Capital : ${capital}</br>
    // Fixed Assets:  ${fixedAssets}</br>
    // Total Current Assets  : ${totalCurrentAssets}</br>
    // LIABILITIES </br>
    // Current Liabilities: ${currentLiabilities}</br>
    // Equity : ${equity}

    // `);