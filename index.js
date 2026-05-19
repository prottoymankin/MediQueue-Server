const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require("dotenv");

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

const run = async () => {
  try {
    await client.connect();
    const db = client.db("mediqueue");
    const tutorCollection = db.collection("tutors");

    app.get("/tutors", async (req, res) => {
      const limit = parseInt(req.query.limit);
      let query = tutorCollection.find({});

      if (limit) {
        query = tutorCollection.find({}).limit(limit);
      }

      const result = await query.toArray();
      res.send(result);
    });

    app.get("/tutors/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await tutorCollection.findOne(query);
      res.send(result);
    })

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