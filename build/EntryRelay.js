"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
// Types! :D
const app = express();
app.get('/', (req, res) => {
    console.log(req);
    res.send('Hello World!');
});
app.listen(3000, () => {
    console.log('App is listening on port 3000!');
});
