const nodemailer = require("nodemailer");

const sender = nodemailer.createTransport({
  service: "gmail",
  auth : {
    user: process.env.EMAIL_USER,
      pass:
    process.env.EMAIL_PASS
  }
});

async function sendBookingFollowUP(lead){
  const listingUrl = `${process.env.APP_URL}/listings/${lead.listing}`;

  await sender.sendMail({
    from: `"WonderLust" <${process.env.EMAIL_USER}>`,
    to : lead.email,
    subject: `Still interested in ${lead.listingTitle}?`,
    html: `<div style="font-family: Arial, sans-serif;">
      <h2> Complete your WanderLust booking</h2>
      <p>You recently searched for:<strong>{lead.searchQuery}</strong></p>
      <h3>${lead.listingTitle}</h3>
      <p>
        You were looking at this stay but didn't complete your booking.
      </p>
      <a href = "${listingUrl}" style="background:#ff385c; color:white; padding:12px 20px;
      text-decoration:none">Complete Booking</a>
    </div>`
  });
}

module.exports = {sendBookingFollowUP};