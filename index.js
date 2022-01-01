const { MongoClient } = require("mongodb");
const express = require("express");
const ObjectId = require("mongodb").ObjectId;
const app = express();
const cors = require("cors");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s3raz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log(uri);

const run = async () => {
  try {
    await client.connect();
    console.log("connected");
    const database = client.db("hero_rider");
    const usersCollection = database.collection("users");
    const ridersCollection = database.collection("riders");
    const learnersCollection = database.collection("learners");

    // get Api
    app.get("/learner", async (req, res) => {
      const cursor = learnersCollection.find({});
      const learners = await cursor.toArray();
      res.json(learners);
    });

    app.get("/learners", async (req, res) => {
      const cursor = learnersCollection.find({});
      console.log(req.query);
      const page = req.query.page;
      const size = parseInt(req.query.size);

      let learners;
      const count = await cursor.count();
      if (page) {
        learners = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        learners = await cursor.toArray();
      }
      res.send({ count, learners });
    });

    app.get("/riders", async (req, res) => {
      const cursor = ridersCollection.find({});
      console.log(req.query);
      const page = req.query.page;
      const size = parseInt(req.query.size);

      let riders;
      const count = await cursor.count();
      if (page) {
        riders = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        riders = await cursor.toArray();
      }
      res.send({ count, riders });
    });

    app.get("/rider", async (req, res) => {
      const cursor = ridersCollection.find({});
      const riders = await cursor.toArray();
      res.json(riders);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // post api
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      console.log("hitting the post", result);
      res.json(result);
    });

    app.post("/rider", async (req, res) => {
      //   console.log("body", req.body);
      //   console.log("files", req.files);
      //   res.json({ success: true });
      const name = req.body.name;
      const email = req.body.email;
      const age = req.body.age;
      const address = req.body.address;
      const phone = req.body.phone;
      const ride = req.body.ride;
      const riderInfo = req.body.rideInfo;
      const type = req.body.type;

      // driving license
      const picLicense = req.files.licenceImage;
      const licenceImg = picLicense.data;
      const encodedLicencePic = licenceImg.toString("base64");
      const licenceImageBuffer = Buffer.from(encodedLicencePic, "base64");

      // profile
      const pic = req.files.profileImage;
      const profileImg = pic.data;
      const encodedProfilePic = profileImg.toString("base64");
      const profileImageBuffer = Buffer.from(encodedProfilePic, "base64");
      // nid
      const pic2 = req.files.nidImage;
      const nidImg = pic2.data;
      const encodedNidPic = nidImg.toString("base64");
      const NidImageBuffer = Buffer.from(encodedNidPic, "base64");
      const rider = {
        name,
        email,
        age,
        address,
        phone,
        ride,
        type,
        riderInfo,
        licenceImageBuffer: licenceImageBuffer,
        profileImage: profileImageBuffer,
        nidImage: NidImageBuffer,
      };
      const result = await ridersCollection.insertOne(rider);
      res.json(result);
    });

    app.post("/learner", async (req, res) => {
      const name = req.body.name;
      const email = req.body.email;
      const age = req.body.age;
      const address = req.body.address;
      const phone = req.body.phone;
      const ride = req.body.ride;
      const type = req.body.type;

      // profile
      const pic = req.files.profileImage;
      const profileImg = pic.data;
      const encodedProfilePic = profileImg.toString("base64");
      const profileImageBuffer = Buffer.from(encodedProfilePic, "base64");
      // nid
      const pic2 = req.files.nidImage;
      const nidImg = pic2.data;
      const encodedNidPic = nidImg.toString("base64");
      const NidImageBuffer = Buffer.from(encodedNidPic, "base64");
      const learner = {
        name,
        email,
        age,
        address,
        phone,
        ride,
        type,
        profileImage: profileImageBuffer,
        nidImage: NidImageBuffer,
      };
      const result = await learnersCollection.insertOne(learner);
      res.json(result);
    });

    app.put("/learner/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };

      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await learnersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    // delete api
    app.delete("/rider/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ridersCollection.deleteOne(query);
      console.log("deleting Orders with id", result);
      res.json(result);
    });

    app.delete("/learner/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await learnersCollection.deleteOne(query);
      console.log("deleting Orders with id", result);
      res.json(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;

      const amount = paymentInfo.price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
    //   await client.close();
  }
};

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Hero-Road Running");
});

app.listen(port, () => {
  console.log("server running at port", port);
});
