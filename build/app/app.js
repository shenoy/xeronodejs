"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
var cors = require("cors");
const morgan = require("morgan");
require("dotenv").config({ path: "./sample.env" });
const express_1 = __importDefault(require("express"));
const jwt_decode_1 = __importDefault(require("jwt-decode"));
const xero_node_1 = require("xero-node");
var router = express_1.default.Router();
var userRouter = require("./routes/userRoutes");
const mongoose = require("mongoose");
const BalanceSheet = require("./models/balanceSheetModel.js");
const session = require("express-session");
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirectUrl = process.env.REDIRECT_URI;
const scopes = "openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments accounting.transactions offline_access";
const xero = new xero_node_1.XeroClient({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUris: [redirectUrl],
    scopes: scopes.split(" "),
});
if (!client_id || !client_secret || !redirectUrl) {
    throw Error("Environment Variables not all set - please check your .env file in the project root or create one!");
}
const app = express_1.default();
app.use(cors());
app.use(express_1.default.static(__dirname + "/build"));
app.use(morgan("dev"));
app.use(express_1.default.json());
app.use(session({
    secret: "something crazy",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));
const authenticationData = (req, res) => {
    return {
        decodedIdToken: req.session.decodedIdToken,
        decodedAccessToken: req.session.decodedAccessToken,
        tokenSet: req.session.tokenSet,
        allTenants: req.session.allTenants,
        activeTenant: req.session.activeTenant,
    };
};
mongoose
    .connect("mongodb+srv://xero:xero@cluster0.3i65i.mongodb.net/test?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
})
    .then(() => console.log("DB connection successful!"));
app.get("/", (req, res) => {
    res.send(`<a href='/connect'>Connect to Xero</a>`);
});
app.get("/connect", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consentUrl = yield xero.buildConsentUrl();
        res.redirect(consentUrl);
    }
    catch (err) {
        res.send("Sorry, something went wrong");
    }
}));
app.get("/starter/Callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenSet = yield xero.apiCallback(req.url);
        yield xero.updateTenants();
        const decodedIdToken = jwt_decode_1.default(tokenSet.id_token);
        const decodedAccessToken = jwt_decode_1.default(tokenSet.access_token);
        req.session.decodedIdToken = decodedIdToken;
        req.session.decodedAccessToken = decodedAccessToken;
        req.session.tokenSet = tokenSet;
        req.session.allTenants = xero.tenants;
        // XeroClient is sorting tenants behind the scenes so that most recent / active connection is at index 0
        req.session.activeTenant = xero.tenants[0];
        const authData = authenticationData(req, res);
        // console.log(authData);
        res.redirect("/reports");
        // res.redirect(`<p>Connect to mongo</p>`);
    }
    catch (err) {
        res.send("Sorry, something went wrong");
    }
}));
app.get("/data", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allData = yield BalanceSheet.find();
        res.send(allData.reverse());
    }
    catch (err) {
        res.send();
    }
}));
app.get("/reports", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenSet = yield xero.readTokenSet();
        console.log(tokenSet.expired() ? "expired" : "valid");
        const balsheetDate = "2021-02-17";
        const balsheetPeriods = 7;
        const balsheetTimeframe = "MONTH";
        const balsheetTrackingOptionID1 = undefined;
        const balsheetTrackingOptionID2 = undefined;
        const balsheetStandardLayout = true;
        const balsheetPaymentsOnly = false;
        const getBalanceSheetResponse = yield xero.accountingApi.getReportBalanceSheet(req.session.activeTenant.tenantId, balsheetDate, balsheetPeriods, balsheetTimeframe, balsheetTrackingOptionID1, balsheetTrackingOptionID2, balsheetStandardLayout, balsheetPaymentsOnly);
        const reportDate = getBalanceSheetResponse.body.reports[0].reportDate;
        const currentAssets = getBalanceSheetResponse.body.reports[0].rows[3].rows[1].cells[1].value;
        const capital = getBalanceSheetResponse.body.reports[0].rows[2].rows[1].cells[1].value;
        const fixedAssets = getBalanceSheetResponse.body.reports[0].rows[4].rows[2].cells[1].value;
        const totalCurrentAssets = parseFloat(currentAssets) + parseFloat(capital);
        const currentLiabilities = getBalanceSheetResponse.body.reports[0].rows[8].rows[0].cells[1].value;
        const equity = getBalanceSheetResponse.body.reports[0].rows[10].rows[2].cells[1].value;
        const longTermLiabilities = totalCurrentAssets - parseFloat(currentLiabilities) - parseFloat(equity);
        const testBalanceSheet = new BalanceSheet({
            reportDate: reportDate,
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
        res.send(` Report Name : ${getBalanceSheetResponse.body.reports[0].reportName} </br>  
    Report Date:   ${reportDate} </br>
    ASSETS</br>
    Accounts Receivable : ${currentAssets}</br>
    Capital : ${capital}</br>
    Fixed Assets:  ${fixedAssets}</br>
    Total Current Assets  : ${totalCurrentAssets}</br>
    LIABILITIES </br>
    Current Liabilities: ${currentLiabilities}</br>
    Equity : ${equity}
    
    `);
    }
    catch (err) {
        res.send("Sorry, something went wrong");
    }
}));
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    // console.log(req.headers);
    next();
});
app.use("/users", userRouter);
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
//# sourceMappingURL=app.js.map