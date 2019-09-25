const jwt = require("jsonwebtoken");

module.exports = (req,res,next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token,"this_is_a_crowdFunding_website_secret_string");
        req.userData = {
            userId: decodedToken.userId,
            name: decodedToken.name,
            email: decodedToken.email,
            wallet: decodedToken.wallet
        };
        next();
    }
    catch(error) {
        res.status(401).json ({
            message: "You are not Authenticated!"
        });
    }

};