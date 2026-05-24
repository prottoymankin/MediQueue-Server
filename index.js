const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require("dotenv");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONOGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({message: "Unauthorized"});
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({message: "Unauthorized"});
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({message: "Forbidden"});
  }
}

const run = async () => {
  try {
    await client.connect();
    const db = client.db("mediqueue");
    const tutorCollection = db.collection("tutors");
    const bookedSessionsCollection = db.collection("bookedSession");

    app.post("/tutors", verifyToken, async (req, res) => {
      const newTutorData = req.body;
      const result = await tutorCollection.insertOne(newTutorData);
      res.send(result);
    });

    app.get("/tutors", async (req, res) => {
      const limit = parseInt(req.query.limit);
      let query = tutorCollection.find({});

      if (limit) {
        query = tutorCollection.find({}).limit(limit);
      }

      const result = await query.toArray();
      res.send(result);
    });

    app.get("/tutors/my-tutors/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await tutorCollection.find({ createdBy: id }).toArray();
      res.send(result);
    })

    app.get("/tutors/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await tutorCollection.findOne(query);
      res.send(result);
    });

    app.get("/api/tutors/search", async (req, res) => {
      const search = req.query.search;
      console.log(search)
      
      const result = await tutorCollection.find({
        tutorName: {
          $regex: search,
          $options: "i"
        }
      }).toArray();

      res.send(result);
    });

    app.patch("/tutors/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const result = await tutorCollection.updateOne(
        query,
        {
          $set: updatedData,
        }
      );

      res.send(result);
    });

    app.patch("/tutors/change-slot/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { value } = req.body;
      
      const query = { _id: new ObjectId(id) };
      const result = await tutorCollection.updateOne(
        query,
        {
          $inc: { totalSlot: parseInt(value) }
        }
      ); 
      res.send(result);
    });

    app.delete("/tutors/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/booked-session", verifyToken, async (req, res) => {
      const bookedSessionData = req.body;
      const result = await bookedSessionsCollection.insertOne(bookedSessionData);
      res.send(result);
    });

    app.get("/booked-session/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { studentId: id };
      const result = await bookedSessionsCollection.find(query).toArray();
      res.send(result);
    });
    
    app.patch("/booked-session/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const query = { _id: new ObjectId(id) };

      const result = await bookedSessionsCollection.updateOne(
        query,
        {
          $set: updatedData
        }
      );

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {}
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});