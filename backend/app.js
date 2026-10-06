const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js")
const Review = require("./models/review.js");
const User = require("./models/user.js");
const path = require("path");
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js")
const listingSchema = require("./schema.js");
const SearchLead = require("./models/searchLead.js");
const Booking = require("./models/booking.js");
const cron = require("node-cron");
const { sendBookingFollowUp } = require("./utils/email.js");

if (process.env.NODE_ENV !== "production") {
    try { require("dotenv").config(); } catch (e) { }
}

const MONGO_URL = process.env.ATLASDB_URL || process.env.MONGODB_URI || "mongodb+srv://ananddev:PpxXIVSYPILYgBWf@cluster0.ovdb4wk.mongodb.net/wanderlust?retryWrites=true&w=majority";
const { reviewSchema, registerSchema } = require("./schema.js");
const sessionSecret = process.env.SESSION_SECRET || "wanderlustsupersecretcode2026";

main().then(() => {
    console.log("connected to DB");
})
    .catch((err) => {
        console.log(err);
    });
async function main() {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "../frontend/public")));

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(session({
    store: MongoStore.create({ mongoUrl: MONGO_URL, touchAfter: 24 * 60 * 60 }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

const safeReturnTo = (value, fallback = "/listings") => {
    if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
        return value;
    }
    return fallback;
};

const requireLogin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        const returnTo = safeReturnTo(req.body.returnTo, `/listings/${req.params.id}`);
        return res.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    next();
};

app.get('/', (req, res) => {
    res.redirect("/listings");
});

const validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);

    if (error) {
        throw new ExpressError(400, error.message);
    }
    else {
        next();
    }
};

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);

    if (error) {
        throw new ExpressError(400, error.message);
    }
    else {
        next();
    }
};

cron.schedule("*/5 * * * *", async ()=>{
    try{
        const oldLeads = await SearchLead.find({
            bookingCompleted: false,
            emailSent: false, 
            createdAt: {
                $lte: new Date(Date.now()- 5 * 60 * 1000)
            }
        }).limit(20);

        for(const lead of oldLeads){
            try{
                await sendBookingFollowUp(lead);
                lead.emailSent = true;

                lead.emailSentAt = new Date();

                await lead.save();

                console.log(`Follow Up email sent to ${lead.email}`);
            }
            catch(emailError){
                console.error("Email failed", error.message);
            }
        }
    }catch(err){
        console.log("Lead Follow-up error:", error.message);
    }
});

app.get("/listings", wrapAsync(async (req, res) => {
    const searchQuery = (req.query.search || "").trim();

    let alllistings;

    if (searchQuery) {
        const regex = new RegExp(searchQuery, "i");

        alllistings = await Listing.find({
            $or: [
                { title: regex },
                { location: regex },
                { country: regex },
                { description: regex }
            ]
        });
    } else {
        alllistings = await Listing.find({});
    }

    if (searchQuery && req.user && alllistings.length > 0) {
        for (const listing of alllistings) {
            const existingLead = await SearchLead.findOne({
                user: req.user._id,
                searchQuery: searchQuery.toLowerCase(),
                listing: listing._id,
                bookingCompleted: false,
                emailSent: false
            });

            if (!existingLead) {
                await SearchLead.create({
                    user: req.user._id,
                    email: req.user.email,
                    searchQuery: searchQuery.toLowerCase(),
                    listing: listing._id,
                    listingTitle: listing.title,
                    listingLocation: `${listing.location},${listing.country}`,
                    listingPrice: listing.price,
                    listingUrl: `/listings/${listing._id}`

                });
            }
        }
    }
    res.render("listings/index.ejs", {
        alllistings, searchQuery
    });
}));

app.post("/listings/:id/book", requireLogin, wrapAsync(async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        throw new ExpressError(404, "listening not found");
    }
    const booking = await Booking.create({
        user: req.user._id,
        listing: listing._id
    });

    await SearchLead.updateMany(
        {
            user: req.user._id,
            listing: listing._id,

        bookingCompleted: false
        },
        {
            $set: {
                bookingCompleted: true
            }
        }
    );
res.send(`<h1> Booking Confirmed! </h1>
        <p> Your booking for ${listing.title} is confirmed.</p> <a href = "/listings/${listing._id}"> Back to listing</a>`
);
})
);

app.get("/register", (req, res) => {
    res.render("users/register.ejs", {
        error: null,
        returnTo: safeReturnTo(req.query.returnTo),
    });
});

app.get("/test", (req, res) => {
    res.send("Server is working");
});

app.post("/register", wrapAsync(async (req, res, next) => {
    const returnTo = safeReturnTo(req.body.returnTo);
    const { error } = registerSchema.validate(req.body);

    if (error) {
        return res.status(400).render("users/register.ejs", {
            error: error.details[0].message,
            returnTo,
        });
    }

    const { username, email, password } = req.body;
    let user;
    try {
        user = await User.register(new User({ username: username.trim(), email: email.trim() }), password);
    } catch (registrationError) {
        const message = registrationError.code === 11000
            ? "That username or email is already registered."
            : registrationError.name === "UserExistsError"
                ? "That username is already taken."
                : "Unable to create an account with those details.";
        return res.status(400).render("users/register.ejs", { error: message, returnTo });
    }

    req.logIn(user, (loginError) => {
        if (loginError) return next(loginError);
        res.redirect(returnTo);
    });
}));

app.get("/login", (req, res) => {
    res.render("users/login.ejs", {
        error: req.query.error ? "Username or password is incorrect." : null,
        returnTo: safeReturnTo(req.query.returnTo || req.session.returnTo),
    });
});

app.post("/login", (req, res, next) => {
    const returnTo = safeReturnTo(req.body.returnTo || req.session.returnTo);
    passport.authenticate("local", (authError, user) => {
        if (authError) return next(authError);
        if (!user) {
            return res.status(401).render("users/login.ejs", {
                error: "Username or password is incorrect.",
                returnTo,
            });
        }

        req.logIn(user, (loginError) => {
            if (loginError) return next(loginError);
            delete req.session.returnTo;
            res.redirect(returnTo);
        });
    })(req, res, next);
});

app.post("/logout", (req, res, next) => {
    req.logout((logoutError) => {
        if (logoutError) return next(logoutError);
        res.redirect("/listings");
    });
});

//new route
app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

//show route
app.get("/listings/:id", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", { listing });
});

app.post("/listings/:id/interest", requireLogin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) throw new ExpressError(404, "Listing not found");

    const alreadyInterested = listing.interestedUsers.some((userId) => userId.equals(req.user._id));
    if (alreadyInterested) {
        listing.interestedUsers.pull(req.user._id);
    } else {
        listing.interestedUsers.push(req.user._id);
    }

    await listing.save();
    res.redirect(safeReturnTo(req.body.returnTo, `/listings/${id}`));
}));

//create route
// create route
app.post("/listings", validateListing, wrapAsync(async (req, res, next) => {
    const listingData = req.body.listing;

    if (
        listingData.image &&
        (!listingData.image.url ||
            listingData.image.url.trim() === "")
    ) {
        delete listingData.image;
    }


    const newListing = new Listing(listingData);


    await newListing.save();

    res.redirect("/listings");
})
);

//edit route
app.get("/listings/:id/edit", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
});

//upadte route
app.put("/listings/:id", async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect(`/listings/${id}`);
});

//delete route
app.delete("/listings/:id", async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");

});

//Reviews
//Post route for reviews
app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    res.redirect(`/listings/${listing._id}`);
    console.log("Review Added!");
})
);

app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    const listing = await Listing.findOneAndUpdate(
        { _id: id, reviews: reviewId },
        { $pull: { reviews: reviewId } }
    );

    if (!listing) {
        throw new ExpressError(404, "Review not found");
    }

    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
}));

// app.get("/testListing", async (req,res)=>{
//     let sampleListing = new Listing({
//         title: "My New Villa",
//         description : "By the beach",
//         price:5000,
//         location: "Calangute, Goa",
//         country: "India"
//     });
//     await sampleListing.save();
//     console.log("Sample Was Saved!");
//     res.send("Successful testing");
// });

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

//Error handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;

    res.status(statusCode).render("Error.ejs", { err });
    // res.status(statusCode).send(message);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`server is listening to port ${port}`);
});