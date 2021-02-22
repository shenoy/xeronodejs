
const mongoose= require('mongoose');


const BalanceSheetSchema = new mongoose.Schema({
  reportDate: {
    type: Date,
    required: [true, "a balance sheet must have a report date"],
    unique: true,
  },
  company: {
    type: String,
    required: [true, "a balance sheet must show the company name"],
  },
  bank: {
    type: String,
    required: [true, "a balance sheet must have bank section"],
  },
  currentAssets: {
    type: String,
    required: [true, "a balance sheet must have current assets section"],
  },
  fixedAssets: {
    type: String,
    required: [true, "a balance sheet must have assets section"],
  },
  totalCurrentAssets: {
    type: String,
    required: [true, "a balance sheet must have current assets section"],
  },

  currentLiabilities: {
    type: String,
    required: [true, "a balance sheet must have current liabilities section"],
  },
  equity: {
    type: String,
    required: [true, "a balance sheet must have equity section"],
  },
});

const BalanceSheet = mongoose.model("BalanceSheet", BalanceSheetSchema);
module.exports=BalanceSheet;