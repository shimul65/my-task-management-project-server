const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5053;

//middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('my-task management server is running')
})

app.listen(port , () => {
    console.log(`my-task management server is running on port ${port}`);
}) ;