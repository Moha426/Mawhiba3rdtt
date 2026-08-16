const express = require('express');
const app = express();
try {
  app.get("*", (req, res) => res.send("hello"));
} catch (e) {
  console.log("Error with *:", e.message);
}
try {
  app.get("/*", (req, res) => res.send("hello"));
} catch (e) {
  console.log("Error with /*:", e.message);
}
try {
  app.get("/(.*)", (req, res) => res.send("hello"));
} catch (e) {
  console.log("Error with /(.*):", e.message);
}
try {
  app.get("*all", (req, res) => res.send("hello"));
} catch (e) {
  console.log("Error with *all:", e.message);
}
