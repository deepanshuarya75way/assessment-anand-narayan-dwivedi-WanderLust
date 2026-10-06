const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref : "User",
      required: true
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

    bookingDate: {
      type : Date,
      default: Date.now
    },

    status: {
      type: String, enum:["confirmed", "cancelled"],
      default: "confirmed"
    }
    },
    { timestamps : true }
);

module.exports = mongoose.model("Booking", bookingSchema);
