const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, jwks);
    req.user = payload;
    console.log(payload);

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("StudyNook");
    const roomCollection = db.collection("rooms");
    const bookingCollection = db.collection("Booking");

    app.get("/", (req, res) => {
      res.send("the CRUD is here");
    });

    app.post("/rooms", verifyToken, async (req, res) => {
      const newRoom = req.body;
      console.log("user to be inserted", newRoom);
      const result = await roomCollection.insertOne(newRoom);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      const { search, amenities, minRate, maxRate, floor, latest } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { floor: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (amenities) {
        query.amenities = { $all: amenities.split(",") };
      }

      if (minRate || maxRate) {
        query.rate = {};
        if (minRate) query.rate.$gte = Number(minRate);
        if (maxRate) query.rate.$lte = Number(maxRate);
      }

      if (latest === "true") {
        const result = await roomCollection
          .find(query)
          .sort({ _id: -1 })
          .limit(6)
          .toArray();
        return res.json(result);
      }

      const result = await roomCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/rooms/owner/:ownerId", verifyToken, async (req, res) => {
      const { ownerId } = req.params;
      const result = await roomCollection.find({ ownerId: ownerId }).toArray();
      res.json(result);
    });

    app.get("/rooms/:roomId",  async (req, res) => {
      const { roomId } = req.params;
      const result = await roomCollection.findOne({
        _id: new ObjectId(roomId),
      });
      res.json({ ...result, bookingCount: result.bookingCount ?? 0 });
      // res.json(result);
    });

    
    app.patch("/rooms/:roomId", verifyToken, async (req, res) => {
      const { roomId } = req.params;
      const updatedData = req.body;
      const result = await roomCollection.updateOne(
        { _id: new ObjectId(roomId) },
        { $set: updatedData },
      );

      res.json(result);
    });
    

    app.delete("/rooms/:roomId", verifyToken, async (req, res) => {
      const { roomId } = req.params;
      const query = { _id: new ObjectId(roomId) };
      const result = await roomCollection.deleteOne(query);
      res.json(result);
    });

    app.post("/booking", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const { roomId, bookingDate, startTime, endTime } = bookingData;

      const conflictBooking = await bookingCollection.findOne({
        roomId: roomId,
        bookingDate: bookingDate,
        status: { $ne: "cancelled" },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });

      if (conflictBooking) {
        return res.status(409).json({
          message: `Already booked from ${conflictBooking.startTime} to ${conflictBooking.endTime} on this date.`,
        });
      }

      const result = await bookingCollection.insertOne(bookingData);
        await roomCollection.updateOne(
    { _id: new ObjectId(roomId) },
    { $inc: { bookingCount: 1 } },
  );
      res.status(201).json(result);
    });

    app.get("/booking/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.json(result);
    });

    app.patch("/booking/:bookingId/cancel", verifyToken, async (req, res) => {
      const { bookingId } = req.params;

      const booking = await bookingCollection.findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "Booking is already cancelled" });
      }

      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status: "cancelled" } },
      );

      if (booking.roomId) {
        await roomCollection.updateOne(
           { _id: new ObjectId(booking.roomId), bookingCount: { $gt: 0 } },
          { $inc: { bookingCount: -1 } },
        );
      }

      res.json({ message: "Booking cancelled successfully", result });
    });

    // await client.db("admin").command({ ping: 1 });
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
