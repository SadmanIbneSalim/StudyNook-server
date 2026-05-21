const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
const cors = require("cors");
//middleware
app.use(express.json());
app.use(cors());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const db = client.db("StudyNook");
    const roomCollection = db.collection("rooms");
    const bookingCollection=db.collection('Booking')

    app.get("/", (req, res) => {
      res.send("the CRUD is here");
    });

    app.post("/rooms", async (req, res) => {
      const newRoom = req.body;
      console.log("user to be inserted", newRoom);
      const result = await roomCollection.insertOne(newRoom);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      const result = await roomCollection.find().toArray();
      res.json(result);
    });

    app.get("/rooms/:roomId", async (req, res) => {
      const { roomId } = req.params;
      const result = await roomCollection.findOne({
        _id: new ObjectId(roomId),
      });
      res.json(result);
    });
    app.patch("/rooms/:roomId", async (req, res) => {
      const { roomId } = req.params;
      const updatedData = req.body;
      const result = await roomCollection.updateOne(
        { _id: new ObjectId(roomId) },
        { $set: updatedData },
      );

      res.json(result);
    });

     app.delete("/rooms/:roomId", async (req, res) => {
        const { roomId } = req.params;
        const query = { _id: new ObjectId(roomId) };
        const result = await roomCollection.deleteOne(query);
        res.json(result);
    });

    app.post("/rooms", async (req, res) => {
      const bookingData = req.body;
      console.log("user to be inserted", bookingData);
      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`the port is serveing in the port ${port} `);
});
