const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = express();

// CONFIG
const PORT = 3000;
const SECRET = "swiftship_secret_key";

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// =======================
// 🟢 CONNECT MONGODB
// =======================
mongoose.connect("mongodb://127.0.0.1:27017/swiftship")
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// =======================
// 📦 MODEL
// =======================
const shipmentSchema = new mongoose.Schema({
  trackingId: String,

  sender: {
    name: String,
    phone: String,
    email: String,
    address: String
  },

  receiver: {
    name: String,
    phone: String,
    address: String
  },

  package: {
    item: String,
    weight: String,
    value: String
  },

  status: String,
  location: String,
  date: String,

  history: [
    {
      status: String,
      location: String,
      date: String
    }
  ]
});

const Shipment = mongoose.model("Shipment", shipmentSchema);

// =======================
// 🔐 AUTH
// =======================
function verifyToken(req, res, next){
  const authHeader = req.headers.authorization;

  if(!authHeader){
    return res.status(403).json({ message: "No token ❌" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if(err){
      return res.status(401).json({ message: "Invalid token ❌" });
    }

    req.user = decoded;
    next();
  });
}

// =======================
// 🔑 LOGIN
// =======================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if(username === "admin" && password === "1234"){
    const token = jwt.sign({ user: username }, SECRET, { expiresIn: "2h" });

    return res.json({ success: true, token });
  }

  res.status(401).json({ message: "Invalid credentials ❌" });
});

// =======================
// 📦 CREATE / UPDATE
// =======================
app.post("/shipment", verifyToken, async (req, res) => {

  const { id, data } = req.body;

  if(!id){
    return res.status(400).json({ message: "Tracking ID required" });
  }

  try{
    let shipment = await Shipment.findOne({ trackingId: id });

    if(!shipment){
      shipment = new Shipment({
        trackingId: id,
        sender: data.sender,
        receiver: data.receiver,
        package: data.package,
        history: []
      });
    }

    // update fields
    shipment.sender = data.sender;
    shipment.receiver = data.receiver;
    shipment.package = data.package;

    shipment.status = data.update.status;
    shipment.location = data.update.location;
    shipment.date = data.update.date;

    shipment.history.push(data.update);

    await shipment.save();
    console.log("Saved shipment:", shipment);

    res.json({ message: "Saved successfully ✅" });

  }catch(err){
    res.status(500).json({ message: "Server error ❌" });
  }
});

// =======================
// 📦 GET SINGLE (TRACK PAGE)
// =======================
app.get("/shipment/:id", async (req, res) => {

  try{
    const shipment = await Shipment.findOne({
      trackingId: req.params.id
    });

    if(shipment){
      res.json(shipment);
    }else{
      res.status(404).json({ message: "Not found ❌" });
    }

  }catch{
    res.status(500).json({ message: "Error ❌" });
  }
});

// =======================
// 📦 GET ALL (ADMIN)
// =======================
app.get("/shipments", verifyToken, async (req, res) => {

  try{
    const shipments = await Shipment.find();

    const result = {};
    shipments.forEach(s => {
      result[s.trackingId] = s;
    });

    res.json(result);

  }catch{
    res.status(500).json({ message: "Error ❌" });
  }
});

// =======================
// 🗑 DELETE
// =======================
app.delete("/shipment/:id", verifyToken, async (req, res) => {

  try{
    await Shipment.deleteOne({ trackingId: req.params.id });
    res.json({ message: "Deleted successfully ✅" });
  }catch{
    res.status(500).json({ message: "Error ❌" });
  }
});

// =======================
// 🚀 START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});