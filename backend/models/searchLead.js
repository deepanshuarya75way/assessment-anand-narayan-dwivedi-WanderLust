const mongoose = require("mongoose");

const searchLeadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref : "User",
      required: true
    },
    email:{
      type:String,
      required : true,
      lowercase: true,
      trim: true
    },
    searchQuery: {
      type: String,
      required: true,
      trim : true
    },
    listing:{
      type: mongoose.Schema.Types.ObjectId,
      ref : "Listing",
      required : true
    },
    listingTitle : String,
    listingLocation: String,
    listingPrice: Number,
    listingUrl : String,

    bookingCompleted: {
      type : Boolean,
      default: false
    },
    emailSentAt : Date },
    {timestamps : true }
);

module.exports = mongoose.model("SearchLead", searchLeadSchema);
