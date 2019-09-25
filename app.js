const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const checkAuth = require('./middleware/check-auth');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//CROS Error//
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

//DataBase Connection//
mongoose.connect("mongodb+srv://anand:unicornb1331@cluster0-0tquo.mongodb.net/mainProjectDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
    .then(() => {
        console.log("Connected to DataBase");
    })
    .catch(() => {
        console.log("Connection Failed!!!");
    });

//Project Collection//
const projectSchema = mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "usercollections",
        required: true
    },
    creatorName: {
        type: String,
        required: true
    },
    creatorEmail: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true
    },
    minDonation: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    likes: [],
    comment: [{
        userId: String,
        name: String,
        commented: String
    }],
    collectedMoney: {
        type: Number,
        default: 0
    },
    donation: [{
        userId: String,
        name: String,
        donated: Number
    }],
    projectStatus: {
        type: String,
        default: "Started Crowd Funding"
    }
});

var projectCollection = mongoose.model("projectcollections", projectSchema);

//Project Api//
app.post("/createProject", checkAuth, (req, res) => {
    const project = new projectCollection({
        title: req.body.title,
        content: req.body.content,
        cost: req.body.cost,
        minDonation: req.body.minDonation,
        creatorId: req.userData.userId,
        creatorName: req.userData.name,
        creatorEmail: req.userData.email
    });

    project.save().then(postCreated => {
        res.status(201).json({
            message: "Project Added Successfully!"
        })
    }).catch(error => {
        res.status(500).json({
            message: "Creating A Project failed!"
        })
    })
})

app.get("/getProject", (req, res) => {
    projectCollection.find().sort({ _id: -1 })
        .then(projects => {
            res.status(200).send(projects);
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching Projects Failed"
            })
        })
})

app.get("/getProjectById/:postId", (req, res) => {
    id = req.params.postId;
    projectCollection.find({ _id: id })
        .then(project => {
            res.status(200).send(project);
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching project Failed !"
            })
        })
})

app.put("/updateProject/:id", checkAuth, (req, res) => {
    projectCollection.updateOne({ _id: req.params.id, creatorId: req.userData.userId }, req.body)
        .then(result => {
            if (result.n > 0) {
                res.status(200).json({ message: "Update Successfull !" });
            } else {
                res.status(401).json({ message: "Not Authorized to Update Project !" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Couldn't Update Project!"
            })
        })
})

app.delete("/deleteProject/:id", checkAuth, (req, res) => {
    projectCollection.deleteOne({ _id: req.params.id, creatorId: req.userData.userId })
        .then(result => {
            if (result.n > 0) {
                res.status(200).json({ message: "Deletion Successfull !" })
            } else {
                res.status(401).json({ message: "Not Authorized to Delete Project !" })
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Deletion Failed !"
            })
        })
})

app.put("/likeProject/:id", checkAuth, (req, res) => {

    projectCollection.updateOne({ _id: req.params.id }, { $addToSet: { likes: req.body.userId } })
        .then(result => {
            if (result.n > 0) {
                res.status(200).json({ message: "Like Successfull !" })
            } else {
                res.status(401).json({ message: "Not Authorized to Like Project !" })
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Like Failed !"
            })
        })

})

app.put("/donation/:postId", checkAuth, (req, res) => {

    userCollection.updateOne({_id: req.body.userId},{$inc: {wallet: -req.body.donation}},(error,data) => {
        if (error) {
            console.log(error);
        }
    })
    projectCollection.updateOne({ _id: req.params.postId },
        {
            $push: {
                donation: {
                    "userId": req.body.userId,
                    "name": req.body.name,
                    "donated": req.body.donation
                }
            },
            $inc: { collectedMoney: req.body.donation }
        })
        .then(result => {
            if (result.n > 0) {
                res.status(200).json({ message: "Donated Successfully !" });
            } else {
                res.status(401).json({ message: "Not Authorized to Donate" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Donation Failed !"
            })
        })

   

    projectCollection.find({ $expr: { $gte: ["$collectedMoney", "$cost"] } }, { _id: 1, projectStatus: 1 }, (error, data) => {
        if (error) {
            console.log(error);
        } else {
            for (var i = 0; i < data.length; i++) {
                projectCollection.updateOne({ _id: data[i]._id }, { projectStatus: "Success" }, (error, data) => {
                    if (error) {
                        console.log(error);
                    }
                })
            }
        }
    })
});

app.put("/commentProject/:postId", checkAuth, (req, res) => {
    projectCollection.updateOne({ _id: req.params.postId },
        {
            $push: {
                comment: {
                    "userId": req.body.userId,
                    "name": req.body.name,
                    "commented": req.body.comment
                }
            }
        })
        .then(result => {
            if (result.n > 0) {
                res.status(200).json({ message: "Commented Successfully" });
            } else {
                res.status(401).json({ message: " Not Authorized to Comment" });
            }
        })
        .catch(error => {
            res.status(500).json({ message: "Comment Failed!" })
        })
})

//User Collection//
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    wallet: {
        type: Number,
        default: 0
    },
    likedProjects: [],
    donatedProjects: []
});

userSchema.plugin(uniqueValidator);

var userCollection = mongoose.model("usercollections", userSchema);

//User Api//
app.post("/signup", (req, res) => {
    bcrypt.hash(req.body.password, 10)
        .then(hash => {
            console.log(req.body);
            const user = new userCollection({
                name: req.body.name,
                email: req.body.email,
                password: hash
            });

            user.save()
                .then(result => {
                    console.log(result);
                    res.status(201).json("User Created Successfully!!");
                })
                .catch(error => {
                    res.json(500).json({
                        message: "Invalid Authentication Credentials!"
                    })
                });
        });
})

app.post("/login", (req, res) => {
    let fetchedUser;
    userCollection.findOne({ email: req.body.email })
        .then(user => {
            if (!user) {
                return res.status(401).json({
                    message: "Invalid Authentication Credentials"
                });
            }

            fetchedUser = user;
            return bcrypt.compare(req.body.password, fetchedUser.password);
        })
        .then(result => {
            if (!result) {
                return res.status(401).json({
                    message: "Password Doesn't Match"
                });
            }
            const token = jwt.sign(
                {
                    userId: fetchedUser._id,
                    name: fetchedUser.name,
                    email: fetchedUser.email,
                    wallet: fetchedUser.wallet
                },
                'this_is_a_crowdFunding_website_secret_string',
                { expiresIn: "1h" }
            );

            res.status(200).json({
                token: token,
                expiresIn: 3600,
                userId: fetchedUser._id,
                name: fetchedUser.name,
                wallet: fetchedUser.wallet
            });

        })
        .catch(error => {
            console.log(error);
            return res.status(401).json({
                message: "Invalid Authentication Credentials!"
            });
        })

})

//User Services//
app.get("/userProjects/:userId", checkAuth, (req, res) => {
    console.log(req.params.userId);
    projectCollection.find({ creatorId: req.params.userId })
        .then(result => {
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json({ message: "error in fetching user created projects" });
        })
})

app.get("/userDonations/:userId", checkAuth, (req, res) => {
    console.log(req.params.userId);
    projectCollection.find({ "donation": { $elemMatch: { userId: req.params.userId } } }, { _id: 1, creatorName: 1, title: 1, projectStatus: 1, cost: 1, collectedMoney: 1, "donation.donated": 1 })
        .then(result => {
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json("user donation can be found");
        })
})

app.get("/userWallet/:userId", checkAuth, (req, res) => {
    console.log(req.params.userId);
    userCollection.find({ _id: req.params.userId }, { wallet: 1, _id: 0 })
        .then(result => {
            console.log(result);
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json("user wallet cant be found");
        })
})

app.put("/topup/:userId", checkAuth, (req, res) => {

    userCollection.updateOne({ _id: req.params.userId }, { $inc: { wallet: req.body.money } })
        .then(result => {
            res.status(200).json("top up Successful");
        })
        .catch(error => {
            res.status(500).json("error in topup");
        })
})

//dashBoard pie Chart//
app.get("/crowdFunding", (req, res) => {
    projectCollection.find({ projectStatus: { $eq: "Started Crowd Funding" } }, { _id: 1 })
        .then(result => {
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json("error in fetching started crowdfunding details for pie chart");
        })
})

app.get("/success", (req, res) => {
    projectCollection.find({ projectStatus: { $eq: "Success" } }, { _id: 1 })
        .then(result => {
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json("error in fetching Success details for pei chart")
        })
})

app.get("/totalProject", (req, res) => {
    projectCollection.find({}, { _id: 1 })
        .then(result => {
            res.status(200).send(result);
        })
        .catch(error => {
            res.status(500).json("error in fetching total project for pie chart");
        })
})

//Api server//
app.get("/", (req, res) => {
    res.send("Welcome to CrowdFunding Api");
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is Up and listening");
})

