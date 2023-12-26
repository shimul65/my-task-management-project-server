const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5053;

//middleware
app.use(cors({
    origin: [
        'https://my-task-management-674bf.surge.sh',
        'https://my-task-management-674bf.web.app',
        'https://my-task-management-674bf.firebase.com',
        'http://localhost:5173',
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n45ephu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const usersCollection = client.db('taskManagementDB').collection('users');
        const tasksCollection = client.db('taskManagementDB').collection('tasks');

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production" ? true : false,
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",

                }).send({ success: true });
        })

        // clear coolie when user logged out
        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === "production" ? true : false,
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true });
        })

        // token verify middleware
        const verifyToken = async (req, res, next) => {
            const token = req.cookies?.token;
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    console.log(err);
                    return res.status(403).send({ message: 'forbidden access...' })
                }
                // console.log('value in the token is :', decoded);
                req.user = decoded;
                next();
            })
        }

        // users related api
        app.get('/users', verifyToken, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })


        // tasks related api

        app.get('/tasks', verifyToken, async (req, res) => {
            const userEmail = req.query?.email;
            let query = {}
            if (userEmail) {
                query = {
                    email: userEmail
                }
            }
            const result = await tasksCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/tasks/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await tasksCollection.findOne(query);
            res.send(result);
        })

        
        app.patch('/tasks/:id', async (req, res) => {
            const updateTask = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const newTask = {
                $set: {
                    title: updateTask.title,
                    description: updateTask.description,
                    priority: updateTask.priority,
                    deadline: updateTask.deadline,
                    status: updateTask.status,
                }
            }
            const result = await tasksCollection.updateOne(query, newTask, options);
            res.send(result);
        })

        app.post('/tasks', verifyToken, async (req, res) => {
            const newTasks = {
                ...req.body,
                timestamp: new Date()
            };
            const result = await tasksCollection.insertOne(newTasks)
            res.send(result);
        })

        app.delete('/tasks/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tasksCollection.deleteOne(query);
            res.send(result);
        })






        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close(); 
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('my-task management server is running')
})

app.listen(port, () => {
    console.log(`my-task management server is running on port ${port}`);
});