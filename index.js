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

// const verifyToken=(req,res,next)=>{
//   const authHeader=req?.header.authorization
//   if(!authHeader){
//     return res.status(401).json({ message: "Unauthorized"})
//   }

//   if(!token){
//     return res.status(401).json({ message: "Unauthorized"})
//   }
//    console.log(authHeader);
//    next();
// }

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization; // headers, header না

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>" থেকে token নাও

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};

async function run() {
  try {
    await client.connect();
    const db = client.db("StudyNook");
    const roomCollection = db.collection("rooms");
    const bookingCollection = db.collection("Booking");

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

    app.get("/rooms/owner/:ownerId", async (req, res) => {
      const { ownerId } = req.params;
      const result = await roomCollection.find({ ownerId: ownerId }).toArray();
      res.json(result);
    });

    app.get("/rooms/:roomId", async (req, res, next) => {
      const header = req.headers.authorization;
      console.log(header);
      // if(header==="logged in"){
      //   next()
      // }
      // else{
      //   res.status(401).json({message: "unauthorized"})
      // }

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

    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const { roomId, bookingDate, startTime, endTime } = bookingData;

      const existingBookings = await bookingCollection
        .find({
          roomId: roomId,
          bookingDate: bookingDate,
          status: { $ne: "cancelled" },
        })
        .toArray();

      const conflictBooking = existingBookings.find((booking) => {
        return startTime < booking.endTime && endTime > booking.startTime;
      });

      if (conflictBooking) {
        return res.status(409).json({
          message: `Already booked from ${conflictBooking.startTime} to ${conflictBooking.endTime} on this date.`,
        });
      }

      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });

    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.json(result);
    });

    app.delete("/booking/:userId", async (req, res) => {
      const { userId } = req.params;
      const query = { _id: new ObjectId(userId) };
      const result = await bookingCollection.deleteOne(query);
      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`the port is serving in the port ${port} `);
});
