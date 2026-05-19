const express= require("express");
const app= express();
const dotenv=require("dotenv");
dotenv.config()
const port= process.env.PORT 
const { MongoClient, ServerApiVersion } = require('mongodb'); 
const uri = process.env.MONGODB_URI;
const cors = require('cors') ;
//middleware
app.use(express.json())
app.use(cors())







const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
  try {

      await client.connect();
    const db=client.db("StudyNook");
    const roomCollection=db.collection("rooms");

    app.get("/",(req,res)=>{
res.send("the CRUD is here")
});



app.post('/rooms',async(req,res)=>{
        const newRoom=req.body;
	      console.log('user to be inserted',newRoom)
        const result=await roomCollection.insertOne(newRoom);
        res.send(result);
    })

app.get('/rooms',async(req,res)=>{
    const result=await roomCollection.find().toArray();
    res.json(result)
})






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port,()=>{
    console.log(`the port is serveing in the port ${port} `);


})
